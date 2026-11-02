// The clinical side: the consultation (vitals with NEWS2, history, examination,
// ICD-10 diagnosis, plan), e-prescriptions checked against allergies,
// interactions and pregnancy, lab and imaging orders and their results with
// flags and critical-value alerts, admissions, the nursing chart and
// discharge, vaccinations, certificates, secure messages, the patient
// timeline and an HL7 FHIR R4 export of the record.
import { bad, notFound, conflict, forbidden } from '../../core/errors.js';
import { str, int, num, oneOf, date as vDate } from '../../core/validate.js';
import { now, today } from '../../core/schema.js';
import { audit, raiseAlert } from '../../core/alerts.js';
import { nextNumber } from '../accounting/ledger.js';
import { shortCode, nameOf, ageOf } from './schema.js';
import { ICD, checkPrescription, news2, bmi, flagResults } from './ref.js';
import { addCharge, sys } from './billing.js';
import { visitRow, practitionerOf } from './patients.js';

const J = (s, d) => { try { return JSON.parse(s || ''); } catch { return d; } };
const VITALS = ['bp_sys', 'bp_dia', 'pulse', 'temp', 'resp', 'spo2', 'weight', 'height', 'glucose', 'pain', 'muac'];

export function cleanVitals(v = {}) {
  const out = {};
  for (const k of VITALS) {
    if (v[k] === undefined || v[k] === null || v[k] === '') continue;
    const x = Number(String(v[k]).replace(',', '.'));
    if (Number.isNaN(x) || x < 0 || x > 400) throw bad('vitals', `Constante invalide : ${k}`);
    out[k] = x;
  }
  if (v.avpu) out.avpu = oneOf(v.avpu, ['A', 'V', 'P', 'U'], 'avpu');
  if (v.o2) out.o2 = 1;
  const b = bmi(out); if (b) out.bmi = b;
  return out;
}

// ---------------- Visits ----------------
export function visitDetail(db, ctx, companyId, id) {
  const v = visitRow(db, id);
  if (!v || v.company_id !== companyId) throw notFound('Consultation introuvable');
  const p = db.get('SELECT p.*, i.name insurer_name FROM clinic_patients p LEFT JOIN clinic_insurers i ON i.id = p.insurer_id WHERE p.id = ?', v.patient_id);
  return {
    ...v, vitals: J(v.vitals, {}), icd: J(v.icd, []).map((c) => ICD[c] || { code: c, fr: c, en: c }),
    patient: { ...p, age: ageOf(p.birth_date), portal_token: undefined },
    prescriptions: prescriptionsOf(db, companyId, { visit_id: v.id }),
    orders: ordersOf(db, companyId, { visit_id: v.id }),
    charges: db.all('SELECT * FROM clinic_charges WHERE visit_id = ? AND status != \'cancelled\' ORDER BY id', v.id),
    certificates: db.all('SELECT * FROM clinic_certificates WHERE visit_id = ? ORDER BY id DESC', v.id),
    admission: db.get('SELECT id, number, status FROM clinic_admissions WHERE visit_id = ?', v.id) || null,
    history: db.all(`SELECT v.id, v.number, v.arrived_at, v.kind, v.diagnosis, v.icd, v.vitals, u.name practitioner_name FROM clinic_visits v LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id
      WHERE v.patient_id = ? AND v.id != ? AND v.status = 'done' ORDER BY v.arrived_at DESC LIMIT 8`, v.patient_id, v.id).map((h) => ({ ...h, icd: J(h.icd, []), vitals: J(h.vitals, {}) })),
    recent_results: ordersOf(db, companyId, { patient_id: v.patient_id, status: 'validated', limit: 6 }).filter((o) => o.visit_id !== v.id),
    active_rx: activeTreatments(db, v.patient_id),
  };
}

/** Saves the triage or the consultation note (partial updates allowed). */
export function saveVisit(db, bus, ctx, companyId, id, b) {
  const v = db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', id, companyId); if (!v) throw notFound();
  if (v.signed_at && !['owner', 'admin'].includes(ctx.user.role)) throw conflict('signed', 'Consultation signée : ajoutez une note complémentaire');
  const vitals = b.vitals !== undefined ? { ...J(v.vitals, {}), ...cleanVitals(b.vitals) } : J(v.vitals, {});
  const n = news2(vitals);
  const icd = Array.isArray(b.icd) ? [...new Set(b.icd.map((c) => str(c, 10)).filter(Boolean))].slice(0, 8) : J(v.icd, []);
  const status = b.status ? oneOf(b.status, ['waiting', 'in_consult'], 'status') : v.status;
  db.run(`UPDATE clinic_visits SET vitals = ?, news = ?, complaint = ?, history = ?, exam = ?, diagnosis = ?, icd = ?, plan = ?, notes = ?, follow_up = ?, priority = ?, status = ?,
    started_at = COALESCE(started_at, CASE WHEN ? = 'in_consult' THEN ? END), practitioner_id = COALESCE(practitioner_id, ?) WHERE id = ?`,
  JSON.stringify(vitals), n?.score ?? null, str(b.complaint ?? v.complaint, 1000), str(b.history ?? v.history, 4000), str(b.exam ?? v.exam, 4000), str(b.diagnosis ?? v.diagnosis, 1000),
  JSON.stringify(icd), str(b.plan ?? v.plan, 4000), str(b.notes ?? v.notes, 4000), b.follow_up === undefined ? v.follow_up : (b.follow_up ? vDate(b.follow_up, 'follow_up') : ''),
  b.priority === undefined ? v.priority : Math.max(1, Math.min(5, int(b.priority, 'priority', { min: 1 }))), status, status, now(), practitionerOf(db, companyId, ctx.user.id)?.id ?? null, v.id);
  if (n && n.level === 'high' && (v.news ?? 0) < 7) raiseAlert(db, bus, companyId, { kind: 'clinic_news', level: 'danger', title: `NEWS2 ${n.score} : patient à risque`, body: `${visitRow(db, v.id).last_name} (consultation ${v.number}) : appelez le médecin immédiatement.`, entity: 'clinic_visit', entity_id: v.id });
  bus?.emit(companyId, 'change', { entity: 'clinic_visit', id: v.id });
  return visitDetail(db, ctx, companyId, v.id);
}

