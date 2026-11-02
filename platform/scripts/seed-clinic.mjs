// Creates the Teknons Santé demo, "Polyclinique Horizon Santé" in Douala, through
// the real HTTP API so that billing, insurer shares, stock, accounting entries
// and alerts stay consistent. Four weeks of activity are replayed and then dated
// back: consultations with vitals, ICD-10 codes, prescriptions, lab results,
// pharmacy dispensing, payments (cash, MTN MoMo, Orange Money), admissions and
// discharges, an insurer claim, online and video bookings, patient messages.
// Today is left "live": a queue, patients in consultation, tests to run,
// prescriptions to fill, inpatients with planned medication.
//   Owner (medical director and doctor): demo@teknons.cm / demo1234
//   Staff (password demo1234): dr.kamga@ (paediatrics), dr.ngo@ (obstetrics),
//   dr.fotso@ (cardiology), infirmier@, labo@, pharmacie@, accueil@, compta@
//   MODULES=clinic DATA_DIR=./data node scripts/seed-clinic.mjs
import path from 'node:path';
import { createApp } from '../app.js';
import { createCompany } from '../core/routes.js';
import { hashPassword } from '../core/auth.js';
import { now } from '../core/schema.js';

const dataDir = process.env.DATA_DIR || path.resolve('data');
const env = { ...process.env, MODULES: process.env.MODULES || 'clinic', MOMO_MODE: process.env.MOMO_MODE || 'simulation' };
const app = createApp({ dbFile: path.join(dataDir, 'teknons.db'), env, jobs: false });
const { db, modules } = app;
const email = process.env.DEMO_EMAIL || 'demo@teknons.cm';
const password = process.env.DEMO_PASSWORD || 'demo1234';
if (db.get('SELECT id FROM users WHERE email = ?', email)) { console.log('Demo clinic already exists:', email); process.exit(0); }

await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.server.address().port}`;
const sessions = {}; let cookie = '';
async function call(method, p, body, headers = {}) {
  const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.get('set-cookie'); if (set && !p.startsWith('/api/public')) cookie = set.split(';')[0];
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
  if (res.status >= 300) throw new Error(`${method} ${p} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}
const get = (p) => call('GET', p), post = (p, b) => call('POST', p, b || {}), put = (p, b) => call('PUT', p, b);
let ipN = 1;
const guest = (m, p, b) => call(m, p, b, { 'X-Forwarded-For': `10.9.${Math.floor(ipN / 250) % 250}.${(ipN++ % 250) + 1}` });
const tryIt = async (fn) => { try { return await fn(); } catch (e) { if (process.env.DEBUG) console.warn(e.message); return null; } };
async function as(mail) {
  if (!sessions[mail]) { cookie = ''; await post('/api/auth/login', { email: mail, password }); sessions[mail] = cookie; }
  cookie = sessions[mail];
}
let seed = 2027;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const between = (a, b) => a + rnd() * (b - a);
const r1 = (x) => Math.round(x * 10) / 10;
const todayStr = new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const iso = (d, minutes) => new Date(Date.parse(d + 'T00:00:00Z') + minutes * 60e3).toISOString();
const phone = () => `6${pick(['5', '7', '8', '9'])}${String(Math.floor(rnd() * 1e7)).padStart(7, '0')}`;

const LAST = ['MBALLA', 'NGONO', 'ETOUNDI', 'FOTSO', 'KAMGA', 'TCHOUPO', 'NJOYA', 'ABENA', 'ATANGANA', 'ESSOMBA', 'NKOULOU', 'BELLA', 'OWONA', 'MBARGA', 'EKOTTO', 'EBOA', 'NDJOCK', 'TAMBA', 'NANA', 'KENGNE', 'TCHAMBA', 'MOUKOURI', 'EWANE', 'DOUALA MANGA', 'NDOUMBE', 'EYOUM', 'MBAPPE', 'NJIKAM', 'YOUMBI', 'TAGNE', 'DJOUMESSI', 'FONKOU', 'NGUEMO', 'BIYA', 'ONANA', 'AYISSI', 'MANGA', 'NDZANA', 'ESSAMA', 'BILOA'];
const FIRST_M = ['Junior', 'Brice', 'Kevin', 'Arnaud', 'Yannick', 'Cédric', 'Franck', 'Loïc', 'Ulrich', 'Steve', 'Hervé', 'Ryan', 'Ethan', 'Christian', 'Samuel', 'Daniel', 'Idriss', 'Ibrahim', 'Stéphane', 'Boris', 'Emmanuel', 'Patrick', 'Joseph', 'Alain', 'Rodrigue'];
const FIRST_F = ['Grâce', 'Ornella', 'Larissa', 'Michelle', 'Christelle', 'Nadège', 'Sandrine', 'Merveille', 'Prisca', 'Audrey', 'Laura', 'Inès', 'Danielle', 'Joëlle', 'Patricia', 'Blessing', 'Aïcha', 'Mariam', 'Estelle', 'Rose', 'Odile', 'Pauline', 'Brenda', 'Vanessa', 'Carine'];
const CITY = ['Bonamoussadi', 'Akwa', 'Bonapriso', 'Deïdo', 'Makepe', 'Logpom', 'Kotto', 'Bonabéri', 'Ndogbong', 'Bépanda', 'Cité des Palmiers', 'PK14', 'Bali', 'New Bell'];
const JOBS = ['Commerçant(e)', 'Enseignant(e)', 'Étudiant(e)', 'Fonctionnaire', 'Moto-taximan', 'Couturière', 'Ingénieur', 'Infirmier(e)', 'Comptable', 'Chauffeur', 'Ménagère', 'Élève', 'Retraité(e)', 'Agent de banque', 'Docker'];

// =====================================================================
const { companyId } = createCompany(db, modules, { company: 'Polyclinique Horizon Santé', name: 'Solange Ewodo', email, password, phone: '677450210' });
db.run(`UPDATE companies SET legal_form = 'SARL', niu = 'M062318745219K', rccm = 'RC/DLA/2016/B/4471', address = 'Rue Njo-Njo, Bonapriso', city = 'Douala', phone = '+237 677 45 02 10',
  email = 'contact@horizon-sante.cm', website = 'horizon-sante.cm', momo_number = '677 45 02 10', om_number = '699 31 77 40',
  invoice_footer = 'Polyclinique Horizon Santé · Agrément MINSANTE n° 0412/A/MINSANTE/SG · Bonapriso, Douala' WHERE id = ?`, companyId);
const owner = db.get('SELECT id FROM users WHERE email = ?', email).id;
const staffList = [
  ['Paul Kamga', 'dr.kamga@teknons.cm', 'doctor'], ['Hélène Ngo Bassa', 'dr.ngo@teknons.cm', 'doctor'], ['Jean-Marc Fotso', 'dr.fotso@teknons.cm', 'doctor'],
  ['Clarisse Ebolo', 'infirmier@teknons.cm', 'nurse'], ['Bertrand Nyemb', 'infirmier2@teknons.cm', 'nurse'], ['Aimé Tchinda', 'labo@teknons.cm', 'labtech'],
  ['Irène Mvondo', 'pharmacie@teknons.cm', 'pharmacist'], ['Sandrine Moukoko', 'accueil@teknons.cm', 'reception'], ['Aline Compta', 'compta@teknons.cm', 'accountant'],
  ['Martin Essomba', 'directeur@teknons.cm', 'manager'],
];
const U = {};
for (const [name, mail, role] of staffList) U[mail] = Number(db.run('INSERT INTO users (company_id, name, email, password_hash, role, phone, created_at) VALUES (?,?,?,?,?,?,?)', companyId, name, mail, hashPassword(password), role, phone(), now()).lastInsertRowid);

