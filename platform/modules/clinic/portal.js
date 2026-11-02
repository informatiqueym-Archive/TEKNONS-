// Public pages of Teknons Santé (no staff account):
//   /s/:token        patient portal: appointments (book, cancel, join a teleconsultation),
//                    prescriptions, validated results, vaccinations, bills paid by MTN MoMo /
//                    Orange Money, receipts, secure messages, digital health card
//   /rdv             online booking (in person or teleconsultation), new or known patient
//   /rdv/:code       one appointment: details, payment of a teleconsultation, video link, cancel
//   /v/rx/:code, /v/cert/:code, /v/lab/:code   authenticity checks for pharmacies, employers, insurers
//   /queue/:token    waiting-room screen (TV): tickets called and rooms
//   /c/:code         QR of the health card: opens the patient file in the staff app
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notFound, HttpError, bad, conflict } from '../../core/errors.js';
import { str, date as vDate } from '../../core/validate.js';
import { now, today } from '../../core/schema.js';
import { raiseAlert } from '../../core/alerts.js';
import { normalizePhone, guessProvider } from '../../core/payments/mobile-money.js';
import { checkPending } from '../accounting/treasury.js';
import { baseUrl } from '../accounting/paylink.js';
import { settingsOf, nameOf, ageOf } from './schema.js';
import * as P from './patients.js';
import * as C from './care.js';
import * as B from './billing.js';
import * as PR from './print.js';

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public');
const page = () => fs.readFileSync(path.join(pub, 'sante.html'), 'utf8');

const hits = new Map();
function throttle(ctx, key, max = 40, windowMs = 60e3) {
  const ip = String(ctx.req.headers['x-forwarded-for'] || ctx.req.socket.remoteAddress || '').split(',')[0].trim();
  const k = `${ip}|${key}`; const t = Date.now(); const h = hits.get(k);
  if (hits.size > 5000) hits.clear();
  if (!h || t - h.at > windowMs) { hits.set(k, { at: t, n: 1 }); return; }
  if (++h.n > max) throw new HttpError(429, 'rate', 'Trop de demandes, patientez une minute');
}
const clinicCompany = (db, id) => {
  const c = id ? db.get('SELECT c.* FROM companies c JOIN clinic_settings s ON s.company_id = c.id WHERE c.id = ?', id) : db.get('SELECT c.* FROM companies c JOIN clinic_settings s ON s.company_id = c.id ORDER BY c.id LIMIT 1');
  if (!c) throw notFound('Établissement introuvable');
  return c;
};
const guest = (companyId, name = 'Portail patient') => ({ user: { id: null, company_id: companyId, name, role: 'owner' } });
const initials = (p) => `${(p.first_name || '').split(' ')[0]} ${(p.last_name || '')[0] || ''}.`.trim();
const teleUrl = (s, a) => (a.mode === 'tele' && a.tele_room ? `${s.tele_base.replace(/\/?$/, '/')}${a.tele_room}` : null);