/** Ends and signs the consultation. A follow-up date books nothing by itself; the desk does. */
export function closeVisit(db, bus, ctx, companyId, id, b = {}) {
  const v = db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', id, companyId); if (!v) throw notFound();
  if (v.status === 'done') throw conflict('done', 'Consultation déjà terminée');
  if (b.note !== undefined || b.diagnosis !== undefined) saveVisit(db, bus, ctx, companyId, id, b);
  const fresh = db.get('SELECT * FROM clinic_visits WHERE id = ?', id);
  if (!fresh.diagnosis && !J(fresh.icd, []).length && v.kind !== 'care') throw bad('diagnosis', 'Indiquez un diagnostic (texte ou code CIM-10) avant de clôturer');
  db.run("UPDATE clinic_visits SET status = 'done', started_at = COALESCE(started_at, ?), ended_at = ?, signed_at = ?, signed_by = ? WHERE id = ?", now(), now(), now(), ctx.user.id, id);
  if (v.appointment_id) db.run("UPDATE clinic_appointments SET status = 'done' WHERE id = ?", v.appointment_id);
  audit(db, ctx, 'sign', 'clinic_visit', id, v.number);
  bus?.emit(companyId, 'change', { entity: 'clinic_queue', id });
  return visitDetail(db, ctx, companyId, id);
}

export function cancelVisit(db, bus, ctx, companyId, id) {
  const v = db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', id, companyId); if (!v) throw notFound();
  if (v.status === 'done') throw conflict('done', 'Consultation terminée : elle ne peut plus être annulée');
  if (db.get("SELECT 1 FROM clinic_charges WHERE visit_id = ? AND status = 'billed'", id)) throw conflict('billed', 'Des prestations sont déjà facturées : faites un avoir');
  db.run("UPDATE clinic_visits SET status = 'cancelled', ended_at = ? WHERE id = ?", now(), id);
  db.run("UPDATE clinic_charges SET status = 'cancelled' WHERE visit_id = ? AND status = 'pending'", id);
  if (v.appointment_id) db.run("UPDATE clinic_appointments SET status = 'confirmed', visit_id = NULL WHERE id = ?", v.appointment_id);
  audit(db, ctx, 'cancel', 'clinic_visit', id, v.number);
  bus?.emit(companyId, 'change', { entity: 'clinic_queue', id });
  return { ok: true };
}

// ---------------- Prescriptions ----------------
export function activeTreatments(db, patientId) {
  return db.all(`SELECT l.name, d.dci, d.classes, l.dose, l.frequency, l.duration, r.created_at FROM clinic_rx_lines l JOIN clinic_prescriptions r ON r.id = l.prescription_id LEFT JOIN clinic_drugs d ON d.id = l.drug_id
    WHERE r.patient_id = ? AND r.status != 'cancelled' AND r.created_at >= ? ORDER BY r.id DESC LIMIT 30`, patientId, new Date(Date.now() - 30 * 864e5).toISOString());
}

/** Checks lines before saving (the screen calls this live). */
export function rxCheck(db, companyId, patientId, lines, { exclude } = {}) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId); if (!p) throw notFound('Patient introuvable');
  const full = (lines || []).map((l) => {
    const d = l.drug_id ? db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ?', l.drug_id, companyId) : null;
    return { name: d?.name || str(l.name, 120), dci: d?.dci || '', classes: d?.classes || '' };
  }).filter((l) => l.name);
  const current = activeTreatments(db, p.id).filter((c) => !exclude || c.created_at < exclude).map((c) => ({ name: c.name, dci: c.dci, classes: c.classes }));
  const fromFile = String(p.treatments || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((name) => {
    const d = db.get('SELECT * FROM clinic_drugs WHERE company_id = ? AND (name LIKE ? OR dci LIKE ?) LIMIT 1', companyId, `%${name}%`, `%${name.split(' ')[0]}%`);
    return d ? { name: d.name, dci: d.dci, classes: d.classes } : null;
  }).filter(Boolean);
  return checkPrescription(full, { allergies: p.allergies || '', current: [...current, ...fromFile], pregnant: !!p.pregnant });
}