await as(email);
await put('/api/clinic/settings', { kind: 'clinic', director_name: 'Dr Solange Ewodo', director_title: 'Médecin-directeur', approval_no: '0412/A/MINSANTE/SG', health_district: 'District de santé de Deïdo', emergency_phone: '+237 677 45 02 11',
  mrn_prefix: 'HS', slot_minutes: 20, open_from: '07:30', open_to: '18:00', booking_open: true, tele_enabled: true, portal_pay: true, consult_prepay: true, drugs_covered: true, expiry_alert_days: 90,
  welcome_text: 'Bienvenue à la Polyclinique Horizon Santé. Médecine générale, pédiatrie, gynécologie-obstétrique et cardiologie, laboratoire et pharmacie sur place, urgences 24 h/24. Réservez en ligne en 1 minute, au cabinet ou en vidéo.' });
let meta = await get('/api/clinic/meta');
const dep = (re) => meta.departments.find((d) => re.test(d.name))?.id;
const PR = {
  ewodo: await post('/api/clinic/practitioners', { user_id: owner, title: 'Dr', specialty: 'Médecine générale', department_id: dep(/g[ée]n[ée]rale/i), order_no: 'ONMC 2210', consult_fee: 7500, tele_fee: 6000, room: 'Bureau 1', color: '#6D3BEB', days: '1,2,3,4,5', start: '08:00', end: '16:00', bio: 'Médecin-directeur. Médecine générale, maladies chroniques (HTA, diabète), médecine du voyage.' }),
  kamga: await post('/api/clinic/practitioners', { user_id: U['dr.kamga@teknons.cm'], title: 'Dr', specialty: 'Pédiatrie', department_id: dep(/p[ée]diat/i), order_no: 'ONMC 3184', consult_fee: 10000, tele_fee: 8000, room: 'Bureau 2', color: '#0FA594', days: '1,2,3,4,5,6', start: '08:00', end: '14:00', bio: 'Pédiatre. Suivi du nourrisson, vaccinations, drépanocytose, urgences pédiatriques.' }),
  ngo: await post('/api/clinic/practitioners', { user_id: U['dr.ngo@teknons.cm'], title: 'Dr', specialty: 'Gynécologie-obstétrique', department_id: dep(/gyn|mat/i), order_no: 'ONMC 2977', consult_fee: 15000, tele_fee: 10000, room: 'Bureau 3', color: '#D9467A', days: '1,2,4,5', start: '09:00', end: '17:00', bio: 'Gynécologue-obstétricienne. Consultations prénatales, échographie obstétricale, planification familiale.' }),
  fotso: await post('/api/clinic/practitioners', { user_id: U['dr.fotso@teknons.cm'], title: 'Pr', specialty: 'Cardiologie', department_id: dep(/cardio|g[ée]n[ée]rale/i), order_no: 'ONMC 1542', consult_fee: 20000, tele_fee: 15000, room: 'Bureau 4', color: '#E39B16', days: '2,4', start: '10:00', end: '16:00', bio: 'Cardiologue. Hypertension, insuffisance cardiaque, ECG et bilan cardiovasculaire.' }),
};
const DOC = { ewodo: email, kamga: 'dr.kamga@teknons.cm', ngo: 'dr.ngo@teknons.cm', fotso: 'dr.fotso@teknons.cm' };
const INS = {
  littoral: await post('/api/clinic/insurers', { name: 'Littoral Assurances', kind: 'insurer', coverage_pct: 80, ceiling: 1500000, contract_no: 'LA-SANTE-2026-114', phone: '233 42 18 90' }),
  mutuelle: await post('/api/clinic/insurers', { name: 'Mutuelle Santé des Enseignants', kind: 'mutual', coverage_pct: 70, ceiling: 600000, contract_no: 'MSE-0387' }),
  wouri: await post('/api/clinic/insurers', { name: 'Wouri Logistique SA', kind: 'employer', coverage_pct: 90, ceiling: 0, contract_no: 'CONV-WL-2025' }),
  mere: await post('/api/clinic/insurers', { name: 'Programme Mère-Enfant (ONG)', kind: 'program', coverage_pct: 100, ceiling: 0, contract_no: 'PME-DLA-12' }),
};
meta = await get('/api/clinic/meta');
const tariff = (code) => meta.tariffs.find((t) => t.code === code)?.id;
console.log('Pharmacy stock…');
const USED = new Set(['Paracétamol 500 mg', 'Amoxicilline 500 mg', 'Ciprofloxacine 500 mg', 'Metformine 850 mg', 'Amlodipine 5 mg', 'Fer + acide folique', 'Oméprazole 20 mg', 'Diclofénac 50 mg', 'Hydrochlorothiazide 25 mg', 'Zinc 20 mg', 'Loratadine 10 mg', 'Amoxicilline + acide clavulanique 1 g']);
const BIG = { 'Artéméther-Luméfantrine 20/120 mg': 320, 'Sels de réhydratation orale': 300, 'Paracétamol sirop 120 mg/5 ml': 600, 'Amoxicilline suspension 250 mg/5 ml': 300 };
let drugs = await get('/api/clinic/drugs');
const lines = drugs.map((d) => ({ drug_id: d.id, lot: `L${String(Math.floor(rnd() * 9e5) + 1e5)}`, expiry: addDays(todayStr, 200 + Math.floor(rnd() * 500)), qty: Math.max(20, Math.round((d.reorder || 50) * between(3, 9)), USED.has(d.name) ? 1500 : BIG[d.name] || 0), cost: d.cost }));
await post('/api/clinic/pharmacy/receive', { supplier: 'Grossiste Pharmaceutique du Littoral', reference: 'BL-2026-0912', lines: lines.slice(0, 26) });
await post('/api/clinic/pharmacy/receive', { supplier: 'Centrale d\'achats médicaments essentiels', reference: 'CAM-77120', lines: lines.slice(26) });
// A second, shorter-dated lot on a few drugs (FEFO), and a few lots close to expiry.
await post('/api/clinic/pharmacy/receive', { supplier: 'Grossiste Pharmaceutique du Littoral', reference: 'BL-2026-1003', lines: drugs.filter((_, i) => i % 6 === 0).map((d) => ({ drug_id: d.id, lot: `S${Math.floor(rnd() * 9e4) + 1e4}`, expiry: addDays(todayStr, 25 + Math.floor(rnd() * 60)), qty: 30 + Math.floor(rnd() * 60), cost: d.cost })) });
db.run("UPDATE documents SET date = ?, due_date = ? WHERE company_id = ? AND kind = 'bill'", addDays(todayStr, -32), addDays(todayStr, -2), companyId);
db.run('UPDATE clinic_lots SET received_at = ? WHERE company_id = ?', iso(addDays(todayStr, -32), 600), companyId);
db.run("UPDATE clinic_stock_moves SET at = ? WHERE company_id = ? AND kind = 'in'", iso(addDays(todayStr, -32), 600), companyId);
drugs = await get('/api/clinic/drugs');
const drug = (name) => drugs.find((d) => d.name === name);

