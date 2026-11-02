// Teknons Santé tables: clinic settings, departments, practitioners and their
// hours, patients with insurance cover, tariffs of acts and tests, appointments
// (in person or teleconsultation), visits with vitals and the clinical note,
// prescriptions, lab and imaging orders with results, beds, admissions and the
// nursing chart, vaccinations, secure messages, certificates, the pharmacy
// (drugs, lots with expiry, stock movements), charges split between patient
// and insurer, receipts and insurer claims. Money goes through Teknons Compta.
import crypto from 'node:crypto';
import { DEPARTMENTS, TARIFFS, WARDS, DRUGS, LAB_PANELS } from './ref.js';

export const token = (n = 18) => crypto.randomBytes(n).toString('base64url');
export const shortCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();

export function migrateClinic(db) {
  db.migrate('clinic-001', `
    CREATE TABLE clinic_settings (
      company_id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'clinic',            -- clinic, hospital, medical_center, maternity, dental, lab
      mrn_prefix TEXT NOT NULL DEFAULT 'HS',
      slot_minutes INTEGER NOT NULL DEFAULT 20,
      open_from TEXT NOT NULL DEFAULT '07:30',
      open_to TEXT NOT NULL DEFAULT '18:00',
      booking_open INTEGER NOT NULL DEFAULT 1,
      tele_enabled INTEGER NOT NULL DEFAULT 1,
      tele_base TEXT NOT NULL DEFAULT 'https://meet.jit.si/',
      portal_pay INTEGER NOT NULL DEFAULT 1,
      consult_prepay INTEGER NOT NULL DEFAULT 1,      -- the consultation is paid at the desk before seeing the doctor
      director_name TEXT DEFAULT '',
      director_title TEXT DEFAULT 'Le Directeur médical',
      approval_no TEXT DEFAULT '',                    -- agrément / autorisation d'ouverture MINSANTE
      health_district TEXT DEFAULT '',
      welcome_text TEXT DEFAULT '',
      emergency_phone TEXT DEFAULT '',
      expiry_alert_days INTEGER NOT NULL DEFAULT 90,
      display_token TEXT NOT NULL DEFAULT '',
      drugs_covered INTEGER NOT NULL DEFAULT 1        -- insurers also cover dispensed drugs
    );
    CREATE TABLE clinic_departments (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
      name TEXT NOT NULL, name_en TEXT DEFAULT '', kind TEXT NOT NULL DEFAULT 'consult', color TEXT DEFAULT '#6D3BEB',
      position INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE clinic_practitioners (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      title TEXT DEFAULT 'Dr', specialty TEXT DEFAULT 'Médecine générale', department_id INTEGER,
      order_no TEXT DEFAULT '',                       -- numéro d'inscription à l'Ordre
      consult_fee INTEGER NOT NULL DEFAULT 5000, tele_fee INTEGER NOT NULL DEFAULT 5000,
      room TEXT DEFAULT '', color TEXT DEFAULT '#6D3BEB',
      days TEXT NOT NULL DEFAULT '1,2,3,4,5', start TEXT NOT NULL DEFAULT '08:00', end TEXT NOT NULL DEFAULT '16:00',
      online INTEGER NOT NULL DEFAULT 1, tele INTEGER NOT NULL DEFAULT 1, bio TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE clinic_insurers (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
      partner_id INTEGER NOT NULL REFERENCES partners(id),
      name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'insurer',  -- insurer, mutual, employer, program
      coverage_pct REAL NOT NULL DEFAULT 80, ceiling INTEGER NOT NULL DEFAULT 0, contract_no TEXT DEFAULT '',
      phone TEXT DEFAULT '', email TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE clinic_patients (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
      mrn TEXT NOT NULL, last_name TEXT NOT NULL, first_name TEXT NOT NULL DEFAULT '', sex TEXT NOT NULL DEFAULT 'M',
      birth_date TEXT DEFAULT '', phone TEXT DEFAULT '', phone2 TEXT DEFAULT '', email TEXT DEFAULT '',
      address TEXT DEFAULT '', city TEXT DEFAULT '', profession TEXT DEFAULT '',
      blood_group TEXT DEFAULT '', allergies TEXT DEFAULT '', chronic TEXT DEFAULT '', treatments TEXT DEFAULT '',
      pregnant INTEGER NOT NULL DEFAULT 0,
      emergency_name TEXT DEFAULT '', emergency_phone TEXT DEFAULT '',
      insurer_id INTEGER REFERENCES clinic_insurers(id), insurance_no TEXT DEFAULT '', coverage_pct REAL,
      partner_id INTEGER REFERENCES partners(id),     -- the patient as a Compta customer
      portal_token TEXT NOT NULL, card_code TEXT NOT NULL,
      notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deceased','archived')),
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX clinic_patients_mrn ON clinic_patients(company_id, mrn);
    CREATE UNIQUE INDEX clinic_patients_tok ON clinic_patients(portal_token);
    CREATE UNIQUE INDEX clinic_patients_card ON clinic_patients(card_code);
    CREATE INDEX clinic_patients_phone ON clinic_patients(company_id, phone);
    CREATE TABLE clinic_tariffs (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL,
      code TEXT NOT NULL, name TEXT NOT NULL, name_en TEXT DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'act',               -- consult, lab, imaging, care, act, surgery, other
      price INTEGER NOT NULL DEFAULT 0, department_id INTEGER, account_code TEXT NOT NULL DEFAULT '7061',
      params TEXT NOT NULL DEFAULT '[]', tat_hours INTEGER NOT NULL DEFAULT 0, covered INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE UNIQUE INDEX clinic_tariffs_code ON clinic_tariffs(company_id, code);
    CREATE TABLE clinic_appointments (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, code TEXT NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES clinic_patients(id), practitioner_id INTEGER REFERENCES clinic_practitioners(id), department_id INTEGER,
      date TEXT NOT NULL, time TEXT NOT NULL, minutes INTEGER NOT NULL DEFAULT 20,
      mode TEXT NOT NULL DEFAULT 'clinic' CHECK (mode IN ('clinic','tele')),
      reason TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','confirmed','arrived','done','no_show','cancelled')),
      source TEXT NOT NULL DEFAULT 'staff', visit_id INTEGER, tele_room TEXT DEFAULT '', document_id INTEGER,
      created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX clinic_appt_code ON clinic_appointments(code);
    CREATE INDEX clinic_appt_day ON clinic_appointments(company_id, date);
    CREATE TABLE clinic_visits (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, number TEXT NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES clinic_patients(id), practitioner_id INTEGER REFERENCES clinic_practitioners(id), department_id INTEGER,
      appointment_id INTEGER, kind TEXT NOT NULL DEFAULT 'consult',  -- consult, emergency, tele, followup, antenatal, care
      status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_consult','done','cancelled')),
      queue_no INTEGER NOT NULL DEFAULT 0, priority INTEGER NOT NULL DEFAULT 4,   -- triage 1 (red) to 5 (blue)
      arrived_at TEXT NOT NULL, called_at TEXT, started_at TEXT, ended_at TEXT,
      complaint TEXT DEFAULT '', vitals TEXT NOT NULL DEFAULT '{}', news INTEGER,
      history TEXT DEFAULT '', exam TEXT DEFAULT '', diagnosis TEXT DEFAULT '', icd TEXT NOT NULL DEFAULT '[]', plan TEXT DEFAULT '', notes TEXT DEFAULT '',
      follow_up TEXT DEFAULT '', signed_at TEXT, signed_by INTEGER, created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE INDEX clinic_visits_day ON clinic_visits(company_id, arrived_at);
    CREATE INDEX clinic_visits_patient ON clinic_visits(patient_id);
    CREATE TABLE clinic_insurer_claims (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, number TEXT NOT NULL, insurer_id INTEGER NOT NULL REFERENCES clinic_insurers(id),
      period_from TEXT NOT NULL, period_to TEXT NOT NULL, document_id INTEGER, count INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE TABLE clinic_charges (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, patient_id INTEGER NOT NULL REFERENCES clinic_patients(id),
      visit_id INTEGER, admission_id INTEGER, appointment_id INTEGER, order_id INTEGER, tariff_id INTEGER, drug_id INTEGER,
      source TEXT NOT NULL DEFAULT 'act',             -- consult, act, care, surgery, lab, imaging, bed, pharmacy, other
      description TEXT NOT NULL, qty REAL NOT NULL DEFAULT 1, unit_price INTEGER NOT NULL DEFAULT 0, amount INTEGER NOT NULL DEFAULT 0,
      insurer_id INTEGER, insurer_amount INTEGER NOT NULL DEFAULT 0, patient_amount INTEGER NOT NULL DEFAULT 0,
      document_id INTEGER, claim_id INTEGER, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','billed','cancelled')),
      date TEXT NOT NULL, created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE INDEX clinic_charges_patient ON clinic_charges(patient_id, status);
    CREATE TABLE clinic_receipts (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, number TEXT NOT NULL, patient_id INTEGER NOT NULL,
      amount INTEGER NOT NULL, method TEXT NOT NULL, reference TEXT DEFAULT '', payer TEXT DEFAULT '', allocations TEXT NOT NULL DEFAULT '[]',
      created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE TABLE clinic_prescriptions (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, code TEXT NOT NULL,
      visit_id INTEGER, admission_id INTEGER, patient_id INTEGER NOT NULL REFERENCES clinic_patients(id), practitioner_id INTEGER,
      notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','partial','dispensed','cancelled')),
      alerts TEXT NOT NULL DEFAULT '[]', created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX clinic_rx_code ON clinic_prescriptions(code);
    CREATE TABLE clinic_rx_lines (
      id INTEGER PRIMARY KEY, prescription_id INTEGER NOT NULL REFERENCES clinic_prescriptions(id) ON DELETE CASCADE,
      drug_id INTEGER, name TEXT NOT NULL, dose TEXT DEFAULT '', frequency TEXT DEFAULT '', duration TEXT DEFAULT '', route TEXT DEFAULT '',
      qty REAL NOT NULL DEFAULT 1, instructions TEXT DEFAULT '', dispensed REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE clinic_orders (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, number TEXT NOT NULL, code TEXT NOT NULL,
      visit_id INTEGER, admission_id INTEGER, patient_id INTEGER NOT NULL REFERENCES clinic_patients(id), practitioner_id INTEGER,
      tariff_id INTEGER NOT NULL REFERENCES clinic_tariffs(id), kind TEXT NOT NULL DEFAULT 'lab' CHECK (kind IN ('lab','imaging')),
      priority TEXT NOT NULL DEFAULT 'routine', status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','sampled','done','validated','cancelled')),
      clinical_info TEXT DEFAULT '', results TEXT NOT NULL DEFAULT '[]', conclusion TEXT DEFAULT '', critical INTEGER NOT NULL DEFAULT 0, abnormal INTEGER NOT NULL DEFAULT 0,
      ordered_at TEXT NOT NULL, sampled_at TEXT, done_at TEXT, validated_at TEXT, validated_by INTEGER, done_by INTEGER, created_by INTEGER
    );
    CREATE UNIQUE INDEX clinic_orders_code ON clinic_orders(code);
    CREATE INDEX clinic_orders_status ON clinic_orders(company_id, status);
    CREATE TABLE clinic_beds (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, ward TEXT NOT NULL, room TEXT NOT NULL, label TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'standard', daily_rate INTEGER NOT NULL DEFAULT 15000,
      status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied','cleaning','blocked')), position INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE clinic_admissions (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, number TEXT NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES clinic_patients(id), bed_id INTEGER REFERENCES clinic_beds(id), practitioner_id INTEGER, visit_id INTEGER,
      reason TEXT DEFAULT '', diagnosis TEXT DEFAULT '', icd TEXT NOT NULL DEFAULT '[]',
      admitted_at TEXT NOT NULL, expected_out TEXT DEFAULT '', discharged_at TEXT,
      status TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted','discharged')),
      outcome TEXT DEFAULT '', summary TEXT DEFAULT '', created_by INTEGER
    );
    CREATE TABLE clinic_care (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, admission_id INTEGER NOT NULL REFERENCES clinic_admissions(id),
      kind TEXT NOT NULL DEFAULT 'note',              -- vitals, med, care, note
      label TEXT DEFAULT '', drug_id INTEGER, planned_at TEXT, done_at TEXT,
      status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('planned','done','missed')),
      vitals TEXT NOT NULL DEFAULT '{}', news INTEGER, note TEXT DEFAULT '', user_id INTEGER, created_at TEXT NOT NULL
    );
    CREATE INDEX clinic_care_adm ON clinic_care(admission_id);
    CREATE TABLE clinic_vaccines (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, patient_id INTEGER NOT NULL REFERENCES clinic_patients(id),
      vaccine TEXT NOT NULL, dose TEXT DEFAULT '', date TEXT NOT NULL, lot TEXT DEFAULT '', next_due TEXT DEFAULT '', user_id INTEGER, created_at TEXT NOT NULL
    );
    CREATE TABLE clinic_messages (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, patient_id INTEGER NOT NULL REFERENCES clinic_patients(id),
      direction TEXT NOT NULL CHECK (direction IN ('in','out')), body TEXT NOT NULL, user_id INTEGER, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE clinic_certificates (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, code TEXT NOT NULL, patient_id INTEGER NOT NULL REFERENCES clinic_patients(id), visit_id INTEGER,
      kind TEXT NOT NULL DEFAULT 'rest',              -- rest (arrêt de travail), fitness (aptitude), medical (certificat médical)
      body TEXT DEFAULT '', rest_days INTEGER NOT NULL DEFAULT 0, from_date TEXT DEFAULT '', practitioner_id INTEGER, created_by INTEGER, created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX clinic_cert_code ON clinic_certificates(code);
    CREATE TABLE clinic_drugs (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, code TEXT DEFAULT '', name TEXT NOT NULL, dci TEXT DEFAULT '', form TEXT DEFAULT '', strength TEXT DEFAULT '',
      category TEXT DEFAULT '', unit TEXT DEFAULT 'u', price INTEGER NOT NULL DEFAULT 0, cost INTEGER NOT NULL DEFAULT 0, stock REAL NOT NULL DEFAULT 0, reorder REAL NOT NULL DEFAULT 0,
      classes TEXT DEFAULT '', rx_only INTEGER NOT NULL DEFAULT 1, essential INTEGER NOT NULL DEFAULT 1, barcode TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1
    );
    CREATE UNIQUE INDEX clinic_drugs_name ON clinic_drugs(company_id, name);
    CREATE TABLE clinic_lots (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, drug_id INTEGER NOT NULL REFERENCES clinic_drugs(id),
      lot TEXT NOT NULL DEFAULT '', expiry TEXT NOT NULL, qty REAL NOT NULL DEFAULT 0, cost INTEGER NOT NULL DEFAULT 0, received_at TEXT NOT NULL
    );
    CREATE INDEX clinic_lots_drug ON clinic_lots(drug_id, expiry);
    CREATE TABLE clinic_stock_moves (
      id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, drug_id INTEGER NOT NULL, lot_id INTEGER,
      kind TEXT NOT NULL CHECK (kind IN ('in','out','adjust','expired')), qty REAL NOT NULL, ref TEXT DEFAULT '', note TEXT DEFAULT '', user_id INTEGER, at TEXT NOT NULL
    );
  `);
}

