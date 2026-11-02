import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, signup } from './helpers.mjs';

const ok = (r, code = 200) => { assert.equal(r.status, code, JSON.stringify(r.data)); return r.data; };
const okAny = (r) => { assert.ok(r.status >= 200 && r.status < 300, `${r.status} ${JSON.stringify(r.data)}`); return r.data; };
const ip = (n) => ({ 'X-Forwarded-For': `10.8.0.${n}` });
const tomorrow = () => { let d = new Date(Date.now() + 864e5); while ([0].includes(d.getUTCDay())) d = new Date(d.getTime() + 864e5); return d.toISOString().slice(0, 10); };

async function clinic(api) {
  const me = await signup(api);
  const meta = ok(await api.get('/api/clinic/meta'));
  // The owner is also a doctor
  const pr = okAny(await api.post('/api/clinic/practitioners', { user_id: me.user.id, title: 'Dr', specialty: 'Médecine générale', department_id: meta.departments[0].id, consult_fee: 5000, tele_fee: 7000, room: 'Box 2', days: '0,1,2,3,4,5,6', start: '07:00', end: '20:00' }));
  const ins = okAny(await api.post('/api/clinic/insurers', { name: 'Zenith Assurances', coverage_pct: 80, ceiling: 0, contract_no: 'ZEN-2026-01' }));
  return { me, meta, pr, ins };
}