// =====================================================================
console.log('Patients…');
const patients = [];
await as('accueil@teknons.cm');
for (let i = 0; i < 230; i++) {
  const r = rnd();
  const age = r < 0.22 ? Math.floor(rnd() * 6) : r < 0.32 ? 6 + Math.floor(rnd() * 12) : r < 0.85 ? 18 + Math.floor(rnd() * 42) : 60 + Math.floor(rnd() * 25);
  const sex = chance(age >= 18 && age < 45 ? 0.6 : 0.5) ? 'F' : 'M';
  const by = new Date().getUTCFullYear() - age;
  const birth = `${by}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`;
  const ins = chance(0.36) ? (age < 5 && chance(0.4) ? INS.mere : pick([INS.littoral, INS.littoral, INS.mutuelle, INS.wouri])) : null;
  const allergies = chance(0.07) ? pick(['Pénicilline', 'Sulfamides', 'Aspirine', 'Pénicilline, arachide', 'Ibuprofène']) : '';
  const chronic = age > 40 && chance(0.35) ? pick(['HTA', 'Diabète de type 2', 'HTA, Diabète de type 2', 'Asthme', 'Arthrose', 'Goutte']) : age < 18 && chance(0.05) ? 'Drépanocytose SS' : '';
  const p = await tryIt(() => post('/api/clinic/patients', {
    last_name: pick(LAST), first_name: sex === 'F' ? pick(FIRST_F) : pick(FIRST_M), sex, birth_date: birth, phone: age < 16 ? phone() : phone(), city: pick(CITY), profession: age < 18 ? 'Élève' : pick(JOBS),
    blood_group: chance(0.4) ? pick(['O+', 'O+', 'A+', 'B+', 'AB+', 'O-', 'A-']) : '', insurer_id: ins?.id || '', insurance_no: ins ? `${ins.name.slice(0, 2).toUpperCase()}-${Math.floor(rnd() * 9e5) + 1e5}` : '',
    emergency_name: chance(0.6) ? `${pick(FIRST_M.concat(FIRST_F))} ${pick(LAST)}` : '', emergency_phone: phone(), allergies, chronic, force: true,
  }));
  if (p) patients.push({ ...p, age, chronic });
}
// Files were opened over the past year.
for (const p of patients) db.run('UPDATE clinic_patients SET created_at = ? WHERE id = ?', iso(addDays(todayStr, -Math.floor(rnd() * 330) - 30), 540), p.id);
const kids = patients.filter((p) => p.age < 15), adults = patients.filter((p) => p.age >= 18), women = patients.filter((p) => p.sex === 'F' && p.age >= 18 && p.age <= 40 && !p.chronic), older = patients.filter((p) => p.age >= 40);

