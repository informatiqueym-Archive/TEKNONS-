// Patients, practitioners, appointments (with free slots for online booking and
// teleconsultation), arrival at the desk, the waiting queue with triage and
// the call screen in the waiting room.
import { bad, notFound, conflict } from '../../core/errors.js';
import { str, int, oneOf, date as vDate } from '../../core/validate.js';
import { now, today } from '../../core/schema.js';
import { audit } from '../../core/alerts.js';
import { normalizePhone } from '../../core/payments/mobile-money.js';
import { nextNumber } from '../accounting/ledger.js';
import { token, shortCode, settingsOf, nameOf, ageOf } from './schema.js';
import { addCharge, billPatient, sys } from './billing.js';

// ---------------- Patients ----------------
const patientSql = `SELECT p.*, i.name insurer_name, COALESCE(p.coverage_pct, i.coverage_pct) cover FROM clinic_patients p LEFT JOIN clinic_insurers i ON i.id = p.insurer_id`;

export function listPatients(db, companyId, q = {}) {
  const s = `%${str(q.q, 80)}%`;
  const digits = str(q.q, 80).replace(/\D/g, '');
  const rows = db.all(`${patientSql} WHERE p.company_id = ? ${q.all ? '' : "AND p.status = 'active'"} ${q.insurer_id ? 'AND p.insurer_id = ' + Number(q.insurer_id) : ''}
    AND (p.last_name || ' ' || p.first_name LIKE ? OR p.first_name || ' ' || p.last_name LIKE ? OR p.mrn LIKE ? OR p.card_code = ? OR p.insurance_no LIKE ? ${digits.length >= 4 ? `OR replace(p.phone,' ','') LIKE '%${digits}%'` : ''})
    ORDER BY ${q.recent ? 'p.id DESC' : 'p.last_name, p.first_name'} LIMIT ?`, companyId, s, s, s, str(q.q, 40).toUpperCase(), s, Math.min(500, Number(q.limit) || 300));
  const last = db.all(`SELECT patient_id, MAX(arrived_at) at FROM clinic_visits WHERE company_id = ? AND patient_id IN (${rows.map((r) => r.id).join(',') || 0}) GROUP BY patient_id`, companyId);
  const m = new Map(last.map((x) => [x.patient_id, x.at]));
  return rows.map((r) => ({ ...r, age: ageOf(r.birth_date), last_visit: m.get(r.id) || null, portal_token: undefined }));
}

export function getPatient(db, companyId, id) {
  const p = db.get(`${patientSql} WHERE p.id = ? AND p.company_id = ?`, id, companyId);
  if (!p) throw notFound('Patient introuvable');
  return { ...p, age: ageOf(p.birth_date) };
}

const patientVals = (db, companyId, b, cur = {}) => {
  const last = str(b.last_name ?? cur.last_name, 80).toUpperCase(); if (!last) throw bad('last_name', 'Le nom est obligatoire');
  const insurer = b.insurer_id === undefined ? cur.insurer_id : (Number(b.insurer_id) || null);
  if (insurer && !db.get('SELECT 1 FROM clinic_insurers WHERE id = ? AND company_id = ?', insurer, companyId)) throw bad('insurer', 'Assureur introuvable');
  const birth = b.birth_date === undefined ? cur.birth_date : (b.birth_date ? vDate(b.birth_date, 'birth_date') : '');
  if (birth && birth > today()) throw bad('birth_date', 'Date de naissance dans le futur');
  const phone = b.phone === undefined ? cur.phone : (b.phone ? normalizePhone(b.phone) : '');
  const cov = b.coverage_pct === undefined ? (cur.coverage_pct ?? null) : (b.coverage_pct === '' || b.coverage_pct == null ? null : Math.max(0, Math.min(100, Number(b.coverage_pct))));
  return {
    last_name: last, first_name: str(b.first_name ?? cur.first_name, 80), sex: oneOf(b.sex ?? cur.sex ?? 'M', ['M', 'F'], 'sex'), birth_date: birth || '', phone: phone || '', phone2: str(b.phone2 ?? cur.phone2, 30),
    email: str(b.email ?? cur.email, 120), address: str(b.address ?? cur.address, 200), city: str(b.city ?? cur.city, 60), profession: str(b.profession ?? cur.profession, 80),
    blood_group: oneOf(b.blood_group ?? cur.blood_group ?? '', ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 'blood_group'),
    allergies: str(b.allergies ?? cur.allergies, 500), chronic: str(b.chronic ?? cur.chronic, 500), treatments: str(b.treatments ?? cur.treatments, 800),
    pregnant: (b.pregnant ?? cur.pregnant) ? 1 : 0, emergency_name: str(b.emergency_name ?? cur.emergency_name, 120), emergency_phone: str(b.emergency_phone ?? cur.emergency_phone, 30),
    insurer_id: insurer || null, insurance_no: str(b.insurance_no ?? cur.insurance_no, 60), coverage_pct: cov, notes: str(b.notes ?? cur.notes, 2000),
  };
};