test('clinic journey: patient, queue, consultation, prescription checks, lab, billing split, pharmacy, ward, claim', async (t) => {
  const { api, close } = await startApp({ MODULES: 'clinic' });
  t.after(close);
  const { me, meta, pr, ins } = await clinic(api);
  assert.equal(me.main, 'clinic');
  assert.ok(meta.tariffs.length > 20 && meta.departments.length >= 5, 'departments and tariffs are created with the company');
  assert.ok(meta.icd.find((x) => x.code === 'B54'));
  const company = ok(await api.get('/api/company'));
  assert.equal(company.vat_enabled, 0, 'health services are VAT-exempt');

  // Patient with insurance and a penicillin allergy; duplicate refused
  const p = okAny(await api.post('/api/clinic/patients', { last_name: 'Mballa', first_name: 'Grâce', sex: 'F', birth_date: '1990-04-12', phone: '677 11 22 33', insurer_id: ins.id, insurance_no: 'Z-55120', allergies: 'Pénicilline', blood_group: 'O+' }));
  assert.equal(p.last_name, 'MBALLA'); assert.match(p.mrn, /^HS\d{2}-/);
  const dup = await api.post('/api/clinic/patients', { last_name: 'MBALLA', first_name: 'Grâce', birth_date: '1990-04-12' });
  assert.equal(dup.status, 409);

  // Walk-in: queue ticket and consultation fee split 80/20
  const v = okAny(await api.post('/api/clinic/checkin', { patient_id: p.id, practitioner_id: pr.id, complaint: 'Fièvre depuis 3 jours' }));
  assert.equal(v.ticket, 1);
  let acc = ok(await api.get(`/api/clinic/account/${p.id}`));
  assert.equal(acc.pending.length, 1);
  assert.equal(acc.pending[0].insurer_amount, 4000); assert.equal(acc.pending[0].patient_amount, 1000);
  const q = ok(await api.get('/api/clinic/queue'));
  assert.equal(q[0].id, v.id); assert.equal(q[0].unpaid, 1000);

  // Pay the patient's share at the desk: invoice validated in Compta, receipt
  const rc = okAny(await api.post('/api/clinic/collect', { patient_id: p.id, method: 'cash' }));
  assert.equal(rc.amount, 1000); assert.equal(rc.balance, 0);
  const inv = ok(await api.get(`/api/documents/${rc.allocations[0].document_id}`));
  assert.equal(inv.status, 'paid'); assert.equal(inv.vat_total, 0);

  // Call to the room, triage with vitals → NEWS2
  okAny(await api.post('/api/clinic/call', { visit_id: v.id }));
  const tri = ok(await api.put(`/api/clinic/visits/${v.id}`, { status: 'in_consult', vitals: { bp_sys: 118, bp_dia: 76, pulse: 104, temp: 38.9, resp: 22, spo2: 96, weight: 64, height: 165 } }));
  assert.equal(tri.news, 4); assert.equal(tri.vitals.bmi, 23.5);
  const disp = ok(await api.get('/api/clinic/display'));
  assert.equal(disp.calls[0].ticket, 1);

  // Prescription: amoxicillin is refused (allergy), override is possible; interaction detected
  const drugs = ok(await api.get('/api/clinic/drugs'));
  const D = (n) => drugs.find((d) => d.name.startsWith(n));
  const check = ok(await api.post('/api/clinic/rx/check', { patient_id: p.id, lines: [{ drug_id: D('Amoxicilline 500').id }, { drug_id: D('Warfarine').id }, { drug_id: D('Ibuprofène').id }] }));
  assert.ok(check.some((a) => a.level === 'allergy'));
  assert.ok(check.some((a) => a.level === 'major' && /hémorragique/.test(a.fr)));
  const refused = await api.post('/api/clinic/prescriptions', { visit_id: v.id, lines: [{ drug_id: D('Amoxicilline 500').id, qty: 21 }] });
  assert.equal(refused.status, 409);

  // Lab: malaria smear ordered and charged
  const ge = meta.tariffs.find((x) => x.code === 'GE'); const nfs = meta.tariffs.find((x) => x.code === 'NFS');
  const orders = okAny(await api.post('/api/clinic/orders', { visit_id: v.id, tariff_ids: [ge.id, nfs.id], priority: 'urgent' }));
  assert.equal(orders.length, 2);
  okAny(await api.post(`/api/clinic/orders/${orders[0].id}/sample`));
  const res = okAny(await api.post(`/api/clinic/orders/${orders[0].id}/results`, { values: { result: 'Positive', density: 12000, species: 'P. falciparum' }, validate: true }));
  assert.equal(res.status, 'validated'); assert.equal(res.abnormal, 1);
  const crit = okAny(await api.post(`/api/clinic/orders/${orders[1].id}/results`, { values: { hb: 6.2, gb: 7, plq: 180 }, validate: true }));
  assert.equal(crit.critical, 1, 'Hb 6.2 is a critical value');
  const alerts = ok(await api.get('/api/alerts'));
  assert.ok(alerts.items.some((a) => a.kind === 'clinic_critical'));

  // Treatment, diagnosis, closing
  const rx = okAny(await api.post('/api/clinic/prescriptions', { visit_id: v.id, lines: [{ drug_id: D('Artéméther').id, dose: '4 cp', frequency: '2 fois par jour', duration: '3 jours', qty: 1 }, { drug_id: D('Paracétamol 500').id, dose: '1 g', frequency: '3 fois par jour', duration: '3 jours', qty: 18 }, { drug_id: D('Fer').id, qty: 30 }] }));
  assert.match(rx.code, /^[0-9A-F]{10}$/);
  const noDiag = await api.post(`/api/clinic/visits/${v.id}/close`, {});
  assert.equal(noDiag.status, 400);
  ok(await api.put(`/api/clinic/visits/${v.id}`, { diagnosis: 'Paludisme simple, anémie sévère', icd: ['B50.9', 'D50'], plan: 'ACT 3 jours, contrôle NFS J7' }));
  const closed = ok(await api.post(`/api/clinic/visits/${v.id}/close`, {}));
  assert.equal(closed.status, 'done'); assert.ok(closed.signed_at);

  // Pharmacy: no stock yet → refused; receive a lot (supplier bill), then dispense FEFO
  const noStock = await api.post(`/api/clinic/pharmacy/dispense/${rx.id}`, {});
  assert.equal(noStock.status, 409);
  const rec = okAny(await api.post('/api/clinic/pharmacy/receive', { supplier: 'CENAME', reference: 'BL-889', lines: [
    { drug_id: D('Artéméther').id, qty: 50, cost: 1100, lot: 'AL24', expiry: '2028-06-30' },
    { drug_id: D('Paracétamol 500').id, qty: 500, cost: 10, lot: 'P1', expiry: '2027-01-31' }, { drug_id: D('Paracétamol 500').id, qty: 500, cost: 11, lot: 'P2', expiry: '2029-01-31' },
    { drug_id: D('Fer').id, qty: 200, cost: 10, lot: 'F1', expiry: '2028-01-01' }] }));
  assert.ok(rec.bill?.number?.startsWith('ACH'));
  const disp2 = okAny(await api.post(`/api/clinic/pharmacy/dispense/${rx.id}`, {}));
  assert.equal(disp2.status, 'dispensed');
  const para = ok(await api.get(`/api/clinic/drugs/${D('Paracétamol 500').id}`));
  assert.equal(para.stock, 982);
  assert.equal(para.lots.find((l) => l.lot === 'P1').qty, 482, 'first expiring lot is used first');

  // The patient owes 20 % of labs and drugs; pay by MTN MoMo (simulation)
  acc = ok(await api.get(`/api/clinic/account/${p.id}`));
  const expected = acc.pending.reduce((s, c) => s + c.patient_amount, 0);
  assert.equal(acc.pending_insurer + expected, acc.pending.reduce((s, c) => s + c.amount, 0));
  const mm = okAny(await api.post('/api/clinic/momo', { patient_id: p.id, phone: '677112233' }));
  assert.equal(mm.amount, expected);

  // Certificate and verification pages
  const cert = okAny(await api.post('/api/clinic/certificates', { visit_id: v.id, kind: 'rest', rest_days: 3 }));
  const vc = ok(await api.get(`/api/public/clinic/verify/cert/${cert.code}`, ip(1)));
  assert.equal(vc.valid, true); assert.equal(vc.days, 3); assert.ok(!JSON.stringify(vc).includes('Paludisme'), 'no medical data on the verification page');
  const vr = ok(await api.get(`/api/public/clinic/verify/rx/${rx.code}`));
  assert.equal(vr.valid, true); assert.equal(vr.lines.length, 3);
  const printed = await api.get(`/api/clinic/prescriptions/${rx.id}/print`);
  assert.ok(String(printed.data).includes(rx.code));

  // Ward: admit, nursing round with high NEWS2 → alert, discharge charges the nights
  const beds = ok(await api.get('/api/clinic/beds'));
  const bed = beds.find((b) => b.kind === 'private');
  const adm = okAny(await api.post('/api/clinic/admissions', { patient_id: p.id, bed_id: bed.id, reason: 'Anémie sévère, transfusion' }));
  okAny(await api.post(`/api/clinic/admissions/${adm.id}/care`, { kind: 'vitals', vitals: { resp: 26, spo2: 90, bp_sys: 88, pulse: 128, temp: 39.4 } }));
  assert.ok(ok(await api.get('/api/alerts')).items.some((a) => a.kind === 'clinic_news_ward'));
  okAny(await api.post(`/api/clinic/admissions/${adm.id}/care`, { kind: 'med', label: 'Artésunate IV 2,4 mg/kg', planned_at: new Date(Date.now() + 3600e3).toISOString(), every_hours: 12, days: 2 }));
  let ad = ok(await api.get(`/api/clinic/admissions/${adm.id}`));
  assert.equal(ad.care.filter((c) => c.status === 'planned').length, 4);
  ad = okAny(await api.post(`/api/clinic/admissions/${adm.id}/discharge`, { outcome: 'improved', summary: 'Transfusion 1 CGR, ACT, apyrexie à J2.' }));
  assert.equal(ad.status, 'discharged');
  const bedCharge = ad.charges.find((c) => c.source === 'bed');
  assert.equal(bedCharge.unit_price, bed.daily_rate);
  assert.equal(ok(await api.get('/api/clinic/beds')).find((b) => b.id === bed.id).status, 'cleaning');

  // Insurer claim: one invoice to the insurer for 80 % of everything
  const claimable = ok(await api.get(`/api/clinic/claimable?insurer_id=${ins.id}&from=2020-01-01`));
  assert.ok(claimable.total > 0);
  const claim = okAny(await api.post('/api/clinic/claims', { insurer_id: ins.id, from: '2020-01-01' }));
  assert.equal(claim.total, claimable.total); assert.equal(claim.patients, 1);
  const cdoc = ok(await api.get(`/api/documents/${claim.document_ids[0]}`));
  assert.equal(cdoc.total, claim.total);
  const again = await api.post('/api/clinic/claims', { insurer_id: ins.id, from: '2020-01-01' });
  assert.equal(again.status, 409, 'lines are claimed only once');

  // Surveillance counts the malaria case; FHIR export
  const sv = ok(await api.get('/api/clinic/surveillance'));
  assert.ok(sv.diseases.some((d) => d.code === 'B50.9' && d.total === 1));
  assert.ok(sv.malaria.at(-1).positive >= 1);
  const fhir = await api.get(`/api/clinic/patients/${p.id}/fhir`);
  const bundle = fhir.data;
  assert.match(fhir.headers.get('content-type'), /fhir\+json/);
  assert.equal(bundle.resourceType, 'Bundle');
  assert.ok(bundle.entry.some((e) => e.resource.resourceType === 'Condition' && e.resource.code.coding[0].code === 'B50.9'));
  const dash = ok(await api.get('/api/clinic/dashboard'));
  assert.ok(dash.visits.total >= 1 && dash.money.month > 0);
});