// =====================================================================
// Clinical scenarios (complaint, ICD-10, labs and their results, prescription, vitals)
const V = (o = {}) => ({ bp_sys: Math.round(between(110, 132)), bp_dia: Math.round(between(68, 84)), pulse: Math.round(between(64, 92)), temp: r1(between(36.4, 37.2)), resp: Math.round(between(14, 19)), spo2: Math.round(between(96, 99)), ...o });
const RX = {
  malaria: [['Artéméther-Luméfantrine 20/120 mg', '4 cp', '2 fois par jour', '3 jours', 1], ['Paracétamol 500 mg', '1 g', '3 fois par jour si fièvre', '3 jours', 18]],
  malariaKid: [['Artéméther-Luméfantrine 20/120 mg', '1 cp', '2 fois par jour', '3 jours', 1], ['Paracétamol sirop 120 mg/5 ml', '5 ml', '3 fois par jour', '3 jours', 1]],
  typhoid: [['Ciprofloxacine 500 mg', '1 cp', '2 fois par jour', '7 jours', 14], ['Paracétamol 500 mg', '1 g', '3 fois par jour', '5 jours', 15]],
  angina: [['Amoxicilline 500 mg', '1 g', '2 fois par jour', '6 jours', 24], ['Paracétamol 500 mg', '1 g', '3 fois par jour', '3 jours', 18]],
  anginaAllergic: [['Azithromycine 500 mg', '1 cp', '1 fois par jour', '3 jours', 3], ['Paracétamol 500 mg', '1 g', '3 fois par jour', '3 jours', 18]],
  hta: [['Amlodipine 5 mg', '1 cp', '1 fois par jour le matin', '30 jours', 30]],
  hta2: [['Amlodipine 5 mg', '1 cp', '1 fois par jour', '30 jours', 30], ['Hydrochlorothiazide 25 mg', '1 cp', '1 fois par jour', '30 jours', 30]],
  diabetes: [['Metformine 850 mg', '1 cp', '2 fois par jour aux repas', '30 jours', 60]],
  diarrhea: [['Sels de réhydratation orale', '1 sachet', 'après chaque selle liquide', '3 jours', 6], ['Zinc 20 mg', '1 cp', '1 fois par jour', '10 jours', 10]],
  uti: [['Ciprofloxacine 500 mg', '1 cp', '2 fois par jour', '5 jours', 10]],
  anc: [['Fer + acide folique', '1 cp', '1 fois par jour', '30 jours', 30]],
  gastritis: [['Oméprazole 20 mg', '1 gél', '1 fois par jour avant le petit-déjeuner', '28 jours', 28]],
  back: [['Paracétamol 500 mg', '1 g', '3 fois par jour', '5 jours', 15], ['Diclofénac 50 mg', '1 cp', '2 fois par jour après les repas', '5 jours', 10]],
  worms: [['Albendazole 400 mg', '1 cp', 'dose unique', '1 jour', 1]],
  pneumonia: [['Amoxicilline + acide clavulanique 1 g', '1 cp', '2 fois par jour', '7 jours', 14], ['Paracétamol 500 mg', '1 g', '3 fois par jour', '5 jours', 15]],
  flu: [['Paracétamol 500 mg', '1 g', '3 fois par jour', '3 jours', 9], ['Loratadine 10 mg', '1 cp', '1 fois par jour', '5 jours', 5]],
};
const S = [
  { w: 30, who: 'any', doc: 'ewodo', kidDoc: 'kamga', complaint: 'Fièvre, frissons et céphalées depuis 3 jours', icd: ['B50.9'], dx: 'Paludisme simple à P. falciparum', labs: [['TDR', { result: 'Positif' }]], rx: 'malaria', v: () => V({ temp: r1(between(38.3, 39.8)), pulse: Math.round(between(96, 118)) }), plan: 'CTA 3 jours, hydratation, revoir si la fièvre persiste au-delà de 48 h.' },
  { w: 5, who: 'any', doc: 'ewodo', complaint: 'Fièvre et grande fatigue depuis une semaine, douleurs abdominales', icd: ['A01.0'], dx: 'Fièvre typhoïde probable', labs: [['WIDAL', { to: '≥ 1/320', th: '1/160' }], ['GE', { result: 'Négative', density: '0', species: '—' }]], rx: 'typhoid', v: () => V({ temp: r1(between(38.2, 39.2)) }), plan: 'Fluoroquinolone 7 jours, règles d\'hygiène, contrôle à J7.' },
  { w: 9, who: 'any', doc: 'ewodo', kidDoc: 'kamga', complaint: 'Mal de gorge et fièvre', icd: ['J02.9'], dx: 'Angine érythémateuse', labs: [], rx: 'angina', v: () => V({ temp: r1(between(37.8, 38.9)) }), plan: 'Antibiothérapie 6 jours, antalgiques.' },
  { w: 5, who: 'kids', doc: 'kamga', complaint: 'Nez qui coule, toux légère', icd: ['J00'], dx: 'Rhinopharyngite aiguë', labs: [], rx: 'flu', v: () => V({ temp: r1(between(37.4, 38.3)) }), plan: 'Lavage nasal, antipyrétique si besoin.' },
  { w: 9, who: 'older', doc: 'ewodo', cardio: 0.3, complaint: 'Suivi tension artérielle, céphalées occasionnelles', icd: ['I10'], dx: 'Hypertension artérielle essentielle', labs: [['CREA', { crea: () => Math.round(between(8, 14)), uree: () => r1(between(0.2, 0.45)) }]], labP: 0.3, rx: 'hta', rx2: 'hta2', v: () => V({ bp_sys: Math.round(between(142, 172)), bp_dia: Math.round(between(88, 104)), weight: Math.round(between(68, 98)), height: Math.round(between(158, 182)) }), plan: 'Régime hyposodé, activité physique, contrôle tensionnel dans 1 mois.', fu: 30 },
  { w: 6, who: 'older', doc: 'ewodo', complaint: 'Contrôle diabète, soif et urines fréquentes', icd: ['E11'], dx: 'Diabète de type 2', labs: [['GLY', { gly: () => r1(between(1.25, 2.4)) }], ['HBA1C', { hba1c: () => r1(between(6.8, 9.6)) }]], labP: 0.8, rx: 'diabetes', v: () => V({ glucose: r1(between(1.3, 2.3)), weight: Math.round(between(70, 102)), height: Math.round(between(158, 180)) }), plan: 'Règles hygiéno-diététiques, metformine, HbA1c dans 3 mois.', fu: 30 },
  { w: 6, who: 'kids', doc: 'kamga', complaint: 'Diarrhée liquide et vomissements depuis 2 jours', icd: ['A09'], dx: 'Gastro-entérite aiguë', labs: [], rx: 'diarrhea', v: () => V({ temp: r1(between(37.2, 38.4)), pulse: Math.round(between(100, 130)) }), plan: 'SRO + zinc, poursuivre l\'allaitement, signes de déshydratation expliqués aux parents.' },
  { w: 5, who: 'women', doc: 'ewodo', complaint: 'Brûlures urinaires et envies fréquentes', icd: ['N39.0'], dx: 'Infection urinaire basse', labs: [['ECBU', { leuco: () => Math.round(between(20, 80)), culture: 'Positive', germ: 'E. coli sensible à la ciprofloxacine' }]], rx: 'uti', v: () => V(), plan: 'Boire 2 litres par jour, antibiotique 5 jours.' },
  { w: 7, who: 'women', doc: 'ngo', kind: 'antenatal', complaint: 'Consultation prénatale', icd: ['Z34'], dx: 'Grossesse évolutive', labs: [['GS', null], ['HIV', { result: 'Non réactif' }], ['HBS', null]], labP: 0.4, rx: 'anc', acts: ['ECHO-O'], v: () => V({ weight: Math.round(between(58, 82)) }), plan: 'Supplémentation fer-acide folique, moustiquaire imprégnée, prochaine CPN dans 4 semaines.', fu: 28 },
  { w: 4, who: 'adults', doc: 'ewodo', complaint: 'Brûlures d\'estomac après les repas', icd: ['K29'], dx: 'Gastrite', labs: [], rx: 'gastritis', v: () => V(), plan: 'IPP 4 semaines, éviter AINS, alcool et épices.' },
  { w: 3, who: 'adults', doc: 'ewodo', complaint: 'Douleurs lombaires après effort', icd: ['M54.5'], dx: 'Lombalgie commune', labs: [], rx: 'back', v: () => V(), plan: 'Antalgiques, repos relatif, kinésithérapie si persistance.' },
  { w: 3, who: 'kids', doc: 'kamga', complaint: 'Douleurs abdominales, prurit anal', icd: ['B82'], dx: 'Parasitose intestinale', labs: [], rx: 'worms', v: () => V(), plan: 'Déparasitage de toute la famille.' },
  { w: 2, who: 'any', doc: 'ewodo', kidDoc: 'kamga', complaint: 'Toux productive, fièvre, essoufflement', icd: ['J18.9'], dx: 'Pneumopathie aiguë communautaire', labs: [['CRP', { crp: () => Math.round(between(40, 140)) }], ['NFS', { hb: () => r1(between(11, 14)), ht: () => Math.round(between(34, 42)), gb: () => r1(between(12, 19)), neut: () => Math.round(between(75, 88)), lymph: () => Math.round(between(10, 20)), plq: () => Math.round(between(180, 380)), vgm: () => Math.round(between(80, 92)) }]], rx: 'pneumonia', acts: ['RX-T'], v: () => V({ temp: r1(between(38.4, 39.5)), resp: Math.round(between(22, 28)), spo2: Math.round(between(91, 95)), pulse: Math.round(between(100, 120)) }), plan: 'Antibiothérapie 7 jours, contrôle à 48 h, hospitalisation si aggravation.' },
  { w: 3, who: 'adults', doc: 'ewodo', complaint: 'Courbatures, fièvre, nez bouché', icd: ['J11'], dx: 'Syndrome grippal', labs: [['TDR', { result: 'Négatif' }]], rx: 'flu', v: () => V({ temp: r1(between(37.9, 38.8)) }), plan: 'Traitement symptomatique, repos.' },
  { w: 2, who: 'older', doc: 'fotso', complaint: 'Essoufflement à l\'effort, palpitations', icd: ['I10', 'I50.9'], dx: 'Cardiopathie hypertensive, insuffisance cardiaque débutante', labs: [['ELEC', null], ['CREA', { crea: () => Math.round(between(10, 16)), uree: () => r1(between(0.3, 0.55)) }]], rx: 'hta2', acts: ['ECG'], v: () => V({ bp_sys: Math.round(between(150, 175)), bp_dia: Math.round(between(90, 105)), pulse: Math.round(between(88, 104)) }), plan: 'Bilan cardiologique, diurétique, échocardiographie à programmer.', fu: 21 },
];
const totalW = S.reduce((s, x) => s + x.w, 0);
const scenario = () => { let r = rnd() * totalW; for (const s of S) { r -= s.w; if (r <= 0) return s; } return S[0]; };
const patientFor = (s) => {
  const pool = s.who === 'kids' ? kids : s.who === 'women' ? women : s.who === 'older' ? older : s.who === 'adults' ? adults : patients;
  return pick(pool.length ? pool : patients);
};
const vals = (spec) => Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, typeof v === 'function' ? v() : v]));
const PANEL_DEFAULT = (code) => {
  const t = meta.tariffs.find((x) => x.code === code); const o = {};
  for (const p of t?.params || []) { if (p.choices) o[p.k] = p.choices[0]; else if (p.text) o[p.k] = ''; else if (p.lo != null && p.hi != null) o[p.k] = r1(between(p.lo, p.hi)); }
  return o;
};
const rxLines = (key) => RX[key].map(([name, dose, frequency, duration, qty]) => ({ drug_id: drug(name)?.id, name, dose, frequency, duration, qty }));
// Children under 12 get weight-based syrups instead of adult tablets
const half = (x) => Math.max(1, Math.round(x * 2) / 2);
const ADULT_ONLY = new Set(['Loratadine 10 mg', 'Diclofénac 50 mg', 'Ciprofloxacine 500 mg', 'Oméprazole 20 mg']);
const kidLines = (lines, kg) => lines.filter((l) => !ADULT_ONLY.has(l.name)).map((l) => {
  if (l.name === 'Paracétamol 500 mg') return { ...l, drug_id: drug('Paracétamol sirop 120 mg/5 ml')?.id, name: 'Paracétamol sirop 120 mg/5 ml', dose: `${half(kg * 15 / 24)} ml`, frequency: '4 fois par jour si fièvre', qty: 1 };
  if (/^Amoxicilline/.test(l.name)) return { ...l, drug_id: drug('Amoxicilline suspension 250 mg/5 ml')?.id, name: 'Amoxicilline suspension 250 mg/5 ml', dose: `${half(kg * 25 / 50)} ml`, frequency: '2 fois par jour', qty: 1 };
  if (l.name === 'Zinc 20 mg' && kg < 8) return { ...l, dose: '½ cp' };
  return l;
});