/** Finds a likely duplicate (same name and birth date, or same phone and first name). */
export function findDuplicate(db, companyId, v) {
  if (v.birth_date) {
    const d = db.get('SELECT id, mrn, last_name, first_name FROM clinic_patients WHERE company_id = ? AND last_name = ? AND first_name = ? COLLATE NOCASE AND birth_date = ?', companyId, v.last_name, v.first_name, v.birth_date);
    if (d) return d;
  }
  if (v.phone) return db.get('SELECT id, mrn, last_name, first_name FROM clinic_patients WHERE company_id = ? AND phone = ? AND first_name = ? COLLATE NOCASE AND last_name = ?', companyId, v.phone, v.first_name, v.last_name) || null;
  return null;
}

export function createPatient(db, ctx, companyId, b) {
  const v = patientVals(db, companyId, b);
  if (!b.force) { const d = findDuplicate(db, companyId, v); if (d) throw conflict('duplicate_patient', `Ce patient existe déjà : ${d.last_name} ${d.first_name} (${d.mrn})`); }
  const s = settingsOf(db, companyId);
  return db.tx(() => {
    const mrn = nextNumber(db, companyId, `${s.mrn_prefix}${today().slice(2, 4)}`, 5);
    const cols = Object.keys(v);
    const r = db.run(`INSERT INTO clinic_patients (company_id, mrn, ${cols.join(', ')}, portal_token, card_code, created_at) VALUES (?, ?, ${cols.map(() => '?').join(', ')}, ?, ?, ?)`,
      companyId, mrn, ...Object.values(v), token(), shortCode(), now());
    const id = Number(r.lastInsertRowid);
    audit(db, ctx, 'create', 'clinic_patient', id, mrn);
    return getPatient(db, companyId, id);
  });
}

export function updatePatient(db, ctx, companyId, id, b) {
  const cur = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', id, companyId); if (!cur) throw notFound('Patient introuvable');
  const v = patientVals(db, companyId, b, cur);
  const status = oneOf(b.status ?? cur.status, ['active', 'deceased', 'archived'], 'status');
  db.run(`UPDATE clinic_patients SET ${Object.keys(v).map((k) => `${k} = ?`).join(', ')}, status = ? WHERE id = ?`, ...Object.values(v), status, id);
  if (cur.partner_id) db.run('UPDATE partners SET name = ?, phone = ?, email = ? WHERE id = ?', nameOf(v), v.phone, v.email, cur.partner_id);
  audit(db, ctx, 'update', 'clinic_patient', id);
  return getPatient(db, companyId, id);
}