const SETTINGS_DEFAULT = { kind: 'clinic', mrn_prefix: 'HS' };

/** Default departments, tariffs, wards, drug catalogue and accounts of a new clinic (idempotent). */
export function seedCompanyClinic(db, companyId) {
  if (db.get('SELECT 1 FROM clinic_settings WHERE company_id = ?', companyId)) return;
  db.tx(() => {
    db.run('INSERT INTO clinic_settings (company_id, kind, mrn_prefix, display_token) VALUES (?,?,?,?)', companyId, SETTINGS_DEFAULT.kind, SETTINGS_DEFAULT.mrn_prefix, token(12));
    for (const [code, name] of [['7061', 'Consultations et actes médicaux'], ['7062', "Examens de laboratoire et d'imagerie"], ['7063', 'Hospitalisation et hébergement'], ['7011', 'Ventes de médicaments et consommables']]) {
      if (!db.get('SELECT 1 FROM accounts WHERE company_id = ? AND code = ?', companyId, code)) db.run('INSERT INTO accounts (company_id, code, name, class) VALUES (?,?,?,7)', companyId, code, name);
    }
    if (!db.get('SELECT 1 FROM accounts WHERE company_id = ? AND code = ?', companyId, '6011')) db.run('INSERT INTO accounts (company_id, code, name, class) VALUES (?,?,?,6)', companyId, '6011', 'Achats de médicaments et consommables médicaux');
    const dep = {};
    DEPARTMENTS.forEach(([name, en, kind, color], i) => {
      const id = Number(db.run('INSERT INTO clinic_departments (company_id, name, name_en, kind, color, position) VALUES (?,?,?,?,?,?)', companyId, name, en, kind, color, i).lastInsertRowid);
      dep[kind] = dep[kind] || id;
    });
    for (const [code, name, en, kind, price, dk, account, panel, tat] of TARIFFS) {
      db.run('INSERT INTO clinic_tariffs (company_id, code, name, name_en, kind, price, department_id, account_code, params, tat_hours) VALUES (?,?,?,?,?,?,?,?,?,?)',
        companyId, code, name, en, kind, price, dep[dk] || null, account, JSON.stringify(panel ? LAB_PANELS[panel] : []), tat || 0);
    }
    let pos = 0;
    for (const [ward, kind, rate, rooms] of WARDS) {
      for (const [room, n] of rooms) for (let i = 1; i <= n; i++) db.run('INSERT INTO clinic_beds (company_id, ward, room, label, kind, daily_rate, position) VALUES (?,?,?,?,?,?,?)', companyId, ward, room, n > 1 ? `${room}-${i}` : room, kind, rate, pos++);
    }
    for (const [name, dci, form, strength, category, price, cost, classes, rx, reorder, unit] of DRUGS) {
      db.run('INSERT INTO clinic_drugs (company_id, name, dci, form, strength, category, price, cost, classes, rx_only, reorder, unit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', companyId, name, dci, form, strength, category, price, cost, classes, rx, reorder, unit);
    }
    // Health services and medicines are VAT-exempt in Cameroon (CGI art. 128).
    db.run('UPDATE companies SET vat_enabled = 0 WHERE id = ?', companyId);
  });
}

export const settingsOf = (db, companyId) => {
  let s = db.get('SELECT * FROM clinic_settings WHERE company_id = ?', companyId);
  if (!s) { seedCompanyClinic(db, companyId); s = db.get('SELECT * FROM clinic_settings WHERE company_id = ?', companyId); }
  return s;
};

export const nameOf = (p) => (p ? `${p.last_name} ${p.first_name || ''}`.trim() : '');
export const ageOf = (birth, at = new Date()) => {
  if (!birth) return null;
  const b = new Date(birth + 'T00:00:00Z'); if (Number.isNaN(b.getTime())) return null;
  let a = at.getUTCFullYear() - b.getUTCFullYear();
  const m = at.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < b.getUTCDate())) a--;
  return a;
};
export const ageLabel = (birth) => {
  const a = ageOf(birth); if (a == null) return '';
  if (a >= 2) return `${a} ans`;
  const b = new Date(birth + 'T00:00:00Z'); const n = new Date();
  const months = (n.getUTCFullYear() - b.getUTCFullYear()) * 12 + n.getUTCMonth() - b.getUTCMonth() - (n.getUTCDate() < b.getUTCDate() ? 1 : 0);
  return `${Math.max(0, months)} mois`;
};