// Id marks to date back everything a scenario created.
const TABLES = { clinic_visits: [], clinic_charges: [], clinic_receipts: [], clinic_prescriptions: [], clinic_orders: [], clinic_stock_moves: [], documents: [], payments: [], journal_entries: [], clinic_certificates: [] };
const marks = () => Object.fromEntries(Object.keys(TABLES).map((t) => [t, db.get(`SELECT COALESCE(MAX(id),0) m FROM ${t}`).m]));
function dateBack(m, d, t0, { wait = 25, dur = 15 } = {}) {
  const at = (min) => iso(d, t0 + min);
  db.run(`UPDATE clinic_visits SET arrived_at = ?, called_at = CASE WHEN called_at IS NULL THEN NULL ELSE ? END, started_at = CASE WHEN started_at IS NULL THEN NULL ELSE ? END,
    ended_at = CASE WHEN ended_at IS NULL THEN NULL ELSE ? END, signed_at = CASE WHEN signed_at IS NULL THEN NULL ELSE ? END, created_at = ? WHERE id > ?`, at(0), at(wait), at(wait + 1), at(wait + dur), at(wait + dur), at(0), m.clinic_visits);
  db.run('UPDATE clinic_charges SET date = ?, created_at = ? WHERE id > ?', d, at(wait + 5), m.clinic_charges);
  db.run('UPDATE clinic_receipts SET created_at = ? WHERE id > ?', at(wait + dur + 8), m.clinic_receipts);
  db.run('UPDATE clinic_prescriptions SET created_at = ? WHERE id > ?', at(wait + dur - 2), m.clinic_prescriptions);
  db.run('UPDATE clinic_certificates SET created_at = ?, from_date = ? WHERE id > ?', at(wait + dur - 1), d, m.clinic_certificates);
  db.run(`UPDATE clinic_orders SET ordered_at = ?, sampled_at = CASE WHEN sampled_at IS NULL THEN NULL ELSE ? END, done_at = CASE WHEN done_at IS NULL THEN NULL ELSE ? END,
    validated_at = CASE WHEN validated_at IS NULL THEN NULL ELSE ? END WHERE id > ?`, at(wait + 6), at(wait + 20), at(wait + 20 + Math.round(between(30, 160))), at(wait + 30 + Math.round(between(60, 200))), m.clinic_orders);
  db.run('UPDATE clinic_stock_moves SET at = ? WHERE id > ?', at(wait + dur + 15), m.clinic_stock_moves);
  db.run('UPDATE documents SET date = ?, due_date = ?, created_at = ?, validated_at = CASE WHEN validated_at IS NULL THEN NULL ELSE ? END WHERE id > ?', d, d, at(wait + dur + 6), at(wait + dur + 6), m.documents);
  db.run('UPDATE payments SET date = ?, created_at = ? WHERE id > ?', d, at(wait + dur + 8), m.payments);
  db.run('UPDATE journal_entries SET date = ?, created_at = ? WHERE id > ?', d, at(wait + dur + 8), m.journal_entries);
}

/** One complete visit: arrival, triage, consultation, tests, prescription, pharmacy, payment. */
async function visit(d, { live = false, stage = 'done', t0 = 480, sc = scenario(), p = null, appt = null } = {}) {
  p = p || patientFor(sc);
  const docKey = p.age < 15 && sc.kidDoc ? sc.kidDoc : sc.cardio && chance(sc.cardio) ? 'fotso' : sc.doc;
  const pr = PR[docKey];
  const m = marks();
  await as('accueil@teknons.cm');
  const v = await tryIt(() => post('/api/clinic/checkin', { patient_id: p.id, practitioner_id: pr.id, kind: sc.kind || (chance(0.06) ? 'emergency' : 'consult'), priority: sc.icd[0] === 'J18.9' ? 3 : chance(0.1) ? 3 : 4, complaint: sc.complaint, appointment_id: appt?.id }));
  if (!v) return null;
  const vit = sc.v();
  if (p.age < 15) { delete vit.bp_sys; delete vit.bp_dia; vit.weight = p.age < 1 ? r1(between(4, 9)) : Math.round(9 + p.age * 2.6 + between(-2, 3)); }
  await as(chance(0.5) ? 'infirmier@teknons.cm' : 'infirmier2@teknons.cm');
  await tryIt(() => put(`/api/clinic/visits/${v.id}`, { vitals: vit }));
  if (stage === 'waiting') { if (!live) dateBack(m, d, t0); return v; }
  await as(DOC[docKey]);
  await tryIt(() => post('/api/clinic/call', { visit_id: v.id }));
  const icd = [...sc.icd];
  const history = `${sc.complaint}. ${pick(['Pas d\'automédication.', 'Automédication par paracétamol sans amélioration.', 'Notion de contage familial.', 'Pas d\'antécédent particulier.'])}`;
  const exam = pick(['Bon état général, conjonctives colorées, pas de signe de déshydratation.', 'État général conservé, examen cardio-pulmonaire normal.', 'Patient fébrile, abdomen souple, pas de raideur méningée.']);
  await tryIt(() => put(`/api/clinic/visits/${v.id}`, { status: 'in_consult', history, exam, diagnosis: sc.dx, icd, plan: sc.plan, follow_up: sc.fu ? addDays(d, sc.fu) : '' }));
  // Tests
  const orders = [];
  if (sc.labs.length && (!sc.labP || chance(sc.labP))) {
    const o = await tryIt(() => post('/api/clinic/orders', { visit_id: v.id, tariff_ids: sc.labs.map(([c]) => tariff(c)), priority: sc.icd[0] === 'J18.9' ? 'urgent' : 'routine', clinical_info: sc.dx }));
    if (o) orders.push(...o);
  }
  if (sc.acts) { const o = await tryIt(() => post('/api/clinic/orders', { visit_id: v.id, tariff_ids: sc.acts.map(tariff), clinical_info: sc.dx })); if (o) orders.push(...o); }
  if (stage === 'consult') { if (!live) dateBack(m, d, t0); return v; }
  if (orders.length && stage !== 'lab_pending') {
    await as('labo@teknons.cm');
    for (const o of orders) {
      await tryIt(() => post(`/api/clinic/orders/${o.id}/sample`));
      const spec = sc.labs.find(([c]) => c === o.test_code)?.[1];
      const values = spec ? { ...PANEL_DEFAULT(o.test_code), ...vals(spec) } : PANEL_DEFAULT(o.test_code);
      const conclusion = o.kind === 'imaging' ? (o.test_code === 'RX-T' ? 'Opacité alvéolaire basale droite, compatible avec une pneumopathie.' : o.test_code === 'ECG' ? 'Rythme sinusal, hypertrophie ventriculaire gauche électrique.' : 'Grossesse monofœtale évolutive, biométrie conforme au terme, placenta normalement inséré.') : '';
      if (o.test_code === 'GE' && values.result === 'Positive') values.density = Math.round(between(2000, 60000));
      await tryIt(() => post(`/api/clinic/orders/${o.id}/results`, { values, conclusion, abnormal: /pneumopathie|hypertrophie/i.test(conclusion), validate: true }));
    }
  }
  // Prescription (the allergy check is real: an allergic patient gets the alternative)
  await as(DOC[docKey]);
  let key = p.age < 15 && sc.rx === 'malaria' ? 'malariaKid' : sc.rx === 'hta' && sc.rx2 && chance(0.3) ? sc.rx2 : sc.rx;
  if (key === 'angina' && /p[ée]nicilline/i.test(p.allergies || '')) key = 'anginaAllergic';
  const rxL = p.age < 12 ? kidLines(rxLines(key), vit.weight || 15) : rxLines(key);
  const rx = rxL.length ? await tryIt(() => post('/api/clinic/prescriptions', { visit_id: v.id, lines: rxL })) : null;
  if (sc.icd[0] === 'J18.9' || chance(0.04)) await tryIt(() => post('/api/clinic/certificates', { visit_id: v.id, kind: 'rest', rest_days: pick([2, 3, 5]), from_date: d }));
  if (chance(0.08)) await tryIt(() => post(`/api/clinic/visits/${v.id}/acts`, { tariff_ids: [tariff(pick(['INJ', 'PANS', 'PERF']))] }));
  if (stage === 'lab_pending') { if (!live) dateBack(m, d, t0); return v; }
  await tryIt(() => post(`/api/clinic/visits/${v.id}/close`, {}));
  // Pharmacy: most patients buy their treatment on site
  if (rx && stage !== 'rx_pending' && chance(0.82)) { await as('pharmacie@teknons.cm'); await tryIt(() => post(`/api/clinic/pharmacy/dispense/${rx.id}`, { bill: false })); }
  // Cashier
  if (stage !== 'unpaid' && chance(live ? 0.9 : 0.975)) {
    await as('accueil@teknons.cm');
    const method = pick(['cash', 'cash', 'cash', 'mtn_momo', 'mtn_momo', 'orange_money', 'orange_money', 'bank']);
    await tryIt(() => post('/api/clinic/collect', { patient_id: p.id, method, reference: method === 'cash' ? '' : `TX${Math.floor(rnd() * 1e9)}` }));
  }
  if (!live) dateBack(m, d, t0, { wait: Math.round(between(10, 70)), dur: Math.round(between(10, 25)) });
  return v;
}