export function createPrescription(db, bus, ctx, companyId, b) {
  const v = b.visit_id ? db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', b.visit_id, companyId) : null;
  const adm = b.admission_id ? db.get('SELECT * FROM clinic_admissions WHERE id = ? AND company_id = ?', b.admission_id, companyId) : null;
  const patientId = v?.patient_id ?? adm?.patient_id ?? Number(b.patient_id);
  if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId)) throw notFound('Patient introuvable');
  const lines = (Array.isArray(b.lines) ? b.lines : []).map((l, i) => {
    const d = l.drug_id ? db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ?', l.drug_id, companyId) : null;
    if (l.drug_id && !d) throw bad('drug', `Ligne ${i + 1} : médicament introuvable`);
    const name = d?.name || str(l.name, 160); if (!name) throw bad('name', `Ligne ${i + 1} : médicament obligatoire`);
    return { drug_id: d?.id ?? null, name, dose: str(l.dose, 60), frequency: str(l.frequency, 80), duration: str(l.duration, 40), route: str(l.route, 30), qty: num(l.qty, 'qty', { min: 0, def: 1 }), instructions: str(l.instructions, 300) };
  });
  if (!lines.length) throw bad('lines', 'Ajoutez au moins un médicament');
  const alerts = rxCheck(db, companyId, patientId, lines);
  const blocking = alerts.filter((a) => ['allergy', 'major'].includes(a.level));
  if (blocking.length && !b.override) throw conflict('rx_alert', blocking.map((a) => a.fr).join(' · '));
  return db.tx(() => {
    const code = shortCode();
    const pr = practitionerOf(db, companyId, ctx.user.id);
    const id = Number(db.run('INSERT INTO clinic_prescriptions (company_id, code, visit_id, admission_id, patient_id, practitioner_id, notes, alerts, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      companyId, code, v?.id ?? null, adm?.id ?? null, patientId, pr?.id ?? v?.practitioner_id ?? adm?.practitioner_id ?? null, str(b.notes, 1000), JSON.stringify(alerts), ctx.user.id, now()).lastInsertRowid);
    for (const l of lines) db.run('INSERT INTO clinic_rx_lines (prescription_id, drug_id, name, dose, frequency, duration, route, qty, instructions) VALUES (?,?,?,?,?,?,?,?,?)', id, l.drug_id, l.name, l.dose, l.frequency, l.duration, l.route, l.qty, l.instructions);
    audit(db, ctx, 'prescribe', 'clinic_prescription', id, `${lines.length} ligne(s)${blocking.length ? ' – alertes ignorées : ' + blocking.map((a) => a.level).join(',') : ''}`);
    bus?.emit(companyId, 'change', { entity: 'clinic_rx', id });
    return prescriptionsOf(db, companyId, { id })[0];
  });
}

export function prescriptionsOf(db, companyId, q = {}) {
  const where = ['r.company_id = ?']; const p = [companyId];
  if (q.id) { where.push('r.id = ?'); p.push(q.id); }
  if (q.visit_id) { where.push('r.visit_id = ?'); p.push(q.visit_id); }
  if (q.patient_id) { where.push('r.patient_id = ?'); p.push(q.patient_id); }
  if (q.admission_id) { where.push('r.admission_id = ?'); p.push(q.admission_id); }
  if (q.status) { where.push(`r.status IN (${q.status.split(',').map(() => '?').join(',')})`); p.push(...q.status.split(',')); }
  const rows = db.all(`SELECT r.*, pt.last_name, pt.first_name, pt.mrn, pt.birth_date, pt.sex, pt.allergies, pt.insurer_id, u.name practitioner_name, pr.title, pr.order_no, pr.specialty
    FROM clinic_prescriptions r JOIN clinic_patients pt ON pt.id = r.patient_id LEFT JOIN clinic_practitioners pr ON pr.id = r.practitioner_id LEFT JOIN users u ON u.id = pr.user_id
    WHERE ${where.join(' AND ')} ORDER BY r.id DESC LIMIT ${Math.min(300, Number(q.limit) || 200)}`, ...p);
  return rows.map((r) => ({ ...r, alerts: J(r.alerts, []), lines: db.all('SELECT l.*, d.stock, d.price, d.unit FROM clinic_rx_lines l LEFT JOIN clinic_drugs d ON d.id = l.drug_id WHERE l.prescription_id = ? ORDER BY l.id', r.id) }));
}

// ---------------- Lab and imaging ----------------
export function ordersOf(db, companyId, q = {}) {
  const where = ['o.company_id = ?']; const p = [companyId];
  if (q.id) { where.push('o.id = ?'); p.push(q.id); }
  if (q.visit_id) { where.push('o.visit_id = ?'); p.push(q.visit_id); }
  if (q.patient_id) { where.push('o.patient_id = ?'); p.push(q.patient_id); }
  if (q.admission_id) { where.push('o.admission_id = ?'); p.push(q.admission_id); }
  if (q.kind) { where.push('o.kind = ?'); p.push(q.kind); }
  if (q.status) { where.push(`o.status IN (${q.status.split(',').map(() => '?').join(',')})`); p.push(...q.status.split(',')); }
  if (q.date) { where.push('substr(o.ordered_at,1,10) = ?'); p.push(q.date); }
  const rows = db.all(`SELECT o.*, t.code test_code, t.name test_name, t.params, t.tat_hours, pt.last_name, pt.first_name, pt.mrn, pt.sex, pt.birth_date, u.name practitioner_name, pr.title, vu.name validated_name,
      (SELECT c.status FROM clinic_charges c WHERE c.order_id = o.id AND c.status != 'cancelled' LIMIT 1) charge_status,
      (SELECT d.status FROM clinic_charges c JOIN documents d ON d.id = c.document_id WHERE c.order_id = o.id LIMIT 1) doc_status,
      (SELECT c.patient_amount FROM clinic_charges c WHERE c.order_id = o.id AND c.status != 'cancelled' LIMIT 1) patient_amount
    FROM clinic_orders o JOIN clinic_tariffs t ON t.id = o.tariff_id JOIN clinic_patients pt ON pt.id = o.patient_id LEFT JOIN clinic_practitioners pr ON pr.id = o.practitioner_id LEFT JOIN users u ON u.id = pr.user_id LEFT JOIN users vu ON vu.id = o.validated_by
    WHERE ${where.join(' AND ')} ORDER BY CASE o.priority WHEN 'urgent' THEN 0 ELSE 1 END, o.ordered_at ${q.status && /validated/.test(q.status) && !/ordered/.test(q.status) ? 'DESC' : 'ASC'} LIMIT ${Math.min(500, Number(q.limit) || 300)}`, ...p);
  const t = Date.now();
  return rows.map((o) => ({ ...o, params: J(o.params, []), results: J(o.results, []), age: ageOf(o.birth_date), paid: !o.patient_amount || o.doc_status === 'paid',
    late: !['validated', 'cancelled'].includes(o.status) && o.tat_hours > 0 && t - Date.parse(o.ordered_at) > o.tat_hours * 3600e3 }));
}

/** Orders tests or imaging for a visit or admission; each one is charged. */
export function createOrders(db, bus, ctx, companyId, b) {
  const v = b.visit_id ? db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', b.visit_id, companyId) : null;
  const adm = b.admission_id ? db.get('SELECT * FROM clinic_admissions WHERE id = ? AND company_id = ?', b.admission_id, companyId) : null;
  const patientId = v?.patient_id ?? adm?.patient_id ?? Number(b.patient_id);
  if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId)) throw notFound('Patient introuvable');
  const ids = (Array.isArray(b.tariff_ids) ? b.tariff_ids : [b.tariff_id]).map(Number).filter(Boolean);
  if (!ids.length) throw bad('tests', 'Choisissez au moins un examen');
  const pr = practitionerOf(db, companyId, ctx.user.id);
  return db.tx(() => ids.map((tid) => {
    const t = db.get("SELECT * FROM clinic_tariffs WHERE id = ? AND company_id = ? AND kind IN ('lab','imaging') AND active = 1", tid, companyId);
    if (!t) throw bad('test', 'Examen introuvable');
    const number = nextNumber(db, companyId, `${t.kind === 'lab' ? 'LAB' : 'IMG'}-${today().slice(2, 4)}`, 5);
    const id = Number(db.run(`INSERT INTO clinic_orders (company_id, number, code, visit_id, admission_id, patient_id, practitioner_id, tariff_id, kind, priority, clinical_info, ordered_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      companyId, number, shortCode(), v?.id ?? null, adm?.id ?? null, patientId, pr?.id ?? v?.practitioner_id ?? null, t.id, t.kind, oneOf(b.priority, ['routine', 'urgent'], 'priority', 'routine'), str(b.clinical_info, 500), now(), ctx.user.id).lastInsertRowid);
    if (b.charge !== false) addCharge(db, sys(ctx), companyId, { patient_id: patientId, visit_id: v?.id, admission_id: adm?.id, order_id: id, tariff_id: t.id, source: t.kind });
    bus?.emit(companyId, 'change', { entity: 'clinic_order', id });
    return ordersOf(db, companyId, { id })[0];
  }));
}

export function sampleOrder(db, bus, ctx, companyId, id) {
  const o = db.get('SELECT * FROM clinic_orders WHERE id = ? AND company_id = ?', id, companyId); if (!o) throw notFound();
  if (o.status !== 'ordered') throw conflict('state', 'Prélèvement déjà fait');
  db.run("UPDATE clinic_orders SET status = 'sampled', sampled_at = ? WHERE id = ?", now(), id);
  bus?.emit(companyId, 'change', { entity: 'clinic_order', id });
  return ordersOf(db, companyId, { id })[0];
}

/** Enters results (lab parameters are flagged against their ranges) and optionally validates them. */
export function saveResults(db, bus, ctx, companyId, id, b) {
  const o = db.get('SELECT o.*, t.params, t.name test_name FROM clinic_orders o JOIN clinic_tariffs t ON t.id = o.tariff_id WHERE o.id = ? AND o.company_id = ?', id, companyId); if (!o) throw notFound();
  if (o.status === 'validated' && !['owner', 'admin'].includes(ctx.user.role)) throw conflict('validated', 'Résultat déjà validé');
  if (o.status === 'cancelled') throw conflict('cancelled', 'Examen annulé');
  const params = J(o.params, []);
  const results = params.length ? flagResults(params, b.values || {}) : [];
  const critical = results.some((r) => ['LL', 'HH'].includes(r.flag)) || !!b.critical;
  const abnormal = critical || results.some((r) => r.flag);
  const validate = !!b.validate;
  if (validate && params.length && !results.some((r) => r.value !== '')) throw bad('results', 'Saisissez au moins un résultat');
  if (validate && !params.length && !str(b.conclusion ?? o.conclusion, 10)) throw bad('conclusion', 'Rédigez le compte rendu');
  db.run(`UPDATE clinic_orders SET results = ?, conclusion = ?, critical = ?, abnormal = ?, status = ?, sampled_at = COALESCE(sampled_at, ?), done_at = COALESCE(done_at, ?), done_by = COALESCE(done_by, ?),
    validated_at = ?, validated_by = ? WHERE id = ?`, JSON.stringify(results), str(b.conclusion ?? o.conclusion, 6000), critical ? 1 : 0, abnormal ? 1 : 0, validate ? 'validated' : 'done', now(), now(), ctx.user.id,
  validate ? now() : null, validate ? ctx.user.id : null, id);
  const p = db.get('SELECT last_name, first_name FROM clinic_patients WHERE id = ?', o.patient_id);
  if (validate && critical) raiseAlert(db, bus, companyId, { kind: 'clinic_critical', level: 'danger', title: `Valeur critique : ${o.test_name}`, body: `${nameOf(p)} (${o.number}) : ${results.filter((r) => ['LL', 'HH'].includes(r.flag)).map((r) => `${r.label} ${r.value} ${r.unit || ''}`).join(', ') || 'voir le compte rendu'}. Prévenez le médecin.`, entity: 'clinic_order', entity_id: id });
  audit(db, ctx, validate ? 'validate' : 'result', 'clinic_order', id, o.number);
  bus?.emit(companyId, 'change', { entity: 'clinic_order', id });
  return ordersOf(db, companyId, { id })[0];
}

export function cancelOrder(db, bus, ctx, companyId, id) {
  const o = db.get('SELECT * FROM clinic_orders WHERE id = ? AND company_id = ?', id, companyId); if (!o) throw notFound();
  if (['done', 'validated'].includes(o.status)) throw conflict('state', 'Résultat déjà rendu');
  db.run("UPDATE clinic_orders SET status = 'cancelled' WHERE id = ?", id);
  db.run("UPDATE clinic_charges SET status = 'cancelled' WHERE order_id = ? AND status = 'pending'", id);
  audit(db, ctx, 'cancel', 'clinic_order', id, o.number);
  bus?.emit(companyId, 'change', { entity: 'clinic_order', id });
  return { ok: true };
}

// ---------------- Wards ----------------
export function beds(db, companyId) {
  return db.all(`SELECT b.*, a.id admission_id, a.number admission_number, a.admitted_at, a.expected_out, a.reason, p.id patient_id, p.last_name, p.first_name, p.sex, p.birth_date, u.name practitioner_name,
      (SELECT news FROM clinic_care c WHERE c.admission_id = a.id AND c.kind = 'vitals' ORDER BY c.id DESC LIMIT 1) last_news,
      (SELECT COUNT(*) FROM clinic_care c WHERE c.admission_id = a.id AND c.status = 'planned' AND c.planned_at <= ?) due
    FROM clinic_beds b LEFT JOIN clinic_admissions a ON a.bed_id = b.id AND a.status = 'admitted' LEFT JOIN clinic_patients p ON p.id = a.patient_id
    LEFT JOIN clinic_practitioners pr ON pr.id = a.practitioner_id LEFT JOIN users u ON u.id = pr.user_id
    WHERE b.company_id = ? AND b.active = 1 ORDER BY b.position, b.id`, new Date(Date.now() + 30 * 60e3).toISOString(), companyId).map((b) => ({ ...b, age: ageOf(b.birth_date) }));
}

export function admit(db, bus, ctx, companyId, b) {
  const v = b.visit_id ? db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', b.visit_id, companyId) : null;
  const patientId = v?.patient_id ?? Number(b.patient_id);
  if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId)) throw notFound('Patient introuvable');
  if (db.get("SELECT 1 FROM clinic_admissions WHERE patient_id = ? AND status = 'admitted'", patientId)) throw conflict('admitted', 'Ce patient est déjà hospitalisé');
  const bed = db.get('SELECT * FROM clinic_beds WHERE id = ? AND company_id = ? AND active = 1', b.bed_id, companyId); if (!bed) throw bad('bed', 'Choisissez un lit');
  if (bed.status !== 'free') throw conflict('bed_busy', `Le lit ${bed.label} n'est pas libre`);
  const pr = Number(b.practitioner_id) || v?.practitioner_id || practitionerOf(db, companyId, ctx.user.id)?.id || null;
  return db.tx(() => {
    const number = nextNumber(db, companyId, `HOS-${today().slice(0, 4)}`, 4);
    const id = Number(db.run('INSERT INTO clinic_admissions (company_id, number, patient_id, bed_id, practitioner_id, visit_id, reason, diagnosis, icd, admitted_at, expected_out, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      companyId, number, patientId, bed.id, pr, v?.id ?? null, str(b.reason, 500), str(b.diagnosis ?? v?.diagnosis, 1000), v?.icd || '[]', b.admitted_at ? new Date(b.admitted_at).toISOString() : now(),
      b.expected_out ? vDate(b.expected_out, 'expected_out') : '', ctx.user.id).lastInsertRowid);
    db.run("UPDATE clinic_beds SET status = 'occupied' WHERE id = ?", bed.id);
    audit(db, ctx, 'admit', 'clinic_admission', id, `${number} lit ${bed.label}`);
    bus?.emit(companyId, 'change', { entity: 'clinic_bed', id: bed.id });
    return admissionDetail(db, companyId, id);
  });
}

export function admissionDetail(db, companyId, id) {
  const a = db.get(`SELECT a.*, b.label bed_label, b.ward, b.room, b.daily_rate, b.kind bed_kind, u.name practitioner_name, pr.title FROM clinic_admissions a LEFT JOIN clinic_beds b ON b.id = a.bed_id
    LEFT JOIN clinic_practitioners pr ON pr.id = a.practitioner_id LEFT JOIN users u ON u.id = pr.user_id WHERE a.id = ? AND a.company_id = ?`, id, companyId);
  if (!a) throw notFound('Hospitalisation introuvable');
  const p = db.get('SELECT p.*, i.name insurer_name FROM clinic_patients p LEFT JOIN clinic_insurers i ON i.id = p.insurer_id WHERE p.id = ?', a.patient_id);
  const care = db.all('SELECT c.*, u.name user_name FROM clinic_care c LEFT JOIN users u ON u.id = c.user_id WHERE c.admission_id = ? ORDER BY COALESCE(c.done_at, c.planned_at, c.created_at) DESC, c.id DESC LIMIT 300', id).map((c) => ({ ...c, vitals: J(c.vitals, {}) }));
  const nights = nightsOf(a);
  return { ...a, icd: J(a.icd, []).map((c) => ICD[c] || { code: c, fr: c, en: c }), patient: { ...p, age: ageOf(p.birth_date), portal_token: undefined }, care, nights,
    prescriptions: prescriptionsOf(db, companyId, { admission_id: id }), orders: ordersOf(db, companyId, { admission_id: id }),
    charges: db.all("SELECT * FROM clinic_charges WHERE (admission_id = ? OR (visit_id = ? AND visit_id IS NOT NULL)) AND status != 'cancelled' ORDER BY id", id, a.visit_id ?? -1),
    bed_estimate: nights * (a.daily_rate || 0) };
}
const nightsOf = (a) => Math.max(1, Math.round((Date.parse((a.discharged_at || now()).slice(0, 10)) - Date.parse(a.admitted_at.slice(0, 10))) / 864e5));

/** Nursing chart: vitals round, medication given, care done, or a note; can be planned ahead. */
export function addCare(db, bus, ctx, companyId, admissionId, b) {
  const a = db.get("SELECT * FROM clinic_admissions WHERE id = ? AND company_id = ?", admissionId, companyId); if (!a) throw notFound();
  if (a.status !== 'admitted') throw conflict('discharged', 'Patient sorti');
  const kind = oneOf(b.kind, ['vitals', 'med', 'care', 'note'], 'kind', 'note');
  const vitals = kind === 'vitals' ? cleanVitals(b.vitals || {}) : {};
  const n = kind === 'vitals' ? news2(vitals) : null;
  const planned = b.planned_at ? new Date(b.planned_at).toISOString() : null;
  const status = planned && !b.done ? 'planned' : 'done';
  const label = str(b.label, 200);
  if (kind !== 'vitals' && !label && !str(b.note, 10)) throw bad('label', 'Précisez le soin ou la note');
  const id = Number(db.run('INSERT INTO clinic_care (company_id, admission_id, kind, label, drug_id, planned_at, done_at, status, vitals, news, note, user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    companyId, a.id, kind, label, Number(b.drug_id) || null, planned, status === 'done' ? now() : null, status, JSON.stringify(vitals), n?.score ?? null, str(b.note, 2000), ctx.user.id, now()).lastInsertRowid);
  // Planned doses repeat every N hours for D days.
  if (planned && Number(b.every_hours) > 0 && Number(b.days) > 0) {
    const step = Number(b.every_hours) * 3600e3; const end = Date.parse(planned) + Number(b.days) * 864e5;
    for (let t = Date.parse(planned) + step; t < end && t - Date.parse(planned) < 14 * 864e5; t += step) {
      db.run("INSERT INTO clinic_care (company_id, admission_id, kind, label, drug_id, planned_at, status, note, user_id, created_at) VALUES (?,?,?,?,?,?,'planned',?,?,?)", companyId, a.id, kind, label, Number(b.drug_id) || null, new Date(t).toISOString(), str(b.note, 2000), ctx.user.id, now());
    }
  }
  if (n && n.level === 'high') {
    const p = db.get('SELECT last_name, first_name FROM clinic_patients WHERE id = ?', a.patient_id);
    const bed = db.get('SELECT label FROM clinic_beds WHERE id = ?', a.bed_id);
    raiseAlert(db, bus, companyId, { kind: 'clinic_news_ward', level: 'danger', title: `NEWS2 ${n.score} – lit ${bed?.label || ''}`, body: `${nameOf(p)} : appel du médecin de garde.`, entity: 'clinic_admission', entity_id: a.id });
  }
  bus?.emit(companyId, 'change', { entity: 'clinic_care', id: a.id });
  return db.get('SELECT * FROM clinic_care WHERE id = ?', id);
}

export function markCare(db, bus, ctx, companyId, careId, b) {
  const c = db.get('SELECT c.* FROM clinic_care c WHERE c.id = ? AND c.company_id = ?', careId, companyId); if (!c) throw notFound();
  const status = oneOf(b.status, ['done', 'missed'], 'status', 'done');
  db.run('UPDATE clinic_care SET status = ?, done_at = ?, user_id = ?, note = ? WHERE id = ?', status, now(), ctx.user.id, str(b.note ?? c.note, 2000), c.id);
  bus?.emit(companyId, 'change', { entity: 'clinic_care', id: c.admission_id });
  return db.get('SELECT * FROM clinic_care WHERE id = ?', c.id);
}

/** Discharge: charges the nights in the bed, frees the bed (to clean), writes the summary. */
export function discharge(db, bus, ctx, companyId, id, b) {
  const a = db.get('SELECT * FROM clinic_admissions WHERE id = ? AND company_id = ?', id, companyId); if (!a) throw notFound();
  if (a.status !== 'admitted') throw conflict('discharged', 'Patient déjà sorti');
  const outcome = oneOf(b.outcome, ['healed', 'improved', 'transferred', 'against_advice', 'deceased'], 'outcome', 'improved');
  const summary = str(b.summary, 8000); if (!summary) throw bad('summary', 'Rédigez le compte rendu de sortie');
  return db.tx(() => {
    const at = now();
    db.run("UPDATE clinic_admissions SET status = 'discharged', discharged_at = ?, outcome = ?, summary = ?, diagnosis = ? WHERE id = ?", at, outcome, summary, str(b.diagnosis ?? a.diagnosis, 1000), a.id);
    const bed = db.get('SELECT * FROM clinic_beds WHERE id = ?', a.bed_id);
    const nights = nightsOf({ ...a, discharged_at: at });
    if (bed && bed.daily_rate > 0 && b.charge !== false) addCharge(db, sys(ctx), companyId, { patient_id: a.patient_id, admission_id: a.id, source: 'bed', description: `Hospitalisation ${bed.ward} – lit ${bed.label} (${nights} nuit${nights > 1 ? 's' : ''})`, qty: nights, unit_price: bed.daily_rate });
    if (bed) db.run("UPDATE clinic_beds SET status = 'cleaning' WHERE id = ?", bed.id);
    db.run("UPDATE clinic_care SET status = 'missed', note = 'Sortie du patient' WHERE admission_id = ? AND status = 'planned'", a.id);
    if (outcome === 'deceased') db.run("UPDATE clinic_patients SET status = 'deceased' WHERE id = ?", a.patient_id);
    audit(db, ctx, 'discharge', 'clinic_admission', a.id, `${a.number} ${outcome}`);
    bus?.emit(companyId, 'change', { entity: 'clinic_bed', id: a.bed_id });
    return admissionDetail(db, companyId, a.id);
  });
}

export function transferBed(db, bus, ctx, companyId, id, bedId) {
  const a = db.get("SELECT * FROM clinic_admissions WHERE id = ? AND company_id = ? AND status = 'admitted'", id, companyId); if (!a) throw notFound();
  const bed = db.get("SELECT * FROM clinic_beds WHERE id = ? AND company_id = ? AND status = 'free' AND active = 1", bedId, companyId); if (!bed) throw conflict('bed_busy', 'Lit non disponible');
  const old = db.get('SELECT * FROM clinic_beds WHERE id = ?', a.bed_id);
  db.tx(() => {
    // Nights already spent in the old bed are charged at its rate.
    const nights = Math.round((Date.parse(today()) - Date.parse(a.admitted_at.slice(0, 10))) / 864e5);
    if (old && nights > 0 && old.daily_rate !== bed.daily_rate) {
      addCharge(db, sys(ctx), companyId, { patient_id: a.patient_id, admission_id: a.id, source: 'bed', description: `Hospitalisation ${old.ward} – lit ${old.label} (${nights} nuit${nights > 1 ? 's' : ''})`, qty: nights, unit_price: old.daily_rate });
      db.run('UPDATE clinic_admissions SET admitted_at = ? WHERE id = ?', today() + a.admitted_at.slice(10), a.id);
    }
    db.run("UPDATE clinic_beds SET status = 'cleaning' WHERE id = ?", a.bed_id);
    db.run("UPDATE clinic_beds SET status = 'occupied' WHERE id = ?", bed.id);
    db.run('UPDATE clinic_admissions SET bed_id = ? WHERE id = ?', bed.id, a.id);
  });
  audit(db, ctx, 'transfer', 'clinic_admission', a.id, `${old?.label} → ${bed.label}`);
  bus?.emit(companyId, 'change', { entity: 'clinic_bed', id: bed.id });
  return admissionDetail(db, companyId, a.id);
}

// ---------------- Vaccines, certificates, messages ----------------
export function addVaccine(db, ctx, companyId, patientId, b) {
  if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId)) throw notFound();
  const vaccine = str(b.vaccine, 80); if (!vaccine) throw bad('vaccine', 'Vaccin obligatoire');
  const id = Number(db.run('INSERT INTO clinic_vaccines (company_id, patient_id, vaccine, dose, date, lot, next_due, user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)', companyId, patientId, vaccine, str(b.dose, 30),
    vDate(b.date, 'date', today()), str(b.lot, 40), b.next_due ? vDate(b.next_due, 'next_due') : '', ctx.user.id, now()).lastInsertRowid);
  return db.get('SELECT * FROM clinic_vaccines WHERE id = ?', id);
}

export function createCertificate(db, ctx, companyId, b) {
  const v = b.visit_id ? db.get('SELECT * FROM clinic_visits WHERE id = ? AND company_id = ?', b.visit_id, companyId) : null;
  const patientId = v?.patient_id ?? Number(b.patient_id);
  if (!db.get('SELECT 1 FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId)) throw notFound('Patient introuvable');
  const kind = oneOf(b.kind, ['rest', 'fitness', 'medical'], 'kind', 'rest');
  const days = kind === 'rest' ? int(b.rest_days, 'rest_days', { min: 1 }) : 0;
  const pr = practitionerOf(db, companyId, ctx.user.id);
  if (!pr && !['owner', 'admin'].includes(ctx.user.role)) throw forbidden('Seul un médecin signe un certificat');
  const id = Number(db.run('INSERT INTO clinic_certificates (company_id, code, patient_id, visit_id, kind, body, rest_days, from_date, practitioner_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    companyId, shortCode(), patientId, v?.id ?? null, kind, str(b.body, 3000), days, vDate(b.from_date, 'from_date', today()), pr?.id ?? v?.practitioner_id ?? null, ctx.user.id, now()).lastInsertRowid);
  audit(db, ctx, 'certificate', 'clinic_certificate', id, kind);
  return db.get('SELECT * FROM clinic_certificates WHERE id = ?', id);
}

export function certificateFull(db, where, val) {
  return db.get(`SELECT c.*, p.last_name, p.first_name, p.birth_date, p.sex, p.mrn, u.name practitioner_name, pr.title, pr.order_no, pr.specialty FROM clinic_certificates c JOIN clinic_patients p ON p.id = c.patient_id
    LEFT JOIN clinic_practitioners pr ON pr.id = c.practitioner_id LEFT JOIN users u ON u.id = pr.user_id WHERE c.${where} = ?`, val);
}

export function messages(db, companyId, patientId) {
  return db.all('SELECT m.*, u.name user_name FROM clinic_messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.company_id = ? AND m.patient_id = ? ORDER BY m.id DESC LIMIT 100', companyId, patientId).reverse();
}
export function inbox(db, companyId) {
  return db.all(`SELECT p.id patient_id, p.last_name, p.first_name, p.mrn, MAX(m.created_at) last_at, SUM(CASE WHEN m.direction = 'in' AND m.read = 0 THEN 1 ELSE 0 END) unread,
      (SELECT body FROM clinic_messages x WHERE x.patient_id = p.id ORDER BY x.id DESC LIMIT 1) last_body
    FROM clinic_messages m JOIN clinic_patients p ON p.id = m.patient_id WHERE m.company_id = ? GROUP BY p.id ORDER BY unread > 0 DESC, last_at DESC LIMIT 100`, companyId);
}

// ---------------- Patient file ----------------
export function timeline(db, companyId, patientId) {
  const ev = [];
  for (const v of db.all("SELECT v.*, u.name practitioner_name FROM clinic_visits v LEFT JOIN clinic_practitioners pr ON pr.id = v.practitioner_id LEFT JOIN users u ON u.id = pr.user_id WHERE v.patient_id = ? AND v.status != 'cancelled' ORDER BY v.arrived_at DESC LIMIT 60", patientId)) {
    ev.push({ type: 'visit', at: v.arrived_at, id: v.id, title: v.diagnosis || v.complaint || v.kind, sub: v.practitioner_name || '', status: v.status, icd: J(v.icd, []), vitals: J(v.vitals, {}), news: v.news, number: v.number, kind: v.kind });
  }
  for (const o of ordersOf(db, companyId, { patient_id: patientId, limit: 80 })) ev.push({ type: o.kind, at: o.validated_at || o.ordered_at, id: o.id, title: o.test_name, sub: o.number, status: o.status, abnormal: o.abnormal, critical: o.critical, results: o.status === 'validated' ? o.results : [], conclusion: o.status === 'validated' ? o.conclusion : '' });
  for (const r of prescriptionsOf(db, companyId, { patient_id: patientId, limit: 60 })) ev.push({ type: 'rx', at: r.created_at, id: r.id, title: r.lines.map((l) => l.name).join(', '), sub: r.practitioner_name || '', status: r.status, code: r.code, lines: r.lines });
  for (const a of db.all('SELECT a.*, b.label bed_label, b.ward FROM clinic_admissions a LEFT JOIN clinic_beds b ON b.id = a.bed_id WHERE a.patient_id = ? ORDER BY a.admitted_at DESC', patientId)) ev.push({ type: 'admission', at: a.admitted_at, id: a.id, title: a.reason || a.diagnosis, sub: `${a.ward || ''} ${a.bed_label || ''}`.trim(), status: a.status, end: a.discharged_at, outcome: a.outcome, number: a.number });
  for (const x of db.all('SELECT * FROM clinic_vaccines WHERE patient_id = ? ORDER BY date DESC', patientId)) ev.push({ type: 'vaccine', at: x.date + 'T12:00:00.000Z', id: x.id, title: x.vaccine, sub: `${x.dose || ''} ${x.lot ? '· lot ' + x.lot : ''}`.trim(), next_due: x.next_due });
  for (const c of db.all('SELECT * FROM clinic_certificates WHERE patient_id = ? ORDER BY id DESC', patientId)) ev.push({ type: 'certificate', at: c.created_at, id: c.id, title: c.kind, sub: c.rest_days ? `${c.rest_days} j` : '', code: c.code });
  return ev.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/** Vital signs over time (visits and ward rounds) for the trend charts. */
export function vitalsTrend(db, patientId) {
  const rows = [
    ...db.all("SELECT arrived_at at, vitals FROM clinic_visits WHERE patient_id = ? AND vitals != '{}' AND status != 'cancelled'", patientId),
    ...db.all("SELECT c.done_at at, c.vitals FROM clinic_care c JOIN clinic_admissions a ON a.id = c.admission_id WHERE a.patient_id = ? AND c.kind = 'vitals' AND c.status = 'done'", patientId),
  ].map((r) => ({ at: r.at, ...J(r.vitals, {}) })).filter((r) => r.at).sort((a, b) => a.at.localeCompare(b.at));
  return rows.slice(-40);
}

/** HL7 FHIR R4 bundle of the patient record (Patient, Encounters, Observations, Conditions, MedicationRequests, DiagnosticReports). */
export function fhirBundle(db, companyId, patientId, base) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId); if (!p) throw notFound();
  const company = db.get('SELECT name FROM companies WHERE id = ?', companyId);
  const ref = (t, id) => ({ reference: `${t}/${id}` });
  const e = [];
  const pid = `pat-${p.id}`;
  e.push({ resourceType: 'Patient', id: pid, identifier: [{ system: `${base}/mrn`, value: p.mrn }], active: p.status === 'active', name: [{ family: p.last_name, given: p.first_name ? [p.first_name] : [] }],
    gender: p.sex === 'F' ? 'female' : 'male', birthDate: p.birth_date || undefined, telecom: [p.phone && { system: 'phone', value: p.phone }, p.email && { system: 'email', value: p.email }].filter(Boolean),
    address: p.address || p.city ? [{ text: p.address, city: p.city, country: 'CM' }] : undefined, deceasedBoolean: p.status === 'deceased' || undefined,
    managingOrganization: { display: company.name } });
  if (p.allergies) e.push({ resourceType: 'AllergyIntolerance', id: `alg-${p.id}`, patient: ref('Patient', pid), code: { text: p.allergies }, clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] } });
  const LOINC = { bp_sys: ['8480-6', 'Systolic blood pressure', 'mm[Hg]'], bp_dia: ['8462-4', 'Diastolic blood pressure', 'mm[Hg]'], pulse: ['8867-4', 'Heart rate', '/min'], temp: ['8310-5', 'Body temperature', 'Cel'], resp: ['9279-1', 'Respiratory rate', '/min'], spo2: ['59408-5', 'Oxygen saturation', '%'], weight: ['29463-7', 'Body weight', 'kg'], height: ['8302-2', 'Body height', 'cm'], glucose: ['2339-0', 'Glucose', 'g/L'] };
  for (const v of db.all("SELECT * FROM clinic_visits WHERE patient_id = ? AND status = 'done' ORDER BY arrived_at", p.id)) {
    const eid = `enc-${v.id}`;
    e.push({ resourceType: 'Encounter', id: eid, status: 'finished', class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: v.kind === 'tele' ? 'VR' : v.kind === 'emergency' ? 'EMER' : 'AMB' }, subject: ref('Patient', pid), period: { start: v.arrived_at, end: v.ended_at || undefined }, reasonCode: v.complaint ? [{ text: v.complaint }] : undefined });
    const vit = J(v.vitals, {});
    for (const [k, [code, display, unit]] of Object.entries(LOINC)) if (vit[k] != null) e.push({ resourceType: 'Observation', id: `obs-${v.id}-${k}`, status: 'final', category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }], code: { coding: [{ system: 'http://loinc.org', code, display }] }, subject: ref('Patient', pid), encounter: ref('Encounter', eid), effectiveDateTime: v.arrived_at, valueQuantity: { value: vit[k], unit, system: 'http://unitsofmeasure.org', code: unit } });
    for (const c of J(v.icd, [])) e.push({ resourceType: 'Condition', id: `cond-${v.id}-${c}`, subject: ref('Patient', pid), encounter: ref('Encounter', eid), recordedDate: v.ended_at || v.arrived_at, code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: c, display: ICD[c]?.en || c }], text: v.diagnosis || ICD[c]?.fr } });
  }
  for (const r of prescriptionsOf(db, companyId, { patient_id: p.id, limit: 300 })) for (const l of r.lines) e.push({ resourceType: 'MedicationRequest', id: `rx-${r.id}-${l.id}`, status: r.status === 'cancelled' ? 'cancelled' : 'active', intent: 'order', subject: ref('Patient', pid), authoredOn: r.created_at, medicationCodeableConcept: { text: l.name }, dosageInstruction: [{ text: [l.dose, l.frequency, l.duration, l.instructions].filter(Boolean).join(' · ') }] });
  for (const o of ordersOf(db, companyId, { patient_id: p.id, status: 'validated', limit: 300 })) e.push({ resourceType: 'DiagnosticReport', id: `dr-${o.id}`, status: 'final', category: [{ text: o.kind === 'lab' ? 'Laboratory' : 'Imaging' }], code: { text: o.test_name }, subject: ref('Patient', pid), issued: o.validated_at, conclusion: o.conclusion || o.results.filter((x) => x.value !== '').map((x) => `${x.label}: ${x.value} ${x.unit || ''}${x.flag ? ' (' + x.flag + ')' : ''}`).join('; ') });
  return { resourceType: 'Bundle', type: 'collection', timestamp: now(), meta: { source: `${base} (Teknons Santé)` }, entry: e.map((r) => ({ fullUrl: `${base}/fhir/${r.resourceType}/${r.id}`, resource: r })) };
}