// ---------------- Practitioners ----------------
export function practitioners(db, companyId, { active = true } = {}) {
  return db.all(`SELECT pr.*, u.name, u.email, u.phone, u.role, d.name department_name, d.color department_color FROM clinic_practitioners pr JOIN users u ON u.id = pr.user_id LEFT JOIN clinic_departments d ON d.id = pr.department_id
    WHERE pr.company_id = ? ${active ? 'AND pr.active = 1 AND u.active = 1' : ''} ORDER BY d.position, u.name`, companyId);
}
export const practitionerOf = (db, companyId, userId) => db.get('SELECT * FROM clinic_practitioners WHERE company_id = ? AND user_id = ? AND active = 1', companyId, userId);

export function savePractitioner(db, ctx, b, id) {
  const cid = ctx.user.company_id;
  const cur = id ? db.get('SELECT * FROM clinic_practitioners WHERE id = ? AND company_id = ?', id, cid) : null;
  if (id && !cur) throw notFound();
  const userId = cur?.user_id ?? Number(b.user_id);
  if (!cur && !db.get('SELECT 1 FROM users WHERE id = ? AND company_id = ?', userId, cid)) throw bad('user', 'Choisissez un compte utilisateur');
  const t = (k, d) => { const x = str(b[k] ?? cur?.[k] ?? d, 5); if (!/^\d{2}:\d{2}$/.test(x)) throw bad('time', 'Heure invalide (HH:MM)'); return x; };
  const days = String(b.days ?? cur?.days ?? '1,2,3,4,5').split(',').map((x) => Number(x)).filter((x) => x >= 0 && x <= 6);
  const vals = [str(b.title ?? cur?.title ?? 'Dr', 20), str(b.specialty ?? cur?.specialty ?? 'Médecine générale', 80), Number(b.department_id ?? cur?.department_id) || null, str(b.order_no ?? cur?.order_no, 40),
    int(b.consult_fee ?? cur?.consult_fee ?? 5000, 'consult_fee', { min: 0 }), int(b.tele_fee ?? cur?.tele_fee ?? 5000, 'tele_fee', { min: 0 }), str(b.room ?? cur?.room, 30), str(b.color ?? cur?.color ?? '#6D3BEB', 9),
    [...new Set(days)].join(','), t('start', '08:00'), t('end', '16:00'), (b.online ?? cur?.online ?? 1) ? 1 : 0, (b.tele ?? cur?.tele ?? 1) ? 1 : 0, str(b.bio ?? cur?.bio, 600), (b.active ?? cur?.active ?? 1) ? 1 : 0];
  if (cur) db.run('UPDATE clinic_practitioners SET title = ?, specialty = ?, department_id = ?, order_no = ?, consult_fee = ?, tele_fee = ?, room = ?, color = ?, days = ?, start = ?, end = ?, online = ?, tele = ?, bio = ?, active = ? WHERE id = ?', ...vals, cur.id);
  else id = Number(db.run('INSERT INTO clinic_practitioners (company_id, user_id, title, specialty, department_id, order_no, consult_fee, tele_fee, room, color, days, start, end, online, tele, bio, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', cid, userId, ...vals).lastInsertRowid);
  audit(db, ctx, 'save', 'clinic_practitioner', id ?? cur.id);
  return db.get('SELECT * FROM clinic_practitioners WHERE id = ?', id ?? cur.id);
}

// ---------------- Appointments ----------------
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dow = (d) => new Date(d + 'T12:00:00Z').getUTCDay();

/** Free slots of a practitioner on a day (past slots of today removed). */
export function freeSlots(db, companyId, practitionerId, date) {
  const pr = db.get('SELECT * FROM clinic_practitioners WHERE id = ? AND company_id = ? AND active = 1', practitionerId, companyId);
  if (!pr) return [];
  if (!pr.days.split(',').map(Number).includes(dow(date))) return [];
  const step = settingsOf(db, companyId).slot_minutes || 20;
  const taken = db.all("SELECT time, minutes FROM clinic_appointments WHERE practitioner_id = ? AND date = ? AND status NOT IN ('cancelled','no_show')", pr.id, date);
  const busy = (m) => taken.some((t) => m < toMin(t.time) + t.minutes && m + step > toMin(t.time));
  // Times are local (Cameroon, UTC+1); today's slots start 15 minutes from now.
  const nowMin = date === today() ? new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 60 + 15 : -1;
  const out = [];
  for (let m = toMin(pr.start); m + step <= toMin(pr.end); m += step) if (!busy(m) && m > nowMin) out.push(toTime(m));
  return out;
}