// =====================================================================
console.log('Four weeks of activity…');
const history = [];
for (let back = 28; back >= 1; back--) { const d = addDays(todayStr, -back); if (new Date(d + 'T12:00:00Z').getUTCDay() !== 0) history.push(d); }
for (const d of history) {
  const dow = new Date(d + 'T12:00:00Z').getUTCDay();
  const n = dow === 6 ? 7 + Math.floor(rnd() * 4) : dow === 1 ? 16 + Math.floor(rnd() * 5) : 11 + Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) await visit(d, { t0: 450 + Math.floor((i / n) * 480 + rnd() * 30) });
  process.stdout.write('.');
}
// Rainy-season malaria rise in the last week, and a measles case this week (notifiable)
for (let i = 0; i < 6; i++) await visit(addDays(todayStr, -1 - Math.floor(rnd() * 3)), { t0: 500 + i * 40, sc: S[0] });
process.stdout.write('\n');

console.log('Admissions…');
const bedsFree = async () => (await get('/api/clinic/beds')).filter((b) => b.status === 'free');
await as(email);
const ADM = [
  { ward: /M[ée]decine/, days: 4, reason: 'Paludisme grave, vomissements', icd: 'B50.0', rx: [['Artésunate injectable 60 mg', '2,4 mg/kg IV', 'H0, H12, H24 puis 1/j', '3 jours', 6], ['Sérum glucosé 5 % 500 ml', '500 ml', '3 fois par jour', '2 jours', 6]] },
  { ward: /M[ée]decine/, days: 6, reason: 'Pneumopathie hypoxémiante', icd: 'J18.9', rx: [['Ceftriaxone 1 g injectable', '1 g IV', '1 fois par jour', '7 jours', 7]] },
  { ward: /Maternit/, days: 3, reason: 'Accouchement par voie basse', icd: 'O80', rx: [['Ocytocine 10 UI injectable', '10 UI IM', 'dose unique', '1 jour', 1], ['Fer + acide folique', '1 cp', '1 fois par jour', '30 jours', 30]], act: 'ACC', kid: false, women: true },
  { ward: /P[ée]diatrie/, days: 3, reason: 'Gastro-entérite avec déshydratation', icd: 'A09', rx: [['Ringer lactate 500 ml', '75 ml/kg', 'sur 4 heures', '1 jour', 2], ['Zinc 20 mg', '1 cp', '1 fois par jour', '10 jours', 10]], kid: true },
  { ward: /Chambres priv/, days: 5, reason: 'Crise hypertensive', icd: 'I10', rx: [['Amlodipine 5 mg', '1 cp', '1 fois par jour', '30 jours', 30], ['Furosémide 40 mg', '1 cp', '1 fois par jour', '5 jours', 5]] },
  { ward: /Soins intensifs/, days: 4, reason: 'AVC ischémique', icd: 'I64', rx: [['Acide acétylsalicylique 100 mg', '1 cp', '1 fois par jour', '30 jours', 30]] },
];
const careLabels = ['Toilette et prévention d\'escarres', 'Pose / surveillance de la voie veineuse', 'Glycémie capillaire', 'Pansement'];
// Discharged in the past four weeks
for (let k = 0; k < 14; k++) {
  const a = ADM[k % ADM.length];
  const p = a.women ? pick(women) : a.kid ? pick(kids) : pick(adults);
  const free = (await bedsFree()).filter((b) => a.ward.test(b.ward)); if (!free.length) continue;
  const d0 = addDays(todayStr, -26 + k * 1.6 | 0);
  const m = marks(); const mCare = db.get('SELECT COALESCE(MAX(id),0) m FROM clinic_care').m;
  const adm = await tryIt(() => post('/api/clinic/admissions', { patient_id: p.id, bed_id: free[0].id, reason: a.reason, practitioner_id: a.kid ? PR.kamga.id : a.women ? PR.ngo.id : PR.ewodo.id }));
  if (!adm) continue;
  const pastRx = await tryIt(() => post('/api/clinic/prescriptions', { admission_id: adm.id, lines: a.rx.map(([name, dose, frequency, duration, qty]) => ({ drug_id: drug(name)?.id, name, dose, frequency, duration, qty })) }));
  if (pastRx) { await as('pharmacie@teknons.cm'); await tryIt(() => post(`/api/clinic/pharmacy/dispense/${pastRx.id}`, {})); await as(email); }
  if (a.act) await tryIt(() => post(`/api/clinic/admissions/${adm.id}/charges`, { tariff_id: tariff(a.act) }));
  await as('infirmier@teknons.cm');
  for (let day = 0; day < a.days; day++) for (const h of [7, 13, 19]) {
    await tryIt(() => post(`/api/clinic/admissions/${adm.id}/care`, { kind: 'vitals', vitals: V({ temp: r1(between(36.6, day === 0 ? 39 : 37.6)), spo2: Math.round(between(day === 0 ? 92 : 95, 99)) }) }));
    if (h === 7) await tryIt(() => post(`/api/clinic/admissions/${adm.id}/care`, { kind: 'care', label: pick(careLabels) }));
  }
  await as(email);
  const dis = await tryIt(() => post(`/api/clinic/admissions/${adm.id}/discharge`, { outcome: pick(['healed', 'improved', 'improved']), summary: `Hospitalisation pour ${a.reason.toLowerCase()}. Évolution favorable sous traitement. Sortie avec ordonnance et rendez-vous de contrôle à J7.`, charge: false }));
  if (dis) {
    const bed = db.get('SELECT * FROM clinic_beds WHERE id = ?', free[0].id);
    await tryIt(() => post(`/api/clinic/admissions/${adm.id}/charges`, { description: `Hospitalisation ${bed.ward} – lit ${bed.label} (${a.days} nuits)`, unit_price: bed.daily_rate, qty: a.days, source: 'bed' }));
    await tryIt(() => put(`/api/clinic/beds/${bed.id}`, { status: 'free' }));
    await as('accueil@teknons.cm');
    await tryIt(() => post('/api/clinic/collect', { patient_id: p.id, method: pick(['cash', 'mtn_momo', 'bank']) }));
    await as(email);
  }
  { const out = addDays(d0, a.days); dateBack(m, out < todayStr ? out : addDays(todayStr, -1), 600); }
  db.run('UPDATE clinic_admissions SET admitted_at = ?, discharged_at = ? WHERE id = ?', iso(d0, 660), iso(addDays(d0, a.days), 640), adm.id);
  const cares = db.all('SELECT id FROM clinic_care WHERE admission_id = ? AND id > ? ORDER BY id', adm.id, mCare);
  cares.forEach((c, i) => { const t = iso(d0, 690 + Math.floor((i / Math.max(1, cares.length)) * a.days * 1440)); db.run('UPDATE clinic_care SET created_at = ?, done_at = CASE WHEN done_at IS NULL THEN NULL ELSE ? END WHERE id = ?', t, t, c.id); });
}
// Current inpatients, with planned medication rounds
const current = [];
for (const [i, a] of [ADM[0], ADM[1], ADM[1], ADM[2], ADM[2], ADM[3], ADM[3], ADM[4], ADM[5], ADM[0]].entries()) {
  const p = a.women ? pick(women) : a.kid ? pick(kids) : pick(adults);
  const free = (await bedsFree()).filter((b) => a.ward.test(b.ward)); if (!free.length) continue;
  const since = 1 + (i % 4);
  await as(email);
  const adm = await tryIt(() => post('/api/clinic/admissions', { patient_id: p.id, bed_id: free[0].id, reason: a.reason, practitioner_id: a.kid ? PR.kamga.id : a.women ? PR.ngo.id : PR.ewodo.id, expected_out: addDays(todayStr, 1 + (i % 3)) }));
  if (!adm) continue;
  current.push(adm);
  const mCare = db.get('SELECT COALESCE(MAX(id),0) m FROM clinic_care').m;
  const admRx = await tryIt(() => post('/api/clinic/prescriptions', { admission_id: adm.id, lines: a.rx.map(([name, dose, frequency, duration, qty]) => ({ drug_id: drug(name)?.id, name, dose, frequency, duration, qty })) }));
  // The ward pharmacy served the treatment on admission (charged to the stay)
  if (admRx) { await as('pharmacie@teknons.cm'); await tryIt(() => post(`/api/clinic/pharmacy/dispense/${admRx.id}`, {})); }
  await as('infirmier@teknons.cm');
  for (let k = 0; k < since * 3; k++) await tryIt(() => post(`/api/clinic/admissions/${adm.id}/care`, { kind: 'vitals', vitals: V({ temp: r1(between(36.7, k < 2 ? 39.2 : 37.8)), spo2: Math.round(between(k < 2 ? 91 : 95, 99)) }) }));
  const cares = db.all('SELECT id FROM clinic_care WHERE admission_id = ? AND id > ? ORDER BY id', adm.id, mCare);
  cares.forEach((c, k) => { const t = new Date(Date.now() - (cares.length - k) * 8 * 3600e3).toISOString(); db.run('UPDATE clinic_care SET created_at = ?, done_at = ? WHERE id = ?', t, t, c.id); });
  // Medication rounds every 8 h for 3 days, starting a little before now (some due now)
  const start = new Date(Date.now() - 20 * 60e3 + i * 7 * 60e3).toISOString();
  await tryIt(() => post(`/api/clinic/admissions/${adm.id}/care`, { kind: 'med', label: `${a.rx[0][0]} ${a.rx[0][1]}`, planned_at: start, every_hours: 8, days: 3 }));
  db.run('UPDATE clinic_admissions SET admitted_at = ? WHERE id = ?', new Date(Date.now() - since * 864e5 - 3 * 3600e3).toISOString(), adm.id);
  if (admRx) db.run('UPDATE clinic_prescriptions SET created_at = ? WHERE id = ?', new Date(Date.now() - since * 864e5 - 2.5 * 3600e3).toISOString(), admRx.id);
}
// One patient deteriorating (NEWS2 high) to show the alert
if (current[1]) { await as('infirmier@teknons.cm'); await tryIt(() => post(`/api/clinic/admissions/${current[1].id}/care`, { kind: 'vitals', vitals: { bp_sys: 96, bp_dia: 58, pulse: 124, temp: 39.4, resp: 26, spo2: 90, avpu: 'A' }, note: 'Dyspnée majorée, médecin prévenu.' })); }
// Two beds waiting to be cleaned
for (const b of (await bedsFree()).slice(2, 4)) { await as(email); await tryIt(() => put(`/api/clinic/beds/${b.id}`, { status: 'cleaning' })); }

