// Dashboard, activity reports and epidemiological surveillance for Teknons
// Santé, with "Teknons Insight" notes written from the numbers (waiting times,
// no-shows, outbreaks, lab turnaround, stock-outs, unpaid shares).
import { today } from '../../core/schema.js';
import { ICD } from './ref.js';
import { display } from './patients.js';

const J = (s, d) => { try { return JSON.parse(s || ''); } catch { return d; } };
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/** Monday of the ISO week of a date, as YYYY-MM-DD. */
export const weekOf = (d) => { const x = new Date(String(d).slice(0, 10) + 'T12:00:00Z'); const w = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - w); return x.toISOString().slice(0, 10); };
export const isoWeekNo = (d) => { const x = new Date(String(d).slice(0, 10) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 3 - ((x.getUTCDay() + 6) % 7)); const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 4)); return 1 + Math.round(((x - y) / 864e5 - 3 + ((y.getUTCDay() + 6) % 7)) / 7); };

export function topDiagnoses(db, companyId, from, to = today(), limit = 10) {
  const counts = {};
  for (const v of db.all("SELECT icd FROM clinic_visits WHERE company_id = ? AND status = 'done' AND substr(arrived_at,1,10) BETWEEN ? AND ?", companyId, from, to)) for (const c of J(v.icd, [])) counts[c] = (counts[c] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([code, n]) => ({ code, n, fr: ICD[code]?.fr || code, en: ICD[code]?.en || code, surveillance: ICD[code]?.surveillance || '' }));
}

/** Weekly cases of the diseases under surveillance (visits and admissions), malaria test positivity, and outbreak signals. */
export function surveillance(db, companyId, { weeks = 8 } = {}) {
  const start = weekOf(day(7 * (weeks - 1)));
  const list = []; for (let i = weeks - 1; i >= 0; i--) list.push(weekOf(day(7 * i)));
  const cases = {};
  const add = (code, at, sex, age) => {
    if (!ICD[code]?.surveillance) return;
    const w = weekOf(at);
    if (w < start) return;
    cases[code] ??= { code, fr: ICD[code].fr, en: ICD[code].en, level: ICD[code].surveillance, weeks: Object.fromEntries(list.map((x) => [x, 0])), under5: 0, female: 0, total: 0 };
    cases[code].weeks[w] = (cases[code].weeks[w] || 0) + 1; cases[code].total++;
    if (age != null && age < 5) cases[code].under5++;
    if (sex === 'F') cases[code].female++;
  };
  const ageAt = (b, at) => (b ? (Date.parse(at) - Date.parse(b)) / (365.25 * 864e5) : null);
  for (const v of db.all("SELECT v.icd, v.arrived_at, p.sex, p.birth_date FROM clinic_visits v JOIN clinic_patients p ON p.id = v.patient_id WHERE v.company_id = ? AND v.status = 'done' AND v.arrived_at >= ?", companyId, start)) {
    for (const c of J(v.icd, [])) add(c, v.arrived_at, v.sex, ageAt(v.birth_date, v.arrived_at));
  }
  // Malaria tests (thick smear and rapid test)
  const tests = db.all(`SELECT o.validated_at, o.results FROM clinic_orders o JOIN clinic_tariffs t ON t.id = o.tariff_id WHERE o.company_id = ? AND t.code IN ('GE','TDR') AND o.status = 'validated' AND o.validated_at >= ?`, companyId, start);
  const malaria = Object.fromEntries(list.map((w) => [w, { tested: 0, positive: 0 }]));
  for (const t of tests) { const w = weekOf(t.validated_at); if (!malaria[w]) continue; malaria[w].tested++; if (J(t.results, []).some((r) => r.k === 'result' && /^Positi/.test(r.value))) malaria[w].positive++; }
  const thisWeek = list.at(-1);
  const signals = [];
  for (const c of Object.values(cases)) {
    const cur = c.weeks[thisWeek] || 0;
    const prev = list.slice(-5, -1).map((w) => c.weeks[w] || 0);
    const avg = prev.reduce((a, b) => a + b, 0) / (prev.length || 1);
    if (c.level === 'immediate' && cur > 0) signals.push({ level: 'danger', code: c.code, fr: `${c.fr} : ${cur} cas cette semaine. Maladie à déclaration immédiate : notifiez le district de santé sous 24 h.`, en: `${c.en}: ${cur} case(s) this week. Immediately notifiable: report to the health district within 24 h.` });
    else if (cur >= 5 && cur >= 2 * Math.max(1, avg)) signals.push({ level: 'warn', code: c.code, fr: `${c.fr} : ${cur} cas cette semaine contre ${Math.round(avg * 10) / 10} en moyenne (×${Math.round((cur / Math.max(1, avg)) * 10) / 10}). Seuil d'alerte franchi.`, en: `${c.en}: ${cur} cases this week vs ${Math.round(avg * 10) / 10} on average. Alert threshold crossed.` });
  }
  const m = malaria[thisWeek];
  if (m && m.tested >= 10 && pct(m.positive, m.tested) >= 50) signals.push({ level: 'warn', code: 'B54', fr: `Positivité paludisme à ${pct(m.positive, m.tested)} % cette semaine (${m.positive}/${m.tested} tests).`, en: `Malaria positivity at ${pct(m.positive, m.tested)}% this week (${m.positive}/${m.tested} tests).` });
  return { weeks: list.map((w) => ({ start: w, no: isoWeekNo(w) })), diseases: Object.values(cases).sort((a, b) => (a.level === 'immediate' ? -1 : 0) - (b.level === 'immediate' ? -1 : 0) || b.total - a.total),
    malaria: list.map((w) => ({ week: w, ...malaria[w], rate: pct(malaria[w].positive, malaria[w].tested) })), signals };
}