test('clinic online booking, teleconsultation paid from the portal, roles and medical secrecy', async (t) => {
  const { api, base, close } = await startApp({ MODULES: 'clinic' });
  t.after(close);
  const { pr } = await clinic(api);
  const info = ok(await api.get('/api/public/clinic'));
  assert.equal(info.practitioners.length, 1);
  const date = tomorrow();
  const days = ok(await api.get(`/api/public/clinic/slots?practitioner_id=${pr.id}&date=${date}`));
  const slot = days[0].slots[2];
  assert.ok(slot);
  const b = okAny(await api.post('/api/public/clinic/book', { practitioner_id: pr.id, date, time: slot, mode: 'tele', last_name: 'Fotso', first_name: 'Brice', sex: 'M', birth_date: '1985-02-01', phone: '699887766', reason: 'Toux' }, ip(2)));
  assert.ok(b.new_patient && b.portal_url);
  const taken = await api.post('/api/public/clinic/book', { practitioner_id: pr.id, date, time: slot, last_name: 'Ngono', first_name: 'Ada', birth_date: '1999-01-01', phone: '677000001' }, ip(3));
  assert.equal(taken.status, 409, 'a slot cannot be booked twice');
  const ap = ok(await api.get(`/api/public/clinic/appt/${b.code}`));
  assert.equal(ap.appointment.mode, 'tele'); assert.match(ap.appointment.tele_url, /^https:\/\/meet\.jit\.si\/Teknons-/);
  assert.equal(ap.appointment.due, 7000);
  const pay = okAny(await api.post(`/api/public/clinic/appt/${b.code}/momo`, { phone: '699887766' }, ip(4)));
  const st = ok(await api.get(`/api/public/clinic/appt/${b.code}/momo/${pay.payment_id}`));
  assert.ok(['completed', 'pending'].includes(st.status));
  // A second video booking bills only its own fee, not the patient's other pending charges
  const telePid = ok(await api.get(`/api/clinic/patients?q=Fotso`))[0].id;
  okAny(await api.post('/api/clinic/charges', { patient_id: telePid, description: 'Pansement', unit_price: 2500 }));
  const a2 = okAny(await api.post('/api/clinic/appointments', { patient_id: telePid, practitioner_id: pr.id, date, time: days[0].slots[4], mode: 'tele' }));
  assert.equal(ok(await api.get(`/api/public/clinic/appt/${a2.code}`)).appointment.due, 7000);

  // Portal
  const tok = b.portal_url.split('/s/')[1];
  const portal = ok(await api.get(`/api/public/clinic/s/${tok}`, ip(5)));
  assert.equal(portal.patient.last_name, 'FOTSO');
  assert.equal(portal.appointments.length, 2);
  okAny(await api.post(`/api/public/clinic/s/${tok}/message`, { body: 'Bonjour docteur, je tousse toujours.' }, ip(6)));
  const inbox = ok(await api.get('/api/clinic/inbox'));
  assert.equal(inbox[0].unread, 1);
  const page = await fetch(`${base}/s/${tok}`);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex');

  // A cashier sees the administrative file only (medical secrecy)
  const pid = ok(await api.get('/api/clinic/patients?q=FOTSO'))[0].id;
  ok(await api.put(`/api/clinic/patients/${pid}`, { allergies: 'Sulfamides', chronic: 'Asthme' }));
  okAny(await api.post('/api/users', { name: 'Caisse', email: 'caisse@test.cm', password: 'motdepasse1', role: 'reception' }));
  const owner = api.getCookie();
  okAny(await api.post('/api/auth/login', { email: 'caisse@test.cm', password: 'motdepasse1' }));
  const file = ok(await api.get(`/api/clinic/patients/${pid}`));
  assert.equal(file.allergies, undefined); assert.equal(file.chronic, undefined); assert.equal(file.timeline, undefined);
  assert.ok(file.account, 'the cashier sees the account');
  const visits = await api.get('/api/clinic/visits');
  assert.equal(visits.status, 403);
  const rx = await api.post('/api/clinic/prescriptions', { patient_id: pid, lines: [{ name: 'Paracétamol' }] });
  assert.equal(rx.status, 403);
  api.setCookie(owner);

  // Waiting-room screen through its private token
  const meta = ok(await api.get('/api/clinic/meta'));
  const tokq = meta.display_url.split('/queue/')[1];
  ok(await api.get(`/api/public/clinic/queue/${tokq}`));
  assert.equal((await api.get('/api/public/clinic/queue/wrongtoken')).status, 404);
});