export function appointments(db, companyId, q = {}) {
  const where = ['a.company_id = ?']; const p = [companyId];
  if (q.date) { where.push('a.date = ?'); p.push(q.date); }
  if (q.from) { where.push('a.date >= ?'); p.push(q.from); }
  if (q.to) { where.push('a.date <= ?'); p.push(q.to); }
  if (q.practitioner_id) { where.push('a.practitioner_id = ?'); p.push(Number(q.practitioner_id)); }
  if (q.patient_id) { where.push('a.patient_id = ?'); p.push(Number(q.patient_id)); }
  if (q.status) { where.push('a.status = ?'); p.push(q.status); }
  return db.all(`SELECT a.*, pt.last_name, pt.first_name, pt.mrn, pt.phone, pt.sex, pt.birth_date, u.name practitioner_name, pr.title, pr.color, pr.room, d.name department_name
    FROM clinic_appointments a JOIN clinic_patients pt ON pt.id = a.patient_id LEFT JOIN clinic_practitioners pr ON pr.id = a.practitioner_id LEFT JOIN users u ON u.id = pr.user_id LEFT JOIN clinic_departments d ON d.id = a.department_id
    WHERE ${where.join(' AND ')} ORDER BY a.date, a.time LIMIT ${Math.min(2000, Number(q.limit) || 1000)}`, ...p);
}