/** Same days of the previous month, for a fair month-to-date comparison. */
const prevMonthToDate = (t) => {
  const y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)), d = Number(t.slice(8, 10));
  const start = new Date(Date.UTC(y, m - 2, 1));
  const last = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  return [start.toISOString().slice(0, 10), new Date(Date.UTC(y, m - 2, Math.min(d, last))).toISOString().slice(0, 10)];
};

export function dashboard(db, companyId) {
  const t = today(), m0 = t.slice(0, 7) + '-01', d30 = day(29);
  const appts = db.get(`SELECT COUNT(*) total, SUM(status IN ('arrived','done')) arrived, SUM(status = 'no_show') no_show, SUM(mode = 'tele') tele, SUM(status IN ('booked','confirmed')) expected, SUM(source != 'staff') online
    FROM clinic_appointments WHERE company_id = ? AND date = ? AND status != 'cancelled'`, companyId, t);
  const visits = db.get(`SELECT COUNT(*) total, SUM(status = 'waiting') waiting, SUM(status = 'in_consult') in_consult, SUM(status = 'done') done, SUM(kind = 'emergency') emergency,
      AVG(CASE WHEN started_at IS NOT NULL THEN (julianday(started_at) - julianday(arrived_at)) * 1440 END) avg_wait, MAX(CASE WHEN status = 'waiting' THEN (julianday('now') - julianday(arrived_at)) * 1440 END) longest
    FROM clinic_visits WHERE company_id = ? AND substr(arrived_at,1,10) = ? AND status != 'cancelled'`, companyId, t);
  const doctors = db.all(`SELECT pr.id, u.name, pr.title, pr.room, pr.color, SUM(v.status = 'waiting') waiting, SUM(v.status = 'in_consult') in_consult, SUM(v.status = 'done') done
    FROM clinic_practitioners pr JOIN users u ON u.id = pr.user_id LEFT JOIN clinic_visits v ON v.practitioner_id = pr.id AND substr(v.arrived_at,1,10) = ? AND v.status != 'cancelled'
    WHERE pr.company_id = ? AND pr.active = 1 GROUP BY pr.id ORDER BY waiting DESC, done DESC`, t, companyId);
  const bedsRow = db.get("SELECT COUNT(*) total, SUM(status = 'occupied') occupied, SUM(status = 'cleaning') cleaning, SUM(status = 'free') free FROM clinic_beds WHERE company_id = ? AND active = 1", companyId);
  const adm = db.get(`SELECT COUNT(*) n, AVG(CASE WHEN discharged_at IS NOT NULL THEN julianday(discharged_at) - julianday(admitted_at) END) alos FROM clinic_admissions WHERE company_id = ? AND admitted_at >= ?`, companyId, m0);
  const lab = db.get(`SELECT SUM(status IN ('ordered','sampled','done')) pending, SUM(status = 'ordered') to_sample, SUM(status = 'done') to_validate, SUM(critical = 1 AND status = 'validated' AND substr(validated_at,1,10) = ?) critical_today
    FROM clinic_orders WHERE company_id = ? AND status != 'cancelled' AND ordered_at >= ?`, t, companyId, day(14));
  const late = db.get(`SELECT COUNT(*) n FROM clinic_orders o JOIN clinic_tariffs tt ON tt.id = o.tariff_id WHERE o.company_id = ? AND o.status IN ('ordered','sampled','done') AND tt.tat_hours > 0 AND (julianday('now') - julianday(o.ordered_at)) * 24 > tt.tat_hours`, companyId).n;
  const tat = db.get("SELECT AVG((julianday(validated_at) - julianday(ordered_at)) * 24) h FROM clinic_orders WHERE company_id = ? AND status = 'validated' AND validated_at >= ?", companyId, day(30)).h;
  const pharm = db.get(`SELECT SUM(stock <= reorder AND reorder > 0) low, SUM(stock <= 0) out_of_stock, SUM(stock * cost) value FROM clinic_drugs WHERE company_id = ? AND active = 1`, companyId);
  const expiring = db.get('SELECT COUNT(DISTINCT drug_id) n FROM clinic_lots WHERE company_id = ? AND qty > 0 AND expiry <= ?', companyId, day(-90)).n;
  const rxToServe = db.get("SELECT COUNT(*) n FROM clinic_prescriptions WHERE company_id = ? AND status IN ('active','partial') AND created_at >= ?", companyId, day(3)).n;
  // Money: revenue from health accounts (7061/7062/7063/7011) of validated invoices
  const rev = (from, to) => db.get(`SELECT COALESCE(SUM(l.net),0) s FROM document_lines l JOIN documents d ON d.id = l.document_id WHERE d.company_id = ? AND d.kind = 'invoice' AND d.status IN ('open','partial','paid') AND l.account_code IN ('7061','7062','7063','7011') AND d.date BETWEEN ? AND ?`, companyId, from, to).s;
  const collectedToday = db.get(`SELECT COALESCE(SUM(p.amount),0) s FROM payments p JOIN documents d ON d.id = p.document_id WHERE p.company_id = ? AND p.direction = 'in' AND p.status = 'completed' AND p.date = ?`, companyId, t).s;
  const methods = db.all(`SELECT p.method, SUM(p.amount) v FROM payments p WHERE p.company_id = ? AND p.direction = 'in' AND p.status = 'completed' AND p.date >= ? GROUP BY p.method ORDER BY v DESC`, companyId, m0);
  const patientsDue = db.get(`SELECT COALESCE(SUM(d.total - d.paid - d.credited),0) s FROM documents d JOIN clinic_patients p ON p.partner_id = d.partner_id WHERE d.company_id = ? AND d.kind = 'invoice' AND d.status IN ('open','partial')`, companyId).s
    + db.get("SELECT COALESCE(SUM(patient_amount),0) s FROM clinic_charges WHERE company_id = ? AND status = 'pending'", companyId).s;
  const toClaim = db.get("SELECT COALESCE(SUM(insurer_amount),0) s FROM clinic_charges WHERE company_id = ? AND claim_id IS NULL AND status != 'cancelled'", companyId).s;
  const insurerDue = db.get(`SELECT COALESCE(SUM(d.total - d.paid - d.credited),0) s FROM documents d JOIN clinic_insurers i ON i.partner_id = d.partner_id WHERE d.company_id = ? AND d.kind = 'invoice' AND d.status IN ('open','partial')`, companyId).s;
  const bySource = db.all(`SELECT source, SUM(amount) v FROM clinic_charges WHERE company_id = ? AND status != 'cancelled' AND date >= ? GROUP BY source ORDER BY v DESC`, companyId, m0);
  const trendV = Object.fromEntries(db.all(`SELECT substr(arrived_at,1,10) d, COUNT(*) n FROM clinic_visits WHERE company_id = ? AND status != 'cancelled' AND arrived_at >= ? GROUP BY d`, companyId, d30).map((r) => [r.d, r.n]));
  const trendR = Object.fromEntries(db.all(`SELECT date d, SUM(amount) v FROM clinic_charges WHERE company_id = ? AND status != 'cancelled' AND date >= ? GROUP BY date`, companyId, d30).map((r) => [r.d, r.v]));
  const trend = []; for (let i = 29; i >= 0; i--) { const d = day(i); trend.push({ d, visits: trendV[d] || 0, revenue: trendR[d] || 0 }); }
  const sv = surveillance(db, companyId, { weeks: 6 });
  const noShow30 = db.get("SELECT SUM(status = 'no_show') ns, COUNT(*) n FROM clinic_appointments WHERE company_id = ? AND date BETWEEN ? AND ? AND status != 'cancelled'", companyId, d30, day(1));
  const critical = db.all(`SELECT o.id, o.number, t.name test_name, p.last_name, p.first_name, o.validated_at FROM clinic_orders o JOIN clinic_tariffs t ON t.id = o.tariff_id JOIN clinic_patients p ON p.id = o.patient_id
    WHERE o.company_id = ? AND o.critical = 1 AND o.status = 'validated' AND o.validated_at >= ? ORDER BY o.validated_at DESC LIMIT 5`, companyId, day(2));
  const followUps = db.get("SELECT COUNT(*) n FROM clinic_visits WHERE company_id = ? AND follow_up BETWEEN ? AND ? AND status = 'done'", companyId, t, day(-7)).n;
  const unread = db.get("SELECT COUNT(*) n FROM clinic_messages WHERE company_id = ? AND direction = 'in' AND read = 0", companyId).n;

  const insights = [];
  if (visits.longest > 60) insights.push({ level: 'warn', title: `Attente de ${Math.round(visits.longest)} min`, body: 'Un patient attend depuis plus d\'une heure. Réorientez-le vers un médecin moins chargé ou prévenez-le du délai.' });
  const busiest = doctors.find((d) => d.waiting >= 6); const idle = doctors.find((d) => !d.waiting && !d.in_consult);
  if (busiest && idle) insights.push({ level: 'info', title: `${busiest.title || ''} ${busiest.name} : ${busiest.waiting} en attente`, body: `${idle.title || ''} ${idle.name} est libre. Répartissez la file d'attente pour réduire l'attente.` });
  for (const s of sv.signals.slice(0, 3)) insights.push({ level: s.level === 'danger' ? 'warn' : 'info', title: s.level === 'danger' ? 'Surveillance : déclaration immédiate' : 'Surveillance épidémiologique', body: s.fr });
  if (noShow30.n >= 20 && pct(noShow30.ns, noShow30.n) >= 12) insights.push({ level: 'info', title: `${pct(noShow30.ns, noShow30.n)} % de rendez-vous manqués`, body: 'Envoyez le rappel WhatsApp la veille depuis l\'agenda : les patients rappelés viennent nettement plus.' });
  if (late) insights.push({ level: 'warn', title: `${late} examen(s) hors délai`, body: 'Des résultats dépassent le délai de rendu prévu. Ouvrez la paillasse du laboratoire.' });
  if (pharm.out_of_stock) insights.push({ level: 'warn', title: `${pharm.out_of_stock} médicament(s) en rupture`, body: 'Les ordonnances de ces produits ne peuvent pas être servies sur place. Passez commande.' });
  if (toClaim > 500000) insights.push({ level: 'info', title: `${Math.round(toClaim / 1000)} k FCFA à réclamer aux assureurs`, body: 'Créez les bordereaux du mois pour transformer ces prises en charge en factures.' });
  if (bedsRow.total && pct(bedsRow.occupied, bedsRow.total) >= 85) insights.push({ level: 'warn', title: `Lits occupés à ${pct(bedsRow.occupied, bedsRow.total)} %`, body: 'Préparez les sorties prévues et libérez les lits en nettoyage.' });

  return {
    appointments: appts, visits: { ...visits, avg_wait: visits.avg_wait == null ? null : Math.round(visits.avg_wait), longest: visits.longest == null ? null : Math.round(visits.longest) }, doctors,
    beds: { ...bedsRow, rate: pct(bedsRow.occupied, bedsRow.total), admissions_month: adm.n, alos: adm.alos == null ? null : Math.round(adm.alos * 10) / 10 },
    lab: { ...lab, late, tat: tat == null ? null : Math.round(tat * 10) / 10 }, pharmacy: { ...pharm, expiring, rx_to_serve: rxToServe },
    money: { today: collectedToday, month: rev(m0, t), last_month: rev(...prevMonthToDate(t)), patients_due: patientsDue, to_claim: toClaim, insurers_due: insurerDue, methods, by_source: bySource },
    trend, diagnoses: topDiagnoses(db, companyId, d30), signals: sv.signals, critical, follow_ups: followUps, unread, no_show_rate: pct(noShow30.ns || 0, noShow30.n || 0),
    display: display(db, companyId), insights,
  };
}