// =====================================================================
console.log('Appointments, today\'s queue, lab and pharmacy…');
await as('accueil@teknons.cm');
const slotsOf = async (pr, d) => (await get(`/api/clinic/slots?practitioner_id=${pr.id}&date=${d}`)).slice();
// Upcoming week: staff and online bookings, some video consultations
for (let k = 0; k <= 7; k++) {
  const d = addDays(todayStr, k);
  for (const key of Object.keys(PR)) {
    const free = await tryIt(() => slotsOf(PR[key], d)); if (!free?.length) continue;
    const n = Math.min(free.length, key === 'fotso' ? 3 : k === 0 ? 4 : 2 + Math.floor(rnd() * 3));
    for (let j = 0; j < n; j++) {
      const t = free.splice(Math.floor(rnd() * free.length), 1)[0];
      const p = key === 'kamga' ? pick(kids) : key === 'ngo' ? pick(women) : pick(adults);
      if (chance(0.35)) {
        await tryIt(() => guest('POST', '/api/public/clinic/book', { practitioner_id: PR[key].id, date: d, time: t, mode: chance(0.35) ? 'tele' : 'clinic', reason: pick(['Contrôle', 'Fièvre', 'Renouvellement d\'ordonnance', 'Résultats d\'analyses', 'Douleurs', 'Bilan de santé']),
          last_name: p.last_name, first_name: p.first_name, birth_date: p.birth_date, phone: p.phone, sex: p.sex }));
      } else await tryIt(() => post('/api/clinic/appointments', { patient_id: p.id, practitioner_id: PR[key].id, date: d, time: t, mode: chance(0.12) ? 'tele' : 'clinic', reason: pick(['Contrôle', 'Suivi tension', 'CPN', 'Vaccination', 'Résultats', 'Suivi diabète']) }));
    }
  }
}
// Pay a few video consultations by MoMo (simulation)
for (const a of db.all("SELECT * FROM clinic_appointments WHERE company_id = ? AND mode = 'tele' AND document_id IS NOT NULL LIMIT 4", companyId)) {
  const pay = await tryIt(() => guest('POST', `/api/public/clinic/appt/${a.code}/momo`, { phone: '677000111', provider: 'mtn_momo' }));
  if (pay) await tryIt(() => guest('GET', `/api/public/clinic/appt/${a.code}/momo/${pay.payment_id}`));
}
// Past appointments: honoured or missed
for (let back = 1; back <= 20; back++) {
  const d = addDays(todayStr, -back); if (new Date(d + 'T12:00:00Z').getUTCDay() === 0) continue;
  for (let j = 0; j < 4; j++) {
    const key = pick(Object.keys(PR)); const p = pick(patients);
    const id = Number(db.run("INSERT INTO clinic_appointments (company_id, code, patient_id, practitioner_id, date, time, minutes, mode, reason, status, source, created_at) VALUES (?,?,?,?,?,?,20,'clinic',?,?,?,?)",
      companyId, `H${String(Math.floor(rnd() * 36 ** 5).toString(36)).toUpperCase().padStart(5, '0')}`, p.id, PR[key].id, d, `${String(8 + j * 2).padStart(2, '0')}:00`, 'Contrôle', chance(0.84) ? 'done' : 'no_show', chance(0.3) ? 'online' : 'staff', iso(addDays(d, -3), 600)).lastInsertRowid);
    void id;
  }
}

// Today's earlier appointments (the booking API only offers slots still ahead)
const nowMin = () => { const n = new Date(); return n.getUTCHours() * 60 + n.getUTCMinutes(); };
{
  const keys = Object.keys(PR); let k = 0;
  for (let t = 480; t < Math.min(nowMin() + 60 - 20, 1080); t += 40) { // appointment times are local (UTC+1)
    const key = keys[k++ % keys.length]; const p = key === 'kamga' ? pick(kids) : key === 'ngo' ? pick(women) : pick(adults);
    const hhmm = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    if (db.get("SELECT 1 FROM clinic_appointments WHERE practitioner_id = ? AND date = ? AND time = ?", PR[key].id, todayStr, hhmm)) continue;
    db.run("INSERT INTO clinic_appointments (company_id, code, patient_id, practitioner_id, date, time, minutes, mode, reason, status, source, created_at) VALUES (?,?,?,?,?,?,20,?,?,?,?,?)",
      companyId, `H${Math.floor(rnd() * 36 ** 5).toString(36).toUpperCase().padStart(5, '0')}`, p.id, PR[key].id, todayStr, hhmm, chance(0.15) ? 'tele' : 'clinic',
      pick(['Contrôle', 'Suivi tension', 'CPN', 'Résultats', 'Suivi diabète']), chance(0.85) ? 'done' : 'no_show', chance(0.4) ? 'online' : 'staff', iso(addDays(todayStr, -2), 600));
  }
}