export function book(db, ctx, companyId, b, { source = 'staff', checkSlot = false } = {}) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', b.patient_id, companyId); if (!p) throw notFound('Patient introuvable');
  const pr = db.get('SELECT * FROM clinic_practitioners WHERE id = ? AND company_id = ? AND active = 1', b.practitioner_id, companyId); if (!pr) throw bad('practitioner', 'Choisissez un praticien');
  const date = vDate(b.date, 'date');
  if (date < today()) throw bad('date', 'Date passée');
  const time = str(b.time, 5); if (!/^\d{2}:\d{2}$/.test(time)) throw bad('time', 'Heure invalide');
  const mode = oneOf(b.mode, ['clinic', 'tele'], 'mode', 'clinic');
  const s = settingsOf(db, companyId);
  if (mode === 'tele' && (!s.tele_enabled || !pr.tele)) throw bad('tele', "La téléconsultation n'est pas proposée pour ce praticien");
  if (checkSlot && !freeSlots(db, companyId, pr.id, date).includes(time)) throw conflict('slot_taken', 'Ce créneau vient d\'être pris : choisissez-en un autre');
  const clash = db.get("SELECT 1 FROM clinic_appointments WHERE practitioner_id = ? AND date = ? AND time = ? AND status NOT IN ('cancelled','no_show')", pr.id, date, time);
  if (clash) throw conflict('slot_taken', 'Ce créneau est déjà réservé');
  const code = shortCode();
  return db.tx(() => {
    const id = Number(db.run(`INSERT INTO clinic_appointments (company_id, code, patient_id, practitioner_id, department_id, date, time, minutes, mode, reason, status, source, tele_room, created_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, companyId, code, p.id, pr.id, pr.department_id, date, time, int(b.minutes, 'minutes', { min: 5, def: s.slot_minutes }), mode, str(b.reason, 300),
    source === 'staff' ? 'confirmed' : 'booked', source, mode === 'tele' ? `Teknons-${token(9).replace(/[^A-Za-z0-9]/g, '')}` : '', ctx.user?.id ?? null, now()).lastInsertRowid);
    // A teleconsultation is paid before it starts: its invoice is ready for the portal.
    if (mode === 'tele') {
      const tariff = db.get("SELECT id FROM clinic_tariffs WHERE company_id = ? AND code = 'CS-T'", companyId);
      addCharge(db, sys(ctx), companyId, { patient_id: p.id, appointment_id: id, tariff_id: tariff?.id, source: 'consult', description: `Téléconsultation ${pr.title || 'Dr'} – ${date.split('-').reverse().join('/')} ${time}`, unit_price: pr.tele_fee });
      const bill = billPatient(db, sys(ctx), db.get('SELECT * FROM companies WHERE id = ?', companyId), p.id);
      if (bill?.document_id) db.run('UPDATE clinic_appointments SET document_id = ? WHERE id = ?', bill.document_id, id);
    }
    if (ctx.user?.id) audit(db, ctx, 'book', 'clinic_appointment', id, `${date} ${time}`);
    return appointments(db, companyId, { patient_id: p.id }).find((a) => a.id === id);
  });
}

export function setAppointmentStatus(db, ctx, companyId, id, status) {
  const a = db.get('SELECT * FROM clinic_appointments WHERE id = ? AND company_id = ?', id, companyId); if (!a) throw notFound();
  status = oneOf(status, ['booked', 'confirmed', 'cancelled', 'no_show'], 'status');
  if (['arrived', 'done'].includes(a.status)) throw conflict('state', 'Ce rendez-vous a déjà eu lieu');
  db.run('UPDATE clinic_appointments SET status = ? WHERE id = ?', status, a.id);
  if (status === 'cancelled') db.run("UPDATE clinic_charges SET status = 'cancelled' WHERE appointment_id = ? AND status = 'pending'", a.id);
  audit(db, ctx, status, 'clinic_appointment', a.id);
  return db.get('SELECT * FROM clinic_appointments WHERE id = ?', a.id);
}

// ---------------- Arrival and queue ----------------
/**
 * The patient arrives (with or without an appointment): opens a visit in the
 * practitioner's queue, adds the consultation fee, and returns the ticket number.
 */
export function checkIn(db, bus, ctx, company, b) {
  const companyId = company.id;
  let appt = null;
  if (b.appointment_id) {
    appt = db.get('SELECT * FROM clinic_appointments WHERE id = ? AND company_id = ?', b.appointment_id, companyId);
    if (!appt) throw notFound('Rendez-vous introuvable');
    if (appt.visit_id) throw conflict('already', 'Ce patient est déjà enregistré');
  }
  const patientId = appt?.patient_id ?? Number(b.patient_id);
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId); if (!p) throw notFound('Patient introuvable');
  if (p.status === 'deceased') throw conflict('deceased', 'Dossier clos (patient décédé)');
  const kind = oneOf(b.kind ?? (appt?.mode === 'tele' ? 'tele' : 'consult'), ['consult', 'emergency', 'tele', 'followup', 'antenatal', 'care'], 'kind');
  const prId = Number(b.practitioner_id ?? appt?.practitioner_id) || null;
  const pr = prId ? db.get('SELECT * FROM clinic_practitioners WHERE id = ? AND company_id = ?', prId, companyId) : null;
  if (prId && !pr) throw bad('practitioner', 'Praticien introuvable');
  const open = db.get("SELECT id FROM clinic_visits WHERE patient_id = ? AND status IN ('waiting','in_consult') AND substr(arrived_at,1,10) = ?", p.id, today());
  if (open && !b.force) throw conflict('open_visit', 'Ce patient est déjà dans la file d\'attente aujourd\'hui');
  const priority = kind === 'emergency' ? Math.min(3, int(b.priority, 'priority', { min: 1, def: 2 })) : int(b.priority, 'priority', { min: 1, def: 4 });
  return db.tx(() => {
    const qn = (db.get("SELECT MAX(queue_no) n FROM clinic_visits WHERE company_id = ? AND substr(arrived_at,1,10) = ?", companyId, today()).n || 0) + 1;
    const number = nextNumber(db, companyId, `CS-${today().slice(0, 4)}`, 5);
    const vid = Number(db.run(`INSERT INTO clinic_visits (company_id, number, patient_id, practitioner_id, department_id, appointment_id, kind, queue_no, priority, arrived_at, complaint, created_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, companyId, number, p.id, pr?.id ?? null, Number(b.department_id) || pr?.department_id || null, appt?.id ?? null, kind, qn, Math.max(1, Math.min(5, priority)), now(),
    str(b.complaint ?? appt?.reason, 500), ctx.user.id, now()).lastInsertRowid);
    if (appt) db.run("UPDATE clinic_appointments SET status = 'arrived', visit_id = ? WHERE id = ?", vid, appt.id);
    // Consultation fee (already billed for a paid teleconsultation)
    const prepaid = appt && db.get("SELECT 1 FROM clinic_charges WHERE appointment_id = ? AND status != 'cancelled'", appt.id);
    if (prepaid) db.run('UPDATE clinic_charges SET visit_id = ? WHERE appointment_id = ?', vid, appt.id);
    else if (b.fee !== false && kind !== 'care') {
      const code = kind === 'emergency' ? 'CS-U' : kind === 'followup' ? 'CS-C' : kind === 'antenatal' ? 'CPN' : kind === 'tele' ? 'CS-T' : pr && pr.consult_fee >= 10000 ? 'CS-S' : 'CS-G';
      const tariff = db.get('SELECT * FROM clinic_tariffs WHERE company_id = ? AND code = ? AND active = 1', companyId, code);
      const price = b.fee_amount !== undefined && b.fee_amount !== '' ? int(b.fee_amount, 'fee_amount', { min: 0 }) : kind === 'consult' && pr ? pr.consult_fee : kind === 'tele' && pr ? pr.tele_fee : tariff?.price ?? 0;
      if (price > 0) addCharge(db, sys(ctx), companyId, { patient_id: p.id, visit_id: vid, tariff_id: tariff?.id, source: 'consult', description: `${tariff?.name || 'Consultation'}${pr ? ` – ${pr.title} ${db.get('SELECT name FROM users WHERE id = ?', pr.user_id).name}` : ''}`, unit_price: price });
    }
    audit(db, ctx, 'check_in', 'clinic_visit', vid, `${number} n°${qn}`);
    bus?.emit(companyId, 'change', { entity: 'clinic_queue', id: vid });
    return { ...visitRow(db, vid), ticket: qn };
  });
}