export function registerPortal(r, { db, bus, momo, env }) {
  const pages = ['/s/:token', '/rdv', '/rdv/:code', '/v/rx/:code', '/v/cert/:code', '/v/lab/:code', '/queue/:token'];
  for (const p of pages) r.get(p, (ctx) => ctx.send(page(), 'text/html; charset=utf-8', 200, { 'X-Robots-Tag': p === '/rdv' ? 'all' : 'noindex', 'Referrer-Policy': 'no-referrer' }));
  r.get('/c/:code', (ctx) => ctx.send('', 'text/html', 302, { Location: `/#/clinic/patients?card=${encodeURIComponent(str(ctx.params.code, 20))}` }));

  const byToken = (tok) => {
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(tok || '')) throw notFound('Lien invalide');
    const p = db.get('SELECT * FROM clinic_patients WHERE portal_token = ?', tok);
    if (!p) throw notFound("Lien introuvable. Demandez un nouveau lien à l'accueil.");
    return { p, company: db.get('SELECT * FROM companies WHERE id = ?', p.company_id) };
  };
  const apptView = (s, a) => ({ id: a.id, code: a.code, date: a.date, time: a.time, mode: a.mode, status: a.status, reason: a.reason, practitioner: a.practitioner_name ? `${a.title || 'Dr'} ${a.practitioner_name}` : '', department: a.department_name, room: a.room,
    tele_url: ['booked', 'confirmed', 'arrived'].includes(a.status) ? teleUrl(s, a) : null, document_id: a.document_id,
    paid: a.document_id ? db.get('SELECT status FROM documents WHERE id = ?', a.document_id)?.status === 'paid' : null,
    due: a.document_id ? db.get('SELECT total - paid - credited b FROM documents WHERE id = ?', a.document_id)?.b : 0 });

  // ---------------- Clinic info and booking ----------------
  r.get('/api/public/clinic', (ctx) => {
    const c = clinicCompany(db, ctx.query.c); const s = settingsOf(db, c.id);
    return { id: c.id, name: c.name, logo: c.logo, city: c.city, address: c.address, phone: c.phone, email: c.email, welcome: s.welcome_text, emergency_phone: s.emergency_phone, booking_open: !!s.booking_open, tele: !!s.tele_enabled, slot: s.slot_minutes,
      departments: db.all("SELECT id, name, name_en, color FROM clinic_departments WHERE company_id = ? AND active = 1 AND kind IN ('consult','emergency','surgery') ORDER BY position", c.id),
      practitioners: P.practitioners(db, c.id).filter((p) => p.online).map((p) => ({ id: p.id, name: `${p.title || 'Dr'} ${p.name}`, specialty: p.specialty, department_id: p.department_id, department: p.department_name, color: p.color, fee: p.consult_fee, tele_fee: p.tele_fee, tele: !!p.tele && !!s.tele_enabled, days: p.days, bio: p.bio })),
      momo: { demo: momo.mode === 'simulation', mtn_momo: momo.configured('mtn_momo'), orange_money: momo.configured('orange_money') } };
  });
  r.get('/api/public/clinic/slots', (ctx) => {
    throttle(ctx, 'slots', 120);
    const c = clinicCompany(db, ctx.query.c);
    const pr = Number(ctx.query.practitioner_id);
    const start = ctx.query.date ? vDate(ctx.query.date, 'date') : today();
    const days = [];
    for (let i = 0; i < 14; i++) { const d = new Date(Date.parse(start) + i * 864e5).toISOString().slice(0, 10); days.push({ date: d, slots: P.freeSlots(db, c.id, pr, d) }); }
    return days;
  });
  r.post('/api/public/clinic/book', (ctx) => {
    throttle(ctx, 'book', 6, 10 * 60e3);
    const c = clinicCompany(db, ctx.body.c); const s = settingsOf(db, c.id);
    if (!s.booking_open) throw conflict('closed', 'La prise de rendez-vous en ligne est fermée : appelez l\'accueil');
    const b = ctx.body;
    const phone = normalizePhone(b.phone); if (!/^6\d{8}$/.test(phone.replace(/^237/, ''))) throw bad('phone', 'Numéro de téléphone camerounais invalide');
    const last = str(b.last_name, 80).toUpperCase(), first = str(b.first_name, 80);
    if (!last || !first) throw bad('name', 'Nom et prénom obligatoires');
    const birth = b.birth_date ? vDate(b.birth_date, 'birth_date') : '';
    if (!birth) throw bad('birth_date', 'Date de naissance obligatoire');
    // A known patient is recognised by phone + birth date + name; otherwise a new file is opened.
    let p = db.get('SELECT * FROM clinic_patients WHERE company_id = ? AND phone = ? AND birth_date = ? AND last_name = ?', c.id, phone, birth, last);
    let created = false;
    return db.tx(() => {
      if (!p) { p = P.createPatient(db, guest(c.id, 'Rendez-vous en ligne'), c.id, { last_name: last, first_name: first, sex: b.sex, birth_date: birth, phone, email: b.email, force: true }); created = true; }
      const a = P.book(db, guest(c.id, 'Rendez-vous en ligne'), c.id, { patient_id: p.id, practitioner_id: b.practitioner_id, date: b.date, time: b.time, mode: b.mode, reason: b.reason }, { source: 'online', checkSlot: true });
      raiseAlert(db, bus, c.id, { kind: 'clinic_booking', level: 'info', title: `Nouveau rendez-vous en ligne${a.mode === 'tele' ? ' (téléconsultation)' : ''}`, body: `${nameOf(p)} · ${a.date.split('-').reverse().join('/')} à ${a.time} · ${a.title || 'Dr'} ${a.practitioner_name}`, entity: 'clinic_appointment', entity_id: a.id });
      bus.emit(c.id, 'change', { entity: 'clinic_appointment', id: a.id });
      return ctx.json({ code: a.code, url: `${baseUrl(ctx, env)}/rdv/${a.code}`, portal_url: created ? `${baseUrl(ctx, env)}/s/${db.get('SELECT portal_token FROM clinic_patients WHERE id = ?', p.id).portal_token}` : null, new_patient: created }, 201);
    });
  });

  // One appointment, by its code (what the patient receives after booking)
  const byCode = (code) => {
    const a = db.get('SELECT * FROM clinic_appointments WHERE code = ?', str(code, 20).toUpperCase()); if (!a) throw notFound('Rendez-vous introuvable');
    return { a: P.appointments(db, a.company_id, { patient_id: a.patient_id }).find((x) => x.id === a.id), company: db.get('SELECT * FROM companies WHERE id = ?', a.company_id) };
  };
  r.get('/api/public/clinic/appt/:code', (ctx) => {
    throttle(ctx, 'appt', 60);
    const { a, company } = byCode(ctx.params.code); const s = settingsOf(db, company.id);
    return { clinic: { name: company.name, logo: company.logo, phone: company.phone, address: company.address, city: company.city, momo: { demo: momo.mode === 'simulation', mtn_momo: momo.configured('mtn_momo'), orange_money: momo.configured('orange_money') } },
      patient: { name: initials(a), phone: a.phone ? a.phone.replace(/^(\d{3})\d{4}/, '$1••••') : '' }, appointment: apptView(s, a) };
  });
  r.post('/api/public/clinic/appt/:code/cancel', (ctx) => {
    throttle(ctx, 'cancel', 10);
    const { a, company } = byCode(ctx.params.code);
    if (a.date < today()) throw conflict('past', 'Rendez-vous passé');
    if (a.document_id && db.get('SELECT paid FROM documents WHERE id = ?', a.document_id)?.paid > 0) throw conflict('paid', 'Téléconsultation déjà payée : appelez l\'accueil pour la déplacer');
    P.setAppointmentStatus(db, guest(company.id), company.id, a.id, 'cancelled');
    if (a.document_id) B.creditUnpaid(db, guest(company.id), company, a.document_id);
    bus.emit(company.id, 'change', { entity: 'clinic_appointment', id: a.id });
    return { ok: true };
  });
  r.post('/api/public/clinic/appt/:code/momo', async (ctx) => {
    throttle(ctx, 'apay:' + ctx.params.code, 6, 30 * 60e3);
    const { a, company } = byCode(ctx.params.code);
    if (!a.document_id) throw conflict('nothing_due', 'Rien à payer pour ce rendez-vous');
    const phone = normalizePhone(ctx.body.phone);
    const r2 = await B.momoForPatient(db, momo, guest(company.id), company, a.patient_id, { provider: ctx.body.provider || guessProvider(phone), phone, document_id: a.document_id, replaceStale: true });
    bus.emit(company.id, 'change', { entity: 'payment', id: r2.payment_id });
    return ctx.json(r2, 201);
  });
  r.get('/api/public/clinic/appt/:code/momo/:id', async (ctx) => {
    throttle(ctx, 'ast:' + ctx.params.code, 60);
    const { a } = byCode(ctx.params.code);
    const p = db.get('SELECT * FROM payments WHERE id = ? AND document_id = ?', ctx.params.id, a.document_id ?? -1); if (!p) throw notFound();
    if (p.status === 'pending') { try { await checkPending(db, bus, momo, { paymentId: p.id }); } catch { /* retry */ } }
    return db.get('SELECT status, failure_reason, amount, reference FROM payments WHERE id = ?', p.id);
  });

  // ---------------- Patient portal ----------------
  r.get('/api/public/clinic/s/:token', (ctx) => {
    throttle(ctx, 's:' + ctx.params.token, 60);
    const { p, company } = byToken(ctx.params.token); const s = settingsOf(db, company.id); const cid = company.id;
    const ins = p.insurer_id ? db.get('SELECT name, coverage_pct FROM clinic_insurers WHERE id = ?', p.insurer_id) : null;
    const appts = P.appointments(db, cid, { patient_id: p.id }).reverse();
    const acc = B.account(db, cid, p.id);
    const results = C.ordersOf(db, cid, { patient_id: p.id, status: 'validated', limit: 40 }).map((o) => ({ id: o.id, number: o.number, code: o.code, kind: o.kind, name: o.test_name, at: o.validated_at, abnormal: !!o.abnormal, critical: !!o.critical, results: o.results.filter((x) => x.value !== ''), conclusion: o.conclusion }));
    const vit = C.vitalsTrend(db, p.id);
    db.run("UPDATE clinic_messages SET read = 1 WHERE patient_id = ? AND direction = 'out'", p.id);
    return {
      clinic: { name: company.name, logo: company.logo, phone: company.phone, city: company.city, address: company.address, emergency_phone: s.emergency_phone, tele: !!s.tele_enabled, pay: !!s.portal_pay,
        momo: { demo: momo.mode === 'simulation', mtn_momo: momo.configured('mtn_momo'), orange_money: momo.configured('orange_money') } },
      patient: { name: nameOf(p), first_name: p.first_name, last_name: p.last_name, mrn: p.mrn, sex: p.sex, birth_date: p.birth_date, age: ageOf(p.birth_date), phone: p.phone, blood_group: p.blood_group, allergies: p.allergies, chronic: p.chronic,
        insurer: ins ? `${ins.name} (${p.coverage_pct ?? ins.coverage_pct} %)` : null, insurance_no: p.insurance_no, card_code: p.card_code, emergency_name: p.emergency_name, emergency_phone: p.emergency_phone },
      appointments: appts.map((a) => apptView(s, a)),
      prescriptions: C.prescriptionsOf(db, cid, { patient_id: p.id, limit: 30 }).filter((r) => r.status !== 'cancelled').map((r) => ({ id: r.id, code: r.code, at: r.created_at, practitioner: r.practitioner_name ? `${r.title || 'Dr'} ${r.practitioner_name}` : '', status: r.status, notes: r.notes,
        lines: r.lines.map((l) => ({ name: l.name, dose: l.dose, frequency: l.frequency, duration: l.duration, instructions: l.instructions, qty: l.qty })) })),
      results, vaccines: db.all('SELECT vaccine, dose, date, lot, next_due FROM clinic_vaccines WHERE patient_id = ? ORDER BY date DESC', p.id),
      visits: db.all("SELECT v.arrived_at, v.kind, v.diagnosis, v.follow_up, u.name practitioner FROM clinic_visits v LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id WHERE v.patient_id = ? AND v.status = 'done' ORDER BY v.arrived_at DESC LIMIT 20", p.id),
      vitals: vit.slice(-12).map((v) => ({ at: v.at, bp_sys: v.bp_sys, bp_dia: v.bp_dia, weight: v.weight, glucose: v.glucose, temp: v.temp, pulse: v.pulse })),
      account: { due: acc.due, pending: acc.pending_patient, invoices: acc.invoices.map((d) => ({ id: d.id, number: d.number, date: d.date, total: d.total, balance: d.balance, status: d.status })), receipts: acc.receipts, insurer_year: acc.insurer_year },
      messages: C.messages(db, cid, p.id).map((m) => ({ direction: m.direction, body: m.body, at: m.created_at, by: m.direction === 'out' ? m.user_name : null })),
      practitioners: P.practitioners(db, cid).filter((x) => x.online).map((x) => ({ id: x.id, name: `${x.title || 'Dr'} ${x.name}`, specialty: x.specialty, fee: x.consult_fee, tele_fee: x.tele_fee, tele: !!x.tele && !!s.tele_enabled, color: x.color })),
    };
  });
  r.post('/api/public/clinic/s/:token/book', (ctx) => {
    throttle(ctx, 'sb:' + ctx.params.token, 8, 10 * 60e3);
    const { p, company } = byToken(ctx.params.token);
    if (!settingsOf(db, company.id).booking_open) throw conflict('closed', 'Prise de rendez-vous en ligne fermée');
    const a = P.book(db, guest(company.id), company.id, { patient_id: p.id, practitioner_id: ctx.body.practitioner_id, date: ctx.body.date, time: ctx.body.time, mode: ctx.body.mode, reason: ctx.body.reason }, { source: 'portal', checkSlot: true });
    raiseAlert(db, bus, company.id, { kind: 'clinic_booking', level: 'info', title: `Rendez-vous pris depuis le portail${a.mode === 'tele' ? ' (téléconsultation)' : ''}`, body: `${nameOf(p)} · ${a.date.split('-').reverse().join('/')} à ${a.time}`, entity: 'clinic_appointment', entity_id: a.id });
    bus.emit(company.id, 'change', { entity: 'clinic_appointment', id: a.id });
    return ctx.json(apptView(settingsOf(db, company.id), a), 201);
  });
  r.post('/api/public/clinic/s/:token/appt/:id/cancel', (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    const a = db.get('SELECT * FROM clinic_appointments WHERE id = ? AND patient_id = ?', ctx.params.id, p.id); if (!a) throw notFound();
    if (a.document_id && db.get('SELECT paid FROM documents WHERE id = ?', a.document_id)?.paid > 0) throw conflict('paid', 'Téléconsultation déjà payée : appelez l\'accueil pour la déplacer');
    P.setAppointmentStatus(db, guest(company.id), company.id, a.id, 'cancelled');
    if (a.document_id) B.creditUnpaid(db, guest(company.id), company, a.document_id);
    bus.emit(company.id, 'change', { entity: 'clinic_appointment', id: a.id });
    return { ok: true };
  });
  r.post('/api/public/clinic/s/:token/message', (ctx) => {
    throttle(ctx, 'sm:' + ctx.params.token, 10, 10 * 60e3);
    const { p, company } = byToken(ctx.params.token);
    const body = str(ctx.body.body, 2000); if (!body) throw bad('body', 'Message vide');
    db.run("INSERT INTO clinic_messages (company_id, patient_id, direction, body, created_at) VALUES (?,?, 'in', ?, ?)", company.id, p.id, body, now());
    raiseAlert(db, bus, company.id, { kind: 'clinic_message', level: 'info', title: `Message de ${nameOf(p)}`, body: body.slice(0, 160), entity: 'clinic_patient', entity_id: p.id });
    bus.emit(company.id, 'change', { entity: 'clinic_message', id: p.id });
    return ctx.json({ ok: true }, 201);
  });
  r.post('/api/public/clinic/s/:token/momo', async (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    if (!settingsOf(db, company.id).portal_pay) throw conflict('off', 'Le paiement en ligne est désactivé : payez à la caisse');
    throttle(ctx, 'pay:' + ctx.params.token, 6, 30 * 60e3);
    const phone = normalizePhone(ctx.body.phone);
    const r2 = await B.momoForPatient(db, momo, guest(company.id), company, p.id, { provider: ctx.body.provider || guessProvider(phone), phone, amount: ctx.body.amount, document_id: ctx.body.document_id, replaceStale: true });
    bus.emit(company.id, 'change', { entity: 'payment', id: r2.payment_id });
    return ctx.json(r2, 201);
  });
  r.get('/api/public/clinic/s/:token/momo/:id', async (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    throttle(ctx, 'st:' + ctx.params.token, 40);
    const pay = db.get('SELECT * FROM payments WHERE id = ? AND partner_id = ?', ctx.params.id, p.partner_id ?? -1); if (!pay) throw notFound();
    if (pay.status === 'pending') { try { await checkPending(db, bus, momo, { paymentId: pay.id }); } catch { /* retry */ } }
    return { ...db.get('SELECT status, failure_reason, amount, reference FROM payments WHERE id = ?', pay.id), due: B.account(db, company.id, p.id).due };
  });
  r.get('/s/:token/rx/:id', (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    const rx = C.prescriptionsOf(db, company.id, { id: Number(ctx.params.id) })[0]; if (!rx || rx.patient_id !== p.id) throw notFound();
    ctx.send(PR.renderPrescription(company, settingsOf(db, company.id), rx, baseUrl(ctx, env)));
  });
  r.get('/s/:token/lab/:id', (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    const o = C.ordersOf(db, company.id, { id: Number(ctx.params.id) })[0]; if (!o || o.patient_id !== p.id || o.status !== 'validated') throw notFound();
    ctx.send(PR.renderLabReport(company, settingsOf(db, company.id), o, baseUrl(ctx, env)));
  });
  r.get('/s/:token/receipt/:id', (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    const rc = db.get('SELECT * FROM clinic_receipts WHERE id = ? AND patient_id = ?', ctx.params.id, p.id); if (!rc) throw notFound();
    ctx.send(PR.renderReceipt(company, settingsOf(db, company.id), rc, P.getPatient(db, company.id, p.id), B.account(db, company.id, p.id)));
  });
  r.get('/s/:token/card', (ctx) => {
    const { p, company } = byToken(ctx.params.token);
    ctx.send(PR.renderCards(company, settingsOf(db, company.id), [P.getPatient(db, company.id, p.id)], baseUrl(ctx, env)));
  });

  // ---------------- Verification ----------------
  const clinicOf = (id) => { const c = db.get('SELECT name, city, phone, logo FROM companies WHERE id = ?', id); return { name: c.name, city: c.city, phone: c.phone, logo: c.logo }; };
  r.get('/api/public/clinic/verify/rx/:code', (ctx) => {
    throttle(ctx, 'vrx', 30);
    const rx = db.get('SELECT * FROM clinic_prescriptions WHERE code = ?', str(ctx.params.code, 20).toUpperCase()); if (!rx) return { valid: false };
    const full = C.prescriptionsOf(db, rx.company_id, { id: rx.id })[0];
    return { valid: rx.status !== 'cancelled', status: rx.status, clinic: clinicOf(rx.company_id), date: rx.created_at, practitioner: full.practitioner_name ? `${full.title || 'Dr'} ${full.practitioner_name}` : '', order_no: full.order_no,
      patient: `${initials(full)} · ${full.birth_date ? 'né(e) en ' + full.birth_date.slice(0, 4) : ''}`, lines: full.lines.map((l) => ({ name: l.name, qty: l.qty, dispensed: l.dispensed })) };
  });
  r.get('/api/public/clinic/verify/cert/:code', (ctx) => {
    throttle(ctx, 'vce', 30);
    const x = C.certificateFull(db, 'code', str(ctx.params.code, 20).toUpperCase()); if (!x) return { valid: false };
    return { valid: true, kind: x.kind, clinic: clinicOf(x.company_id), date: x.created_at, from: x.from_date, days: x.rest_days, practitioner: x.practitioner_name ? `${x.title || 'Dr'} ${x.practitioner_name}` : '', patient: `${x.last_name} ${(x.first_name || '')[0] || ''}.` };
  });
  r.get('/api/public/clinic/verify/lab/:code', (ctx) => {
    throttle(ctx, 'vlb', 30);
    const o = db.get('SELECT o.*, t.name test_name, p.last_name, p.first_name FROM clinic_orders o JOIN clinic_tariffs t ON t.id = o.tariff_id JOIN clinic_patients p ON p.id = o.patient_id WHERE o.code = ?', str(ctx.params.code, 20).toUpperCase());
    if (!o || o.status !== 'validated') return { valid: false };
    return { valid: true, clinic: clinicOf(o.company_id), test: o.test_name, number: o.number, date: o.validated_at, patient: initials(o) };
  });

  // ---------------- Waiting-room screen ----------------
  r.get('/api/public/clinic/queue/:token', (ctx) => {
    const s = db.get('SELECT * FROM clinic_settings WHERE display_token = ?', str(ctx.params.token, 40)); if (!s || !s.display_token) throw notFound('Écran inconnu');
    const c = db.get('SELECT name, logo FROM companies WHERE id = ?', s.company_id);
    return { clinic: c, ...P.display(db, s.company_id), now: now() };
  });
}
