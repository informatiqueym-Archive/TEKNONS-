// Teknons Santé: clinics, medical centres, maternities and private hospitals.
// Patient file with insurance cover, online booking and teleconsultation,
// arrival desk with triage and a waiting-room screen, the doctor's
// consultation (vitals and NEWS2, ICD-10 diagnosis, e-prescription checked
// for allergies and interactions, lab and imaging orders, certificates),
// laboratory and imaging worklist with flagged results, wards with the bed
// board and nursing chart, pharmacy with lots and expiry, the cashier with
// insurer / patient split, monthly insurer claims, epidemiological
// surveillance, FHIR export, and a patient portal paid by MTN MoMo / Orange
// Money. Teknons Compta runs underneath: every bill and payment is posted.
import { requirePerm, requireUser } from '../../core/auth.js';
import { bad, notFound } from '../../core/errors.js';
import { str, int, oneOf, date as vDate } from '../../core/validate.js';
import { audit, raiseAlert } from '../../core/alerts.js';
import { now, today } from '../../core/schema.js';
import { can } from '../../core/roles.js';
import { sendXlsx } from '../../core/xlsx.js';
import { normalizePhone, guessProvider } from '../../core/payments/mobile-money.js';
import { baseUrl } from '../accounting/paylink.js';
import { migrateClinic, seedCompanyClinic, settingsOf, token } from './schema.js';
import { ICD10, searchIcd, VACCINES, LAB_PANELS } from './ref.js';
import * as P from './patients.js';
import * as C from './care.js';
import * as B from './billing.js';
import * as PH from './pharmacy.js';
import * as IN from './insights.js';
import * as PR from './print.js';
import { registerPortal } from './portal.js';

const J = (s, d) => { try { return JSON.parse(s || ''); } catch { return d; } };