export const visitRow = (db, id) => db.get(`SELECT v.*, p.mrn, p.last_name, p.first_name, p.sex, p.birth_date, p.allergies, p.phone, u.name practitioner_name, pr.title, pr.room, d.name department_name
  FROM clinic_visits v JOIN clinic_patients p ON p.id = v.patient_id LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id LEFT JOIN clinic_departments d ON d.id = v.department_id WHERE v.id = ?`, id);

/** Today's queue, ordered by triage then arrival. Each row says if the fee is paid. */
export function queue(db, companyId, { practitioner_id, all } = {}) {
  const rows = db.all(`SELECT v.*, p.mrn, p.last_name, p.first_name, p.sex, p.birth_date, p.allergies, u.name practitioner_name, pr.title, pr.room, d.name department_name,
      (SELECT COALESCE(SUM(c.patient_amount),0) FROM clinic_charges c WHERE c.visit_id = v.id AND c.status = 'pending') unpaid_pending,
      (SELECT COALESCE(SUM(dd.total - dd.paid - dd.credited),0) FROM clinic_charges c JOIN documents dd ON dd.id = c.document_id WHERE c.visit_id = v.id AND dd.status IN ('open','partial')) unpaid_open
    FROM clinic_visits v JOIN clinic_patients p ON p.id = v.patient_id LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id LEFT JOIN clinic_departments d ON d.id = v.department_id
    WHERE v.company_id = ? AND ${all ? "substr(v.arrived_at,1,10) = ?" : "(v.status IN ('waiting','in_consult') OR (v.status = 'done' AND substr(v.ended_at,1,10) = ?))"}
    ${practitioner_id ? 'AND (v.practitioner_id = ' + Number(practitioner_id) + ' OR v.practitioner_id IS NULL)' : ''}
    ORDER BY CASE v.status WHEN 'in_consult' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END, v.priority, v.arrived_at`, companyId, today());
  const t = Date.now();
  return rows.map((r) => ({ ...r, age: ageOf(r.birth_date), wait_min: Math.round(((r.started_at ? Date.parse(r.started_at) : t) - Date.parse(r.arrived_at)) / 60e3), unpaid: r.unpaid_pending + r.unpaid_open, vitals: JSON.parse(r.vitals || '{}') }));
}