/** Activity over a period, for the director and the accountant. */
export function report(db, companyId, from, to) {
  const visits = db.all(`SELECT kind, COUNT(*) n FROM clinic_visits WHERE company_id = ? AND status = 'done' AND substr(arrived_at,1,10) BETWEEN ? AND ? GROUP BY kind ORDER BY n DESC`, companyId, from, to);
  const practitioners = db.all(`SELECT u.name, pr.title, pr.specialty, COUNT(v.id) visits, AVG((julianday(v.ended_at) - julianday(v.started_at)) * 1440) minutes,
      (SELECT COALESCE(SUM(c.amount),0) FROM clinic_charges c JOIN clinic_visits vv ON vv.id = c.visit_id WHERE vv.practitioner_id = pr.id AND c.status != 'cancelled' AND c.date BETWEEN ? AND ?) revenue
    FROM clinic_practitioners pr JOIN users u ON u.id = pr.user_id LEFT JOIN clinic_visits v ON v.practitioner_id = pr.id AND v.status = 'done' AND substr(v.arrived_at,1,10) BETWEEN ? AND ?
    WHERE pr.company_id = ? GROUP BY pr.id ORDER BY visits DESC`, from, to, from, to, companyId).map((r) => ({ ...r, minutes: r.minutes == null ? null : Math.round(r.minutes) }));
  const revenue = db.all(`SELECT source, COUNT(*) n, SUM(amount) amount, SUM(insurer_amount) insurer, SUM(patient_amount) patient FROM clinic_charges WHERE company_id = ? AND status != 'cancelled' AND date BETWEEN ? AND ? GROUP BY source ORDER BY amount DESC`, companyId, from, to);
  const insurers = db.all(`SELECT i.name, COUNT(c.id) n, SUM(c.insurer_amount) amount FROM clinic_charges c JOIN clinic_insurers i ON i.id = c.insurer_id WHERE c.company_id = ? AND c.status != 'cancelled' AND c.date BETWEEN ? AND ? GROUP BY i.id ORDER BY amount DESC`, companyId, from, to);
  const appts = db.get(`SELECT COUNT(*) n, SUM(status = 'no_show') no_show, SUM(source != 'staff') online, SUM(mode = 'tele') tele FROM clinic_appointments WHERE company_id = ? AND date BETWEEN ? AND ? AND status != 'cancelled'`, companyId, from, to);
  const lab = db.all(`SELECT t.code, t.name, t.tat_hours, COUNT(*) n, AVG((julianday(o.validated_at) - julianday(o.ordered_at)) * 24) tat, SUM(o.abnormal) abnormal FROM clinic_orders o JOIN clinic_tariffs t ON t.id = o.tariff_id
    WHERE o.company_id = ? AND o.status = 'validated' AND substr(o.validated_at,1,10) BETWEEN ? AND ? GROUP BY t.id ORDER BY n DESC`, companyId, from, to).map((r) => ({ ...r, tat: r.tat == null ? null : Math.round(r.tat * 10) / 10 }));
  const drugs = db.all(`SELECT d.name, SUM(-m.qty) qty, SUM(-m.qty) * d.price value FROM clinic_stock_moves m JOIN clinic_drugs d ON d.id = m.drug_id WHERE m.company_id = ? AND m.kind = 'out' AND substr(m.at,1,10) BETWEEN ? AND ? GROUP BY d.id ORDER BY value DESC LIMIT 15`, companyId, from, to);
  const adm = db.get(`SELECT COUNT(*) n, AVG(CASE WHEN discharged_at IS NOT NULL THEN julianday(discharged_at) - julianday(admitted_at) END) alos, SUM(outcome = 'deceased') deaths FROM clinic_admissions WHERE company_id = ? AND substr(admitted_at,1,10) BETWEEN ? AND ?`, companyId, from, to);
  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1);
  const beds = db.get('SELECT COUNT(*) n FROM clinic_beds WHERE company_id = ? AND active = 1', companyId).n;
  const bedDays = db.all(`SELECT admitted_at, discharged_at FROM clinic_admissions WHERE company_id = ? AND substr(admitted_at,1,10) <= ? AND (discharged_at IS NULL OR substr(discharged_at,1,10) >= ?)`, companyId, to, from)
    .reduce((s, a) => s + Math.max(0, (Math.min(Date.parse(to) + 864e5, Date.parse(a.discharged_at || new Date().toISOString())) - Math.max(Date.parse(from), Date.parse(a.admitted_at))) / 864e5), 0);
  const patients = db.get(`SELECT COUNT(DISTINCT patient_id) n, SUM(CASE WHEN (SELECT MIN(arrived_at) FROM clinic_visits x WHERE x.patient_id = v.patient_id) = v.arrived_at THEN 1 ELSE 0 END) new_patients FROM clinic_visits v WHERE v.company_id = ? AND v.status = 'done' AND substr(v.arrived_at,1,10) BETWEEN ? AND ?`, companyId, from, to);
  return { from, to, visits, practitioners, revenue, insurers, appointments: { ...appts, no_show_rate: pct(appts.no_show || 0, appts.n || 0) }, lab, drugs,
    admissions: { ...adm, alos: adm.alos == null ? null : Math.round(adm.alos * 10) / 10, occupancy: beds ? pct(bedDays, beds * days) : 0 }, patients, diagnoses: topDiagnoses(db, companyId, from, to, 15) };
}