export default {
  id: 'clinic',
  requires: ['accounting'],
  name: { fr: 'Teknons Santé', en: 'Teknons Health' },
  brand: { name: 'Teknons Santé', short: 'Santé', description: 'Cliniques, centres médicaux et hôpitaux : dossier patient, rendez-vous et téléconsultation, ordonnances sécurisées, laboratoire, pharmacie, hospitalisation, tiers payant et paiement MTN MoMo / Orange Money.', navy: '#1E1A4D', accent: '#6D3BEB' },
  migrate: migrateClinic,
  onCompanyCreated: seedCompanyClinic,

  routes(r, { db, bus, momo, env }) {
    const cid = (ctx) => ctx.user.company_id;
    const company = (ctx) => db.get('SELECT * FROM companies WHERE id = ?', cid(ctx));
    const changed = (ctx, entity, id) => bus.emit(cid(ctx), 'change', { entity, id });
    const html = (ctx, body) => ctx.send(body);
    const base = (ctx) => baseUrl(ctx, env);
    const recep = requirePerm('reception', 'settings');
    const clinical = requirePerm('care', 'prescribe');
    const prescriber = requirePerm('prescribe');
    const orderer = requirePerm('prescribe', 'care');
    const labPerm = requirePerm('lab');
    const labView = requirePerm('lab', 'care', 'prescribe');
    const ward = requirePerm('ward');
    const pharm = requirePerm('pharmacy');
    const pharmView = requirePerm('pharmacy', 'prescribe', 'care', 'settings');
    const cashier = requirePerm('treasury', 'sales', 'reception');
    const claimsPerm = requirePerm('accounting', 'settings', 'reception');
    const isClinical = (ctx) => can(ctx.user, 'care') || can(ctx.user, 'prescribe');
    const xlsxOr = (ctx, name, sheets, data) => (ctx.query.format === 'xlsx' ? sendXlsx(ctx, name, sheets) : data);

    registerPortal(r, { db, bus, momo, env });

    // ---------------- Reference data and settings ----------------
    r.get('/api/clinic/meta', requireUser, (ctx) => {
      const c = cid(ctx); const s = settingsOf(db, c);
      return {
        settings: s, departments: db.all('SELECT * FROM clinic_departments WHERE company_id = ? ORDER BY position, id', c),
        practitioners: P.practitioners(db, c, { active: false }), me: P.practitionerOf(db, c, ctx.user.id) || null,
        tariffs: db.all('SELECT * FROM clinic_tariffs WHERE company_id = ? ORDER BY kind, name', c).map((t) => ({ ...t, params: J(t.params, []) })),
        insurers: db.all('SELECT id, name, kind, coverage_pct, ceiling, active FROM clinic_insurers WHERE company_id = ? ORDER BY name', c),
        wards: db.all('SELECT ward, COUNT(*) beds, MIN(daily_rate) rate FROM clinic_beds WHERE company_id = ? AND active = 1 GROUP BY ward ORDER BY MIN(position)', c),
        icd: ICD10.map(([code, fr, en, sv]) => ({ code, fr, en, surveillance: sv })), vaccines: VACCINES, panels: Object.keys(LAB_PANELS),
        public_url: base(ctx), display_url: `${base(ctx)}/queue/${s.display_token}`, booking_url: `${base(ctx)}/rdv`,
        momo: { mode: momo.mode, mtn_momo: momo.configured('mtn_momo'), orange_money: momo.configured('orange_money') },
        unread: db.get("SELECT COUNT(*) n FROM clinic_messages WHERE company_id = ? AND direction = 'in' AND read = 0", c).n,
      };
    });
    r.put('/api/clinic/settings', requirePerm('settings'), (ctx) => {
      const b = ctx.body; const c = cid(ctx); const s = settingsOf(db, c);
      const t = (k) => { const v = str(b[k] ?? s[k], 5); if (!/^\d{2}:\d{2}$/.test(v)) throw bad('time', 'Heure invalide (HH:MM)'); return v; };
      const f = (k) => (b[k] === undefined ? s[k] : (b[k] ? 1 : 0));
      const tele = str(b.tele_base ?? s.tele_base, 200); if (!/^https:\/\//.test(tele)) throw bad('tele_base', 'Adresse de visioconférence invalide (https://…)');
      db.run(`UPDATE clinic_settings SET kind = ?, mrn_prefix = ?, slot_minutes = ?, open_from = ?, open_to = ?, booking_open = ?, tele_enabled = ?, tele_base = ?, portal_pay = ?, consult_prepay = ?,
        director_name = ?, director_title = ?, approval_no = ?, health_district = ?, welcome_text = ?, emergency_phone = ?, expiry_alert_days = ?, drugs_covered = ? WHERE company_id = ?`,
      oneOf(b.kind ?? s.kind, ['clinic', 'hospital', 'medical_center', 'maternity', 'dental', 'lab'], 'kind'), str(b.mrn_prefix ?? s.mrn_prefix, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'HS',
      oneOf(Number(b.slot_minutes ?? s.slot_minutes), [10, 15, 20, 30, 45, 60], 'slot_minutes'), t('open_from'), t('open_to'), f('booking_open'), f('tele_enabled'), tele, f('portal_pay'), f('consult_prepay'),
      str(b.director_name ?? s.director_name, 120), str(b.director_title ?? s.director_title, 80), str(b.approval_no ?? s.approval_no, 60), str(b.health_district ?? s.health_district, 80), str(b.welcome_text ?? s.welcome_text, 1500),
      str(b.emergency_phone ?? s.emergency_phone, 30), int(b.expiry_alert_days ?? s.expiry_alert_days, 'expiry_alert_days', { min: 7 }), f('drugs_covered'), c);
      if (b.renew_display) db.run('UPDATE clinic_settings SET display_token = ? WHERE company_id = ?', token(12), c);
      audit(db, ctx, 'update', 'clinic_settings', c);
      changed(ctx, 'clinic_settings');
      return settingsOf(db, c);
    });
    r.get('/api/clinic/icd', requireUser, (ctx) => searchIcd(ctx.query.q, 25));

    r.post('/api/clinic/departments', requirePerm('settings'), (ctx) => {
      const name = str(ctx.body.name, 80); if (!name) throw bad('name', 'Nom obligatoire');
      const id = Number(db.run('INSERT INTO clinic_departments (company_id, name, name_en, kind, color, position) VALUES (?,?,?,?,?,?)', cid(ctx), name, str(ctx.body.name_en, 80), oneOf(ctx.body.kind, ['consult', 'emergency', 'surgery', 'lab', 'imaging', 'pharmacy'], 'kind', 'consult'), str(ctx.body.color, 9) || '#6D3BEB', 99).lastInsertRowid);
      return ctx.json(db.get('SELECT * FROM clinic_departments WHERE id = ?', id), 201);
    });
    r.put('/api/clinic/departments/:id', requirePerm('settings'), (ctx) => {
      const d = db.get('SELECT * FROM clinic_departments WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!d) throw notFound(); const b = ctx.body;
      db.run('UPDATE clinic_departments SET name = ?, name_en = ?, kind = ?, color = ?, position = ?, active = ? WHERE id = ?', str(b.name ?? d.name, 80), str(b.name_en ?? d.name_en, 80), oneOf(b.kind ?? d.kind, ['consult', 'emergency', 'surgery', 'lab', 'imaging', 'pharmacy'], 'kind'),
        str(b.color ?? d.color, 9), int(b.position ?? d.position, 'position', { def: 0 }), b.active === undefined ? d.active : (b.active ? 1 : 0), d.id);
      return db.get('SELECT * FROM clinic_departments WHERE id = ?', d.id);
    });
    const tariffVals = (b, cur = {}) => {
      const code = str(b.code ?? cur.code, 20).toUpperCase(); const name = str(b.name ?? cur.name, 160);
      if (!code || !name) throw bad('required', 'Code et désignation obligatoires');
      const kind = oneOf(b.kind ?? cur.kind ?? 'act', ['consult', 'lab', 'imaging', 'care', 'act', 'surgery', 'other'], 'kind');
      let params = b.params !== undefined ? b.params : J(cur.params, []);
      if (typeof params === 'string') params = LAB_PANELS[params] || J(params, []);
      if (!Array.isArray(params)) throw bad('params', 'Paramètres invalides');
      return [code, name, str(b.name_en ?? cur.name_en, 160), kind, int(b.price ?? cur.price ?? 0, 'price', { min: 0 }), Number(b.department_id ?? cur.department_id) || null,
        oneOf(String(b.account_code ?? cur.account_code ?? B.ACCOUNT_FOR[kind] ?? '7061'), ['7061', '7062', '7063', '7011', '706'], 'account_code'), JSON.stringify(params.slice(0, 40)), int(b.tat_hours ?? cur.tat_hours ?? 0, 'tat_hours', { min: 0 }),
        (b.covered ?? cur.covered ?? 1) ? 1 : 0];
    };
    r.post('/api/clinic/tariffs', requirePerm('settings'), (ctx) => {
      const id = Number(db.run('INSERT INTO clinic_tariffs (company_id, code, name, name_en, kind, price, department_id, account_code, params, tat_hours, covered) VALUES (?,?,?,?,?,?,?,?,?,?,?)', cid(ctx), ...tariffVals(ctx.body)).lastInsertRowid);
      audit(db, ctx, 'create', 'clinic_tariff', id); return ctx.json(db.get('SELECT * FROM clinic_tariffs WHERE id = ?', id), 201);
    });
    r.put('/api/clinic/tariffs/:id', requirePerm('settings'), (ctx) => {
      const t = db.get('SELECT * FROM clinic_tariffs WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!t) throw notFound();
      db.run('UPDATE clinic_tariffs SET code = ?, name = ?, name_en = ?, kind = ?, price = ?, department_id = ?, account_code = ?, params = ?, tat_hours = ?, covered = ?, active = ? WHERE id = ?', ...tariffVals(ctx.body, t), ctx.body.active === undefined ? t.active : (ctx.body.active ? 1 : 0), t.id);
      audit(db, ctx, 'update', 'clinic_tariff', t.id); return db.get('SELECT * FROM clinic_tariffs WHERE id = ?', t.id);
    });
    r.post('/api/clinic/practitioners', requirePerm('settings', 'users'), (ctx) => ctx.json(P.savePractitioner(db, ctx, ctx.body), 201));
    r.put('/api/clinic/practitioners/:id', requirePerm('settings', 'users'), (ctx) => P.savePractitioner(db, ctx, ctx.body, Number(ctx.params.id)));
    r.post('/api/clinic/beds', requirePerm('settings'), (ctx) => {
      const b = ctx.body; const label = str(b.label, 30); const ward = str(b.ward, 60); if (!label || !ward) throw bad('required', 'Service et lit obligatoires');
      const id = Number(db.run('INSERT INTO clinic_beds (company_id, ward, room, label, kind, daily_rate, position) VALUES (?,?,?,?,?,?,?)', cid(ctx), ward, str(b.room, 30) || label, label, oneOf(b.kind, ['standard', 'private', 'vip', 'icu', 'maternity'], 'kind', 'standard'), int(b.daily_rate, 'daily_rate', { min: 0, def: 15000 }), 999).lastInsertRowid);
      changed(ctx, 'clinic_bed', id); return ctx.json(db.get('SELECT * FROM clinic_beds WHERE id = ?', id), 201);
    });
    r.put('/api/clinic/beds/:id', requirePerm('ward', 'settings'), (ctx) => {
      const bd = db.get('SELECT * FROM clinic_beds WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!bd) throw notFound(); const b = ctx.body;
      const status = b.status === undefined ? bd.status : oneOf(b.status, ['free', 'cleaning', 'blocked'], 'status');
      if (bd.status === 'occupied' && status !== 'occupied') throw bad('occupied', 'Lit occupé : faites la sortie ou le transfert du patient');
      const settings = can(ctx.user, 'settings');
      db.run('UPDATE clinic_beds SET status = ?, ward = ?, room = ?, label = ?, kind = ?, daily_rate = ?, active = ? WHERE id = ?', bd.status === 'occupied' ? 'occupied' : status,
        settings ? str(b.ward ?? bd.ward, 60) : bd.ward, settings ? str(b.room ?? bd.room, 30) : bd.room, settings ? str(b.label ?? bd.label, 30) : bd.label, settings ? oneOf(b.kind ?? bd.kind, ['standard', 'private', 'vip', 'icu', 'maternity'], 'kind') : bd.kind,
        settings ? int(b.daily_rate ?? bd.daily_rate, 'daily_rate', { min: 0 }) : bd.daily_rate, settings && b.active !== undefined ? (b.active ? 1 : 0) : bd.active, bd.id);
      changed(ctx, 'clinic_bed', bd.id); return db.get('SELECT * FROM clinic_beds WHERE id = ?', bd.id);
    });

    // ---------------- Patients ----------------
    r.get('/api/clinic/patients', requireUser, (ctx) => {
      if (ctx.query.card) { const p = db.get('SELECT id FROM clinic_patients WHERE company_id = ? AND card_code = ?', cid(ctx), str(ctx.query.card, 20).toUpperCase()); return p ? [P.getPatient(db, cid(ctx), p.id)] : []; }
      const rows = P.listPatients(db, cid(ctx), ctx.query);
      return xlsxOr(ctx, 'patients.xlsx', [{ name: 'Patients', columns: [{ header: 'Dossier', key: 'mrn' }, { header: 'Nom', key: 'last_name' }, { header: 'Prénom', key: 'first_name' }, { header: 'Sexe', key: 'sex' }, { header: 'Né(e) le', key: 'birth_date' }, { header: 'Âge', key: 'age' }, { header: 'Téléphone', key: 'phone' }, { header: 'Assureur', key: 'insurer_name' }, { header: 'N° assuré', key: 'insurance_no' }, { header: 'Dernière visite', key: 'last_visit' }], rows }], rows);
    });
    r.get('/api/clinic/patients/:id', requireUser, (ctx) => {
      const c = cid(ctx); const id = Number(ctx.params.id);
      const p = P.getPatient(db, c, id);
      const money = can(ctx.user, 'treasury') || can(ctx.user, 'sales') || can(ctx.user, 'reception');
      const clin = isClinical(ctx);
      const out = { ...p, portal_token: undefined, portal_url: money || clin || can(ctx.user, 'reception') ? `${base(ctx)}/s/${p.portal_token}` : undefined,
        appointments: P.appointments(db, c, { patient_id: id }).reverse().slice(0, 30), account: money ? B.account(db, c, id) : null,
        admission: db.get("SELECT a.id, a.number, b.label bed_label, b.ward FROM clinic_admissions a LEFT JOIN clinic_beds b ON b.id = a.bed_id WHERE a.patient_id = ? AND a.status = 'admitted'", id) || null,
        open_visit: db.get("SELECT id, number, status, queue_no FROM clinic_visits WHERE patient_id = ? AND status IN ('waiting','in_consult') ORDER BY id DESC", id) || null, clinical: clin };
      if (!clin) {
        // Medical secrecy: non-clinical staff see the administrative file only.
        delete out.allergies; delete out.chronic; delete out.treatments; delete out.notes; delete out.pregnant;
        if (can(ctx.user, 'pharmacy')) { out.allergies = p.allergies; out.prescriptions = C.prescriptionsOf(db, c, { patient_id: id, limit: 20 }); }
        if (can(ctx.user, 'lab')) out.orders = C.ordersOf(db, c, { patient_id: id, limit: 40 });
        return out;
      }
      return { ...out, timeline: C.timeline(db, c, id), vitals: C.vitalsTrend(db, id), vaccines: db.all('SELECT * FROM clinic_vaccines WHERE patient_id = ? ORDER BY date DESC', id), active_rx: C.activeTreatments(db, id), messages: C.messages(db, c, id) };
    });
    r.post('/api/clinic/patients', requirePerm('reception', 'care', 'settings'), (ctx) => ctx.json(P.createPatient(db, ctx, cid(ctx), ctx.body), 201));
    r.put('/api/clinic/patients/:id', requirePerm('reception', 'care', 'settings'), (ctx) => {
      const b = { ...ctx.body };
      if (!isClinical(ctx)) for (const k of ['allergies', 'chronic', 'treatments', 'notes', 'pregnant']) delete b[k];
      const p = P.updatePatient(db, ctx, cid(ctx), Number(ctx.params.id), b); changed(ctx, 'clinic_patient', p.id); return { ...p, portal_token: undefined };
    });
    r.post('/api/clinic/patients/:id/portal-link', requirePerm('reception', 'care', 'settings'), (ctx) => {
      const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!p) throw notFound();
      if (ctx.body.renew) { db.run('UPDATE clinic_patients SET portal_token = ? WHERE id = ?', token(), p.id); audit(db, ctx, 'renew_link', 'clinic_patient', p.id); }
      return { url: `${base(ctx)}/s/${db.get('SELECT portal_token FROM clinic_patients WHERE id = ?', p.id).portal_token}` };
    });
    r.get('/api/clinic/patients/:id/fhir', clinical, (ctx) => {
      audit(db, ctx, 'export_fhir', 'clinic_patient', Number(ctx.params.id));
      const bundle = C.fhirBundle(db, cid(ctx), Number(ctx.params.id), base(ctx));
      return ctx.send(JSON.stringify(bundle, null, 2), 'application/fhir+json; charset=utf-8', 200, { 'Content-Disposition': `attachment; filename="fhir-patient-${ctx.params.id}.json"` });
    });
    r.get('/api/clinic/cards', requirePerm('reception', 'care', 'settings'), (ctx) => {
      const ids = String(ctx.query.patient_id || '').split(',').map(Number).filter(Boolean).slice(0, 40);
      const list = ids.map((id) => P.getPatient(db, cid(ctx), id));
      html(ctx, PR.renderCards(company(ctx), settingsOf(db, cid(ctx)), list, base(ctx), { autoPrint: ctx.query.print === '1' }));
    });
    r.post('/api/clinic/patients/:id/vaccines', requirePerm('care'), (ctx) => { const v = C.addVaccine(db, ctx, cid(ctx), Number(ctx.params.id), ctx.body); changed(ctx, 'clinic_patient', Number(ctx.params.id)); return ctx.json(v, 201); });
    r.get('/api/clinic/patients/:id/messages', requirePerm('care', 'prescribe', 'reception'), (ctx) => {
      if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx))) throw notFound();
      db.run("UPDATE clinic_messages SET read = 1 WHERE patient_id = ? AND direction = 'in'", ctx.params.id);
      return C.messages(db, cid(ctx), Number(ctx.params.id));
    });
    r.post('/api/clinic/patients/:id/messages', requirePerm('care', 'prescribe', 'reception'), (ctx) => {
      if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx))) throw notFound();
      const body = str(ctx.body.body, 2000); if (!body) throw bad('body', 'Message vide');
      db.run("INSERT INTO clinic_messages (company_id, patient_id, direction, body, user_id, read, created_at) VALUES (?,?, 'out', ?, ?, 0, ?)", cid(ctx), ctx.params.id, body, ctx.user.id, now());
      db.run("UPDATE clinic_messages SET read = 1 WHERE patient_id = ? AND direction = 'in'", ctx.params.id);
      changed(ctx, 'clinic_message', Number(ctx.params.id));
      return ctx.json({ ok: true }, 201);
    });
    r.get('/api/clinic/inbox', requirePerm('care', 'prescribe', 'reception'), (ctx) => C.inbox(db, cid(ctx)));

    // ---------------- Appointments ----------------
    r.get('/api/clinic/appointments', requireUser, (ctx) => {
      const q = { ...ctx.query };
      if (!q.date && !q.from && !q.patient_id) q.date = today();
      const rows = P.appointments(db, cid(ctx), q);
      return xlsxOr(ctx, `rendez-vous-${q.date || q.from || ''}.xlsx`, [{ name: 'Rendez-vous', columns: [{ header: 'Date', key: 'date' }, { header: 'Heure', key: 'time' }, { header: 'Patient', key: 'last_name' }, { header: 'Prénom', key: 'first_name' }, { header: 'Téléphone', key: 'phone' }, { header: 'Praticien', key: 'practitioner_name' }, { header: 'Mode', key: 'mode' }, { header: 'Statut', key: 'status' }, { header: 'Motif', key: 'reason' }], rows }], rows);
    });
    r.get('/api/clinic/slots', requireUser, (ctx) => P.freeSlots(db, cid(ctx), Number(ctx.query.practitioner_id), vDate(ctx.query.date, 'date', today())));
    r.post('/api/clinic/appointments', requirePerm('reception', 'care', 'prescribe', 'settings'), (ctx) => { const a = P.book(db, ctx, cid(ctx), ctx.body); changed(ctx, 'clinic_appointment', a.id); return ctx.json(a, 201); });
    r.put('/api/clinic/appointments/:id', requirePerm('reception', 'care', 'prescribe', 'settings'), (ctx) => {
      const a = P.setAppointmentStatus(db, ctx, cid(ctx), Number(ctx.params.id), ctx.body.status);
      if (a.status === 'cancelled' && a.document_id) B.creditUnpaid(db, ctx, company(ctx), a.document_id);
      changed(ctx, 'clinic_appointment', a.id); return a;
    });
    /** Tomorrow's (or a day's) appointments with a ready-made WhatsApp reminder. */
    r.get('/api/clinic/reminders', recep, (ctx) => {
      const date = vDate(ctx.query.date, 'date', new Date(Date.now() + 864e5).toISOString().slice(0, 10));
      const c = company(ctx);
      return P.appointments(db, cid(ctx), { date }).filter((a) => ['booked', 'confirmed'].includes(a.status) && a.phone).map((a) => ({ ...a,
        text: `Bonjour ${a.first_name}, rappel de votre rendez-vous ${a.mode === 'tele' ? 'en téléconsultation ' : ''}le ${date.split('-').reverse().join('/')} à ${a.time} avec ${a.title || 'Dr'} ${a.practitioner_name} à ${c.name}. Détails : ${base(ctx)}/rdv/${a.code}` }));
    });

    // ---------------- Desk and queue ----------------
    r.get('/api/clinic/queue', requireUser, (ctx) => P.queue(db, cid(ctx), { practitioner_id: ctx.query.mine ? P.practitionerOf(db, cid(ctx), ctx.user.id)?.id ?? -1 : ctx.query.practitioner_id, all: ctx.query.all === '1' }));
    r.post('/api/clinic/checkin', requirePerm('reception', 'care', 'settings'), (ctx) => ctx.json(P.checkIn(db, bus, ctx, company(ctx), ctx.body), 201));
    r.post('/api/clinic/call', requirePerm('care', 'prescribe', 'reception'), (ctx) => P.callNext(db, bus, ctx, cid(ctx), ctx.body));
    r.get('/api/clinic/display', requireUser, (ctx) => P.display(db, cid(ctx)));
    r.get('/api/clinic/my-day', requireUser, (ctx) => {
      const c = cid(ctx); const me = P.practitionerOf(db, c, ctx.user.id);
      return { practitioner: me, queue: me ? P.queue(db, c, { practitioner_id: me.id }) : [], appointments: me ? P.appointments(db, c, { date: today(), practitioner_id: me.id }) : [],
        results: me ? C.ordersOf(db, c, { status: 'validated', limit: 300 }).filter((o) => o.practitioner_id === me.id && o.validated_at >= new Date(Date.now() - 2 * 864e5).toISOString()).slice(0, 12) : [],
        inpatients: me ? db.all("SELECT a.id, a.number, a.admitted_at, b.label bed_label, b.ward, p.last_name, p.first_name, (SELECT news FROM clinic_care x WHERE x.admission_id = a.id AND x.kind = 'vitals' ORDER BY x.id DESC LIMIT 1) news FROM clinic_admissions a JOIN clinic_patients p ON p.id = a.patient_id LEFT JOIN clinic_beds b ON b.id = a.bed_id WHERE a.practitioner_id = ? AND a.status = 'admitted' ORDER BY b.position", me.id) : [],
        unread: db.get("SELECT COUNT(*) n FROM clinic_messages WHERE company_id = ? AND direction = 'in' AND read = 0", c).n };
    });

    // ---------------- Consultations ----------------
    r.get('/api/clinic/visits', clinical, (ctx) => {
      const from = ctx.query.from || new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), to = ctx.query.to || today();
      return db.all(`SELECT v.id, v.number, v.kind, v.status, v.arrived_at, v.diagnosis, v.icd, p.id patient_id, p.last_name, p.first_name, p.mrn, u.name practitioner_name FROM clinic_visits v JOIN clinic_patients p ON p.id = v.patient_id
        LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id WHERE v.company_id = ? AND substr(v.arrived_at,1,10) BETWEEN ? AND ? ${ctx.query.mine ? 'AND v.practitioner_id = ' + Number(P.practitionerOf(db, cid(ctx), ctx.user.id)?.id ?? -1) : ''} ORDER BY v.arrived_at DESC LIMIT 500`, cid(ctx), from, to).map((v) => ({ ...v, icd: J(v.icd, []) }));
    });
    r.get('/api/clinic/visits/:id', clinical, (ctx) => C.visitDetail(db, ctx, cid(ctx), Number(ctx.params.id)));
    r.put('/api/clinic/visits/:id', clinical, (ctx) => C.saveVisit(db, bus, ctx, cid(ctx), Number(ctx.params.id), ctx.body));
    r.post('/api/clinic/visits/:id/close', prescriber, (ctx) => C.closeVisit(db, bus, ctx, cid(ctx), Number(ctx.params.id), ctx.body));
    r.post('/api/clinic/visits/:id/cancel', requirePerm('reception', 'prescribe', 'settings'), (ctx) => C.cancelVisit(db, bus, ctx, cid(ctx), Number(ctx.params.id)));
    r.post('/api/clinic/visits/:id/acts', orderer, (ctx) => {
      const v = db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!v) throw notFound();
      const ids = (Array.isArray(ctx.body.tariff_ids) ? ctx.body.tariff_ids : [ctx.body.tariff_id]).map(Number).filter(Boolean);
      if (!ids.length) throw bad('acts', 'Choisissez un acte');
      db.tx(() => { for (const t of ids) B.addCharge(db, B.sys(ctx), cid(ctx), { patient_id: v.patient_id, visit_id: v.id, tariff_id: t, qty: ctx.body.qty }); });
      changed(ctx, 'clinic_visit', v.id); return C.visitDetail(db, ctx, cid(ctx), v.id);
    });

    // ---------------- Prescriptions ----------------
    r.post('/api/clinic/rx/check', orderer, (ctx) => C.rxCheck(db, cid(ctx), Number(ctx.body.patient_id), ctx.body.lines || []));
    r.post('/api/clinic/prescriptions', prescriber, (ctx) => ctx.json(C.createPrescription(db, bus, ctx, cid(ctx), ctx.body), 201));
    r.get('/api/clinic/prescriptions', pharmView, (ctx) => C.prescriptionsOf(db, cid(ctx), { status: ctx.query.status, patient_id: ctx.query.patient_id, limit: ctx.query.limit }));
    r.post('/api/clinic/prescriptions/:id/cancel', prescriber, (ctx) => {
      const rx = db.get('SELECT * FROM clinic_prescriptions WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!rx) throw notFound();
      if (rx.status !== 'active') throw bad('state', 'Ordonnance déjà délivrée');
      db.run("UPDATE clinic_prescriptions SET status = 'cancelled' WHERE id = ?", rx.id); audit(db, ctx, 'cancel', 'clinic_prescription', rx.id); changed(ctx, 'clinic_rx', rx.id); return { ok: true };
    });
    r.get('/api/clinic/prescriptions/:id/print', requirePerm('prescribe', 'care', 'pharmacy', 'reception'), (ctx) => {
      const rx = C.prescriptionsOf(db, cid(ctx), { id: Number(ctx.params.id) })[0]; if (!rx) throw notFound();
      html(ctx, PR.renderPrescription(company(ctx), settingsOf(db, cid(ctx)), rx, base(ctx), { autoPrint: ctx.query.print === '1' }));
    });

    // ---------------- Laboratory and imaging ----------------
    r.post('/api/clinic/orders', orderer, (ctx) => ctx.json(C.createOrders(db, bus, ctx, cid(ctx), ctx.body), 201));
    r.get('/api/clinic/orders', labView, (ctx) => C.ordersOf(db, cid(ctx), { kind: ctx.query.kind, status: ctx.query.status || 'ordered,sampled,done', patient_id: ctx.query.patient_id, date: ctx.query.date, limit: ctx.query.limit }));
    r.get('/api/clinic/orders/:id', labView, (ctx) => { const o = C.ordersOf(db, cid(ctx), { id: Number(ctx.params.id) })[0]; if (!o) throw notFound(); return o; });
    r.post('/api/clinic/orders/:id/sample', labPerm, (ctx) => C.sampleOrder(db, bus, ctx, cid(ctx), Number(ctx.params.id)));
    r.post('/api/clinic/orders/:id/results', labPerm, (ctx) => C.saveResults(db, bus, ctx, cid(ctx), Number(ctx.params.id), ctx.body));
    r.post('/api/clinic/orders/:id/cancel', requirePerm('lab', 'prescribe'), (ctx) => C.cancelOrder(db, bus, ctx, cid(ctx), Number(ctx.params.id)));
    r.get('/api/clinic/orders/:id/print', labView, (ctx) => {
      const o = C.ordersOf(db, cid(ctx), { id: Number(ctx.params.id) })[0]; if (!o) throw notFound();
      if (o.status !== 'validated') throw bad('not_validated', 'Résultat non encore validé');
      html(ctx, PR.renderLabReport(company(ctx), settingsOf(db, cid(ctx)), { ...o, ...db.get('SELECT p.insurer_id FROM clinic_patients p WHERE p.id = ?', o.patient_id) }, base(ctx), { autoPrint: ctx.query.print === '1' }));
    });

    // ---------------- Certificates ----------------
    r.post('/api/clinic/certificates', prescriber, (ctx) => ctx.json(C.createCertificate(db, ctx, cid(ctx), ctx.body), 201));
    r.get('/api/clinic/certificates/:id/print', requirePerm('prescribe', 'care', 'reception'), (ctx) => {
      const x = C.certificateFull(db, 'id', Number(ctx.params.id)); if (!x || x.company_id !== cid(ctx)) throw notFound();
      html(ctx, PR.renderCertificate(company(ctx), settingsOf(db, cid(ctx)), x, base(ctx), { autoPrint: ctx.query.print === '1' }));
    });

    // ---------------- Wards ----------------
    r.get('/api/clinic/beds', requirePerm('ward', 'reception', 'care', 'settings', 'reports'), (ctx) => C.beds(db, cid(ctx)));
    r.post('/api/clinic/admissions', requirePerm('ward', 'prescribe'), (ctx) => ctx.json(C.admit(db, bus, ctx, cid(ctx), ctx.body), 201));
    r.get('/api/clinic/admissions', requirePerm('ward', 'care', 'reception', 'reports'), (ctx) => db.all(`SELECT a.*, p.last_name, p.first_name, p.mrn, b.label bed_label, b.ward FROM clinic_admissions a JOIN clinic_patients p ON p.id = a.patient_id LEFT JOIN clinic_beds b ON b.id = a.bed_id
      WHERE a.company_id = ? ${ctx.query.status ? 'AND a.status = ?' : ''} ORDER BY a.admitted_at DESC LIMIT 300`, cid(ctx), ...(ctx.query.status ? [ctx.query.status] : [])));
    r.get('/api/clinic/admissions/:id', requirePerm('ward', 'care', 'prescribe'), (ctx) => C.admissionDetail(db, cid(ctx), Number(ctx.params.id)));
    r.post('/api/clinic/admissions/:id/care', requirePerm('ward', 'care'), (ctx) => ctx.json(C.addCare(db, bus, ctx, cid(ctx), Number(ctx.params.id), ctx.body), 201));
    r.put('/api/clinic/care/:id', requirePerm('ward', 'care'), (ctx) => C.markCare(db, bus, ctx, cid(ctx), Number(ctx.params.id), ctx.body));
    r.post('/api/clinic/admissions/:id/discharge', prescriber, (ctx) => C.discharge(db, bus, ctx, cid(ctx), Number(ctx.params.id), ctx.body));
    r.post('/api/clinic/admissions/:id/transfer', ward, (ctx) => C.transferBed(db, bus, ctx, cid(ctx), Number(ctx.params.id), Number(ctx.body.bed_id)));
    r.post('/api/clinic/admissions/:id/charges', requirePerm('ward', 'care', 'prescribe'), (ctx) => {
      const a = db.get('SELECT * FROM clinic_admissions WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!a) throw notFound();
      const id = B.addCharge(db, B.sys(ctx), cid(ctx), { patient_id: a.patient_id, admission_id: a.id, tariff_id: ctx.body.tariff_id, qty: ctx.body.qty, description: ctx.body.description, unit_price: ctx.body.unit_price, source: ctx.body.source });
      changed(ctx, 'clinic_care', a.id); return ctx.json({ id }, 201);
    });
    r.get('/api/clinic/admissions/:id/print', requirePerm('ward', 'care', 'prescribe', 'reception'), (ctx) => {
      const a = C.admissionDetail(db, cid(ctx), Number(ctx.params.id));
      if (a.status !== 'discharged') throw bad('not_discharged', 'Le compte rendu est disponible à la sortie');
      html(ctx, PR.renderDischarge(company(ctx), settingsOf(db, cid(ctx)), a, base(ctx), { autoPrint: ctx.query.print === '1' }));
    });

    // ---------------- Pharmacy ----------------
    r.get('/api/clinic/drugs', requireUser, (ctx) => {
      const rows = PH.drugs(db, cid(ctx), ctx.query);
      const lite = !can(ctx.user, 'pharmacy') && !can(ctx.user, 'settings') && !can(ctx.user, 'reports');
      const out = lite ? rows.map(({ cost, used30, ...d }) => d) : rows;
      return xlsxOr(ctx, 'stock-pharmacie.xlsx', [{ name: 'Stock', columns: [{ header: 'Médicament', key: 'name' }, { header: 'DCI', key: 'dci' }, { header: 'Forme', key: 'form' }, { header: 'Catégorie', key: 'category' }, { header: 'Stock', key: 'stock' }, { header: 'Seuil', key: 'reorder' }, { header: 'Prix', key: 'price', type: 'money' }, { header: 'Coût moyen', key: 'cost', type: 'money' }, { header: 'Prochaine péremption', key: 'next_expiry' }, { header: 'Jours de stock', key: 'days_left' }], rows }], out);
    });
    r.get('/api/clinic/drugs/:id', pharmView, (ctx) => {
      const d = db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!d) throw notFound();
      return { ...d, lots: PH.lotsOf(db, d.id), moves: PH.moves(db, cid(ctx), d.id) };
    });
    r.post('/api/clinic/drugs', requirePerm('pharmacy', 'settings'), (ctx) => ctx.json(PH.saveDrug(db, ctx, ctx.body), 201));
    r.put('/api/clinic/drugs/:id', requirePerm('pharmacy', 'settings'), (ctx) => PH.saveDrug(db, ctx, ctx.body, Number(ctx.params.id)));
    r.post('/api/clinic/pharmacy/receive', pharm, (ctx) => ctx.json(PH.receive(db, bus, ctx, company(ctx), ctx.body), 201));
    r.post('/api/clinic/pharmacy/dispense/:id', pharm, (ctx) => PH.dispense(db, bus, ctx, company(ctx), Number(ctx.params.id), ctx.body));
    r.post('/api/clinic/pharmacy/counter', pharm, (ctx) => ctx.json(PH.counterSale(db, bus, ctx, company(ctx), ctx.body), 201));
    r.post('/api/clinic/pharmacy/adjust', pharm, (ctx) => PH.adjust(db, bus, ctx, cid(ctx), ctx.body));

    // ---------------- Cashier and insurers ----------------
    r.get('/api/clinic/account/:id', cashier, (ctx) => ({ patient: { ...P.getPatient(db, cid(ctx), Number(ctx.params.id)), portal_token: undefined, allergies: undefined, chronic: undefined, treatments: undefined, notes: undefined }, ...B.account(db, cid(ctx), Number(ctx.params.id)) }));
    r.post('/api/clinic/charges', requirePerm('reception', 'care', 'prescribe', 'treasury', 'settings'), (ctx) => { const id = B.addCharge(db, B.sys(ctx), cid(ctx), ctx.body); changed(ctx, 'clinic_charge', id); return ctx.json(db.get('SELECT * FROM clinic_charges WHERE id = ?', id), 201); });
    r.del('/api/clinic/charges/:id', requirePerm('reception', 'treasury', 'settings'), (ctx) => B.cancelCharge(db, ctx, cid(ctx), Number(ctx.params.id)));
    r.post('/api/clinic/bill/:id', cashier, (ctx) => { const x = B.billPatient(db, ctx, company(ctx), Number(ctx.params.id), ctx.body); changed(ctx, 'clinic_charge'); return x || { document_id: null, total: 0 }; });
    r.post('/api/clinic/collect', cashier, (ctx) => ctx.json(B.collect(db, bus, ctx, company(ctx), ctx.body), 201));
    r.post('/api/clinic/momo', cashier, async (ctx) => {
      const phone = normalizePhone(ctx.body.phone);
      return ctx.json(await B.momoForPatient(db, momo, ctx, company(ctx), Number(ctx.body.patient_id), { provider: ctx.body.provider || guessProvider(phone), phone, amount: ctx.body.amount, document_id: ctx.body.document_id }), 201);
    });
    r.get('/api/clinic/cashier', cashier, (ctx) => {
      const c = cid(ctx); const d = vDate(ctx.query.date, 'date', today());
      const receipts = db.all('SELECT r.*, p.last_name, p.first_name, p.mrn, u.name by_name FROM clinic_receipts r JOIN clinic_patients p ON p.id = r.patient_id LEFT JOIN users u ON u.id = r.created_by WHERE r.company_id = ? AND substr(r.created_at,1,10) = ? ORDER BY r.id DESC', c, d);
      const waiting = db.all(`SELECT p.id, p.mrn, p.last_name, p.first_name, i.name insurer_name, SUM(ch.patient_amount) due, SUM(ch.insurer_amount) insurer, COUNT(*) n, MAX(ch.created_at) last_at
        FROM clinic_charges ch JOIN clinic_patients p ON p.id = ch.patient_id LEFT JOIN clinic_insurers i ON i.id = ch.insurer_id WHERE ch.company_id = ? AND ch.status = 'pending' GROUP BY p.id ORDER BY last_at DESC LIMIT 100`, c);
      const methods = db.all("SELECT method, SUM(amount) v, COUNT(*) n FROM clinic_receipts WHERE company_id = ? AND substr(created_at,1,10) = ? GROUP BY method", c, d);
      const counter = db.get("SELECT COALESCE(SUM(p.amount),0) v, COUNT(*) n FROM payments p JOIN documents dd ON dd.id = p.document_id WHERE p.company_id = ? AND p.date = ? AND p.status = 'completed' AND p.notes = 'Comptoir pharmacie'", c, d);
      const online = db.get("SELECT COALESCE(SUM(p.amount),0) v, COUNT(*) n FROM payments p WHERE p.company_id = ? AND p.date = ? AND p.status = 'completed' AND p.created_by IS NULL AND p.method IN ('mtn_momo','orange_money')", c, d);
      return { date: d, receipts, waiting, methods, counter, online, total: receipts.reduce((s, x) => s + x.amount, 0) };
    });
    r.get('/api/clinic/receipts/:id', cashier, (ctx) => {
      const rc = db.get('SELECT * FROM clinic_receipts WHERE id = ? AND company_id = ?', ctx.params.id, cid(ctx)); if (!rc) throw notFound();
      html(ctx, PR.renderReceipt(company(ctx), settingsOf(db, cid(ctx)), rc, P.getPatient(db, cid(ctx), rc.patient_id), B.account(db, cid(ctx), rc.patient_id), { autoPrint: ctx.query.print === '1' }));
    });
    r.get('/api/clinic/insurers', requireUser, (ctx) => B.insurers(db, cid(ctx)));
    r.post('/api/clinic/insurers', requirePerm('settings', 'accounting'), (ctx) => ctx.json(B.saveInsurer(db, ctx, ctx.body), 201));
    r.put('/api/clinic/insurers/:id', requirePerm('settings', 'accounting'), (ctx) => B.saveInsurer(db, ctx, ctx.body, Number(ctx.params.id)));
    r.get('/api/clinic/claimable', claimsPerm, (ctx) => {
      const from = vDate(ctx.query.from, 'from', today().slice(0, 7) + '-01'), to = vDate(ctx.query.to, 'to', today());
      const rows = B.claimable(db, cid(ctx), Number(ctx.query.insurer_id), from, to);
      return { from, to, rows, total: rows.reduce((s, x) => s + x.insurer_amount, 0), patients: new Set(rows.map((x) => x.patient_id)).size };
    });
    r.get('/api/clinic/claims', claimsPerm, (ctx) => B.claims(db, cid(ctx), ctx.query.insurer_id));
    r.post('/api/clinic/claims', requirePerm('accounting', 'settings'), (ctx) => ctx.json(B.createClaim(db, bus, ctx, company(ctx), ctx.body), 201));
    r.get('/api/clinic/claims/:id/print', claimsPerm, (ctx) => {
      const cl = B.claimDetail(db, cid(ctx), Number(ctx.params.id));
      if (ctx.query.format === 'xlsx') return sendXlsx(ctx, `${cl.number}.xlsx`, [{ name: cl.number, columns: [{ header: 'Date', key: 'date' }, { header: 'Dossier', key: 'mrn' }, { header: 'Nom', key: 'last_name' }, { header: 'Prénom', key: 'first_name' }, { header: 'N° assuré', key: 'insurance_no' }, { header: 'Prestation', key: 'description' }, { header: 'Montant', key: 'amount', type: 'money' }, { header: 'Part assureur', key: 'insurer_amount', type: 'money' }, { header: 'Part patient', key: 'patient_amount', type: 'money' }], rows: cl.lines }]);
      html(ctx, PR.renderClaim(company(ctx), settingsOf(db, cid(ctx)), cl, { autoPrint: ctx.query.print === '1' }));
    });

    // ---------------- Dashboard, reports, surveillance ----------------
    r.get('/api/clinic/dashboard', requireUser, (ctx) => {
      const d = IN.dashboard(db, cid(ctx));
      if (!can(ctx.user, 'reports') && !can(ctx.user, 'treasury') && !can(ctx.user, 'accounting')) d.money = null;
      return d;
    });
    r.get('/api/clinic/report', requirePerm('reports'), (ctx) => {
      const from = vDate(ctx.query.from, 'from', today().slice(0, 7) + '-01'), to = vDate(ctx.query.to, 'to', today());
      const d = IN.report(db, cid(ctx), from, to);
      return xlsxOr(ctx, `activite-${from}-${to}.xlsx`, [
        { name: 'Recettes', columns: [{ header: 'Source', key: 'source' }, { header: 'Lignes', key: 'n' }, { header: 'Montant', key: 'amount', type: 'money' }, { header: 'Part assureurs', key: 'insurer', type: 'money' }, { header: 'Part patients', key: 'patient', type: 'money' }], rows: d.revenue },
        { name: 'Praticiens', columns: [{ header: 'Praticien', key: 'name' }, { header: 'Spécialité', key: 'specialty' }, { header: 'Consultations', key: 'visits' }, { header: 'Durée moyenne (min)', key: 'minutes' }, { header: 'Chiffre généré', key: 'revenue', type: 'money' }], rows: d.practitioners },
        { name: 'Diagnostics', columns: [{ header: 'CIM-10', key: 'code' }, { header: 'Diagnostic', key: 'fr' }, { header: 'Cas', key: 'n' }], rows: d.diagnoses },
        { name: 'Laboratoire', columns: [{ header: 'Code', key: 'code' }, { header: 'Examen', key: 'name' }, { header: 'Nombre', key: 'n' }, { header: 'Délai moyen (h)', key: 'tat' }, { header: 'Délai cible (h)', key: 'tat_hours' }, { header: 'Anormaux', key: 'abnormal' }], rows: d.lab },
        { name: 'Assureurs', columns: [{ header: 'Assureur', key: 'name' }, { header: 'Prestations', key: 'n' }, { header: 'Part assureur', key: 'amount', type: 'money' }], rows: d.insurers },
      ], d);
    });
    r.get('/api/clinic/surveillance', requirePerm('reports', 'care', 'prescribe'), (ctx) => {
      const d = IN.surveillance(db, cid(ctx), { weeks: Math.min(52, Number(ctx.query.weeks) || 8) });
      if (ctx.query.format === 'xlsx') {
        const cols = [{ header: 'CIM-10', key: 'code' }, { header: 'Maladie', key: 'fr' }, { header: 'Déclaration', key: 'level' }, ...d.weeks.map((w) => ({ header: `S${w.no} (${w.start})`, key: 'w' + w.start })), { header: 'Total', key: 'total' }, { header: '< 5 ans', key: 'under5' }, { header: 'Femmes', key: 'female' }];
        return sendXlsx(ctx, `surveillance-${today()}.xlsx`, [{ name: 'MAPE', columns: cols, rows: d.diseases.map((x) => ({ ...x, ...Object.fromEntries(Object.entries(x.weeks).map(([k, v]) => ['w' + k, v])) })) },
          { name: 'Paludisme', columns: [{ header: 'Semaine', key: 'week' }, { header: 'Testés', key: 'tested' }, { header: 'Positifs', key: 'positive' }, { header: 'Positivité %', key: 'rate' }], rows: d.malaria }]);
      }
      return { ...d, district: settingsOf(db, cid(ctx)).health_district };
    });
  },

  jobs({ db, bus }) {
    const tick = () => {
      try {
        // Appointments of past days never honoured become no-shows.
        db.run("UPDATE clinic_appointments SET status = 'no_show' WHERE status IN ('booked','confirmed') AND date < ?", today());
        // Visits left open from previous days are closed for the queue (the note stays editable by the doctor).
        db.run("UPDATE clinic_visits SET status = 'cancelled', ended_at = ? WHERE status = 'waiting' AND substr(arrived_at,1,10) < ? AND id NOT IN (SELECT visit_id FROM clinic_charges WHERE visit_id IS NOT NULL AND status = 'billed')", now(), today());
        for (const c of db.all('SELECT company_id FROM clinic_settings')) PH.stockAlerts(db, bus, c.company_id);
        // Planned ward medication more than an hour late
        for (const x of db.all(`SELECT c.id, c.label, c.admission_id, c.company_id, b.label bed FROM clinic_care c JOIN clinic_admissions a ON a.id = c.admission_id LEFT JOIN clinic_beds b ON b.id = a.bed_id
          WHERE c.status = 'planned' AND c.kind = 'med' AND c.planned_at < ? AND c.planned_at > ?`, new Date(Date.now() - 3600e3).toISOString(), new Date(Date.now() - 6 * 3600e3).toISOString())) {
          raiseAlert(db, bus, x.company_id, { kind: 'clinic_med_late', level: 'warning', title: `Soin en retard – lit ${x.bed || ''}`, body: `${x.label} prévu il y a plus d'une heure.`, entity: 'clinic_care', entity_id: x.id });
        }
      } catch (e) { console.warn('clinic jobs', e.message); }
    };
    const t = setTimeout(tick, 20_000);
    const i = setInterval(tick, 15 * 60_000);
    return () => { clearTimeout(t); clearInterval(i); };
  },
};