/** Calls the next patient (or a given one) to the practitioner's room; the waiting-room screen shows it. */
export function callNext(db, bus, ctx, companyId, { visit_id, practitioner_id }) {
  let v;
  if (visit_id) v = db.get("SELECT * FROM clinic_visits WHERE id = ? AND company_id = ? AND status IN ('waiting','in_consult')", visit_id, companyId);
  else v = db.get(`SELECT * FROM clinic_visits WHERE company_id = ? AND status = 'waiting' AND substr(arrived_at,1,10) = ? AND (practitioner_id = ? OR practitioner_id IS NULL) ORDER BY priority, arrived_at LIMIT 1`, companyId, today(), Number(practitioner_id) || 0);
  if (!v) throw conflict('empty', 'Personne en attente');
  const pr = practitionerOf(db, companyId, ctx.user.id);
  db.run('UPDATE clinic_visits SET called_at = ?, practitioner_id = COALESCE(practitioner_id, ?) WHERE id = ?', now(), pr?.id ?? null, v.id);
  const row = visitRow(db, v.id);
  bus?.emit(companyId, 'display', { kind: 'clinic_call', ticket: v.queue_no, room: row.room || '', practitioner: row.practitioner_name ? `${row.title || ''} ${row.practitioner_name}`.trim() : '', initials: `${row.last_name[0] || ''}. ${row.first_name || ''}`.trim() });
  bus?.emit(companyId, 'change', { entity: 'clinic_queue', id: v.id });
  return row;
}

/** Waiting-room screen data: last calls and how many are waiting. Names are shortened. */
export function display(db, companyId) {
  const called = db.all(`SELECT v.queue_no, v.called_at, v.status, p.last_name, p.first_name, pr.room, pr.title, u.name practitioner_name FROM clinic_visits v JOIN clinic_patients p ON p.id = v.patient_id
    LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id
    WHERE v.company_id = ? AND v.called_at IS NOT NULL AND substr(v.arrived_at,1,10) = ? ORDER BY v.called_at DESC LIMIT 6`, companyId, today());
  const waiting = db.get("SELECT COUNT(*) n, MIN(arrived_at) first FROM clinic_visits WHERE company_id = ? AND status = 'waiting' AND substr(arrived_at,1,10) = ?", companyId, today());
  const done = db.all("SELECT (julianday(started_at) - julianday(arrived_at)) * 1440 w FROM clinic_visits WHERE company_id = ? AND started_at IS NOT NULL AND substr(arrived_at,1,10) = ?", companyId, today());
  return {
    calls: called.map((c) => ({ ticket: c.queue_no, at: c.called_at, room: c.room || '', practitioner: c.practitioner_name ? `${c.title || ''} ${c.practitioner_name}`.trim() : '', who: `${(c.first_name || '').split(' ')[0]} ${c.last_name[0] || ''}.`.trim() })),
    waiting: waiting.n, avg_wait: done.length ? Math.round(done.reduce((s, x) => s + x.w, 0) / done.length) : null,
  };
}