// Today: done, in consultation, waiting, tests to run, prescriptions to fill.
// Each live visit is dated back so arrivals spread over the day, the oldest first.
async function liveVisit(ago, opts, times = {}) {
  const m = marks();
  const v = await visit(todayStr, { live: true, ...opts });
  const now = nowMin(); const t0 = Math.max(5, now - ago);
  const room = Math.max(4, now - t0 - 2);
  const wait = Math.min(times.wait ?? Math.round(between(10, 35)), Math.max(2, room - 6));
  const dur = Math.min(times.dur ?? Math.round(between(10, 20)), Math.max(2, room - wait - 2));
  dateBack(m, todayStr, t0, { wait, dur });
  return v;
}
for (let i = 0; i < 7; i++) await liveVisit(330 - i * 30, { stage: i < 2 ? 'rx_pending' : i === 2 ? 'unpaid' : 'done' });
await liveVisit(150, { stage: 'lab_pending', sc: S[12] });
await liveVisit(125, { stage: 'lab_pending', sc: S[5] });
await liveVisit(100, { stage: 'lab_pending', sc: S[0] });
await liveVisit(55, { stage: 'consult' }, { wait: 30, dur: 0 });
await liveVisit(42, { stage: 'consult', sc: S[8] }, { wait: 22, dur: 0 });
for (let i = 0; i < 6; i++) await liveVisit(38 - i * 6, { stage: 'waiting' });
// A measles case today (notifiable within 24 h) to show the surveillance alert
await liveVisit(90, { sc: { w: 0, who: 'kids', doc: 'kamga', complaint: 'Fièvre, éruption cutanée, toux et yeux rouges', icd: ['B05'], dx: 'Rougeole', labs: [], rx: 'flu', v: () => V({ temp: 39.1 }), plan: 'Isolement, vitamine A, déclaration au district de santé.' }, p: pick(kids) });
// Labs: sample some, results awaiting validation, one critical value
await as('labo@teknons.cm');
const toSample = await get('/api/clinic/orders?status=ordered');
for (const o of toSample.slice(0, 2)) await tryIt(() => post(`/api/clinic/orders/${o.id}/sample`));
const sampled = await get('/api/clinic/orders?status=sampled');
if (sampled[0]) await tryIt(() => post(`/api/clinic/orders/${sampled[0].id}/results`, { values: PANEL_DEFAULT(sampled[0].test_code), validate: false }));
await as(email);
const crit = await tryIt(() => post('/api/clinic/orders', { admission_id: current[0]?.id, tariff_ids: [tariff('NFS')], priority: 'urgent', clinical_info: 'Pâleur, asthénie' }));
await as('labo@teknons.cm');
if (crit?.[0]) { await tryIt(() => post(`/api/clinic/orders/${crit[0].id}/sample`)); await tryIt(() => post(`/api/clinic/orders/${crit[0].id}/results`, { values: { hb: 6.1, ht: 19, gb: 9.2, neut: 64, lymph: 28, plq: 210, vgm: 74 }, conclusion: 'Anémie sévère microcytaire. Médecin prévenu par téléphone.', validate: true })); }

// Patients' messages from the portal, one reply
for (const p of patients.slice(10, 14)) {
  const tok = db.get('SELECT portal_token FROM clinic_patients WHERE id = ?', p.id).portal_token;
  await tryIt(() => guest('POST', `/api/public/clinic/s/${tok}/message`, { body: pick(['Bonjour docteur, mes résultats d\'analyses sont-ils disponibles ?', 'Bonjour, puis-je renouveler mon ordonnance de tension sans venir ?', 'La fièvre de mon enfant est tombée, faut-il continuer le traitement jusqu\'au bout ?', 'Bonjour, je voudrais décaler mon rendez-vous de jeudi.']) }));
}
await as(email);
await tryIt(() => post(`/api/clinic/patients/${patients[10].id}/messages`, { body: 'Bonjour, oui vos résultats sont normaux et disponibles dans votre espace. Bonne journée. Dr Ewodo' }));
// Vaccination records for the youngest
await as('infirmier@teknons.cm');
for (const p of kids.filter((x) => x.age < 2).slice(0, 25)) {
  const birth = p.birth_date;
  for (const [vac, dose, wk] of [['BCG', 'D', 0], ['VPO (polio oral)', 'D0', 0], ['Penta (DTC-HepB-Hib)', 'D1', 6], ['Pneumo (PCV13)', 'D1', 6], ['Rota', 'D1', 6], ['Penta (DTC-HepB-Hib)', 'D2', 10], ['Penta (DTC-HepB-Hib)', 'D3', 14]]) {
    const date = addDays(birth, wk * 7); if (date >= todayStr) continue;
    await tryIt(() => post(`/api/clinic/patients/${p.id}/vaccines`, { vaccine: vac, dose, date, lot: `V${Math.floor(rnd() * 9e4) + 1e4}`, next_due: dose === 'D3' ? addDays(birth, 270) : '' }));
  }
}
// Insurer claim for last month, partly paid
await as(email);
const prevMonth = new Date(); prevMonth.setUTCDate(1); prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
const pmFrom = prevMonth.toISOString().slice(0, 10), pmTo = new Date(Date.UTC(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
const claim = await tryIt(() => post('/api/clinic/claims', { insurer_id: INS.wouri.id, from: pmFrom, to: pmTo }));
await tryIt(() => post('/api/clinic/claims', { insurer_id: INS.mere.id, from: pmFrom, to: pmTo }));
if (claim?.document_ids?.[0]) await tryIt(() => post('/api/payments', { direction: 'in', document_id: claim.document_ids[0], amount: Math.round(claim.total * 0.6), method: 'bank', reference: 'VIR-WL-1029', date: todayStr }));
// A counter sale and a lot that has just expired (to show the removal tool)
await as('pharmacie@teknons.cm');
await tryIt(() => post('/api/clinic/pharmacy/counter', { items: [{ drug_id: drug('Paracétamol 500 mg').id, qty: 20 }, { drug_id: drug('Sels de réhydratation orale').id, qty: 4 }], method: 'mtn_momo', reference: 'MP2611' }));
const old = db.get("SELECT l.id FROM clinic_lots l JOIN clinic_drugs d ON d.id = l.drug_id WHERE l.company_id = ? AND d.name = 'Métoclopramide 10 mg' AND l.qty > 0 LIMIT 1", companyId);
if (old) db.run('UPDATE clinic_lots SET expiry = ? WHERE id = ?', addDays(todayStr, -5), old.id);
// The owner reads alerts older than a day, so today's stand out
db.run("UPDATE alerts SET read = 1 WHERE company_id = ? AND created_at < ?", companyId, new Date(Date.now() - 864e5).toISOString());

const star = patients.find((p) => db.get("SELECT COUNT(*) n FROM clinic_visits WHERE patient_id = ? AND status = 'done'", p.id).n >= 2) || patients[0];
const tok = db.get('SELECT portal_token FROM clinic_patients WHERE id = ?', star.id).portal_token;
const s = db.get('SELECT display_token FROM clinic_settings WHERE company_id = ?', companyId);
console.log('\nDemo ready: Polyclinique Horizon Santé');
console.log('  Owner / medical director: demo@teknons.cm / demo1234');
console.log('  Staff (demo1234): dr.kamga@ dr.ngo@ dr.fotso@ infirmier@ labo@ pharmacie@ accueil@ compta@ directeur@ (teknons.cm)');
console.log(`  Patient portal:   /s/${tok}`);
console.log('  Online booking:   /rdv');
console.log(`  Waiting room TV:  /queue/${s.display_token}`);
app.server.close();
app.close?.();
process.exit(0);
