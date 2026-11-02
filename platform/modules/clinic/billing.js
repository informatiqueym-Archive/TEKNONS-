// Money in Teknons Santé. Every act, test, drug or night in a bed becomes a
// charge, split between the patient and the insurer (cover % and yearly
// ceiling). The patient's share is billed as a VAT-exempt Compta invoice and
// paid at the desk (cash, card, MTN MoMo, Orange Money) or from the patient
// portal; the insurer's share is claimed once a month with a detailed claim
// (bordereau) that becomes one invoice to the insurer.
import { bad, notFound, conflict } from '../../core/errors.js';
import { str, int, num, oneOf, date as vDate } from '../../core/validate.js';
import { now, today } from '../../core/schema.js';
import { audit } from '../../core/alerts.js';
import { fcfa } from '../../core/format.js';
import { PROVIDERS } from '../../core/payments/mobile-money.js';
import { nextNumber } from '../accounting/ledger.js';
import * as docs from '../accounting/documents.js';
import * as tr from '../accounting/treasury.js';
import { nameOf } from './schema.js';

export const sys = (ctx) => ({ ...ctx, user: { ...(ctx.user || {}), role: 'owner' } });
export const ACCOUNT_FOR = { consult: '7061', act: '7061', care: '7061', surgery: '7061', other: '7061', lab: '7062', imaging: '7062', bed: '7063', pharmacy: '7011' };
export const SOURCES = Object.keys(ACCOUNT_FOR);

/** The patient as a Compta customer (created on first bill). */
export function ensurePartner(db, companyId, p) {
  if (p.partner_id && db.get('SELECT 1 FROM partners WHERE id = ? AND company_id = ?', p.partner_id, companyId)) return p.partner_id;
  const id = Number(db.run("INSERT INTO partners (company_id, kind, name, phone, email, address, city, notes, created_at) VALUES (?, 'client', ?, ?, ?, ?, ?, ?, ?)",
    companyId, nameOf(p), p.phone || '', p.email || '', p.address || '', p.city || '', `Patient ${p.mrn}`, now()).lastInsertRowid);
  db.run('UPDATE clinic_patients SET partner_id = ? WHERE id = ?', id, p.id);
  return id;
}

/** Insurer and cover rate that apply to a patient today. */
export function coverOf(db, p) {
  if (!p?.insurer_id) return { insurer: null, pct: 0 };
  const ins = db.get('SELECT * FROM clinic_insurers WHERE id = ? AND active = 1', p.insurer_id);
  if (!ins) return { insurer: null, pct: 0 };
  return { insurer: ins, pct: p.coverage_pct == null ? ins.coverage_pct : p.coverage_pct };
}

/** Records a charge on the patient's account with the insurer / patient split. Returns the charge id. */
export function addCharge(db, ctx, companyId, b) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', b.patient_id, companyId);
  if (!p) throw notFound('Patient introuvable');
  const tariff = b.tariff_id ? db.get('SELECT * FROM clinic_tariffs WHERE id = ? AND company_id = ?', b.tariff_id, companyId) : null;
  if (b.tariff_id && !tariff) throw bad('tariff', 'Acte introuvable');
  const source = oneOf(b.source || (tariff?.kind === 'consult' ? 'consult' : tariff?.kind) || 'act', SOURCES, 'source', 'act');
  const description = str(b.description || tariff?.name, 300); if (!description) throw bad('description', 'Désignation obligatoire');
  const qty = num(b.qty, 'qty', { min: 0.01, def: 1 });
  const unit = int(b.unit_price ?? tariff?.price ?? 0, 'unit_price', { min: 0 });
  const amount = Math.round(qty * unit);
  const { insurer, pct } = coverOf(db, p);
  const settings = db.get('SELECT drugs_covered FROM clinic_settings WHERE company_id = ?', companyId);
  const covered = insurer && (tariff ? tariff.covered : source !== 'pharmacy' || settings?.drugs_covered) && b.covered !== false;
  let ins = covered ? Math.round(amount * pct / 100) : 0;
  if (covered && insurer.ceiling > 0) {
    const used = db.get("SELECT COALESCE(SUM(insurer_amount),0) s FROM clinic_charges WHERE patient_id = ? AND insurer_id = ? AND status != 'cancelled' AND substr(date,1,4) = ?", p.id, insurer.id, today().slice(0, 4)).s;
    ins = Math.max(0, Math.min(ins, insurer.ceiling - used));
  }
  const r = db.run(`INSERT INTO clinic_charges (company_id, patient_id, visit_id, admission_id, appointment_id, order_id, tariff_id, drug_id, source, description, qty, unit_price, amount, insurer_id, insurer_amount, patient_amount, date, created_by, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, companyId, p.id, b.visit_id || null, b.admission_id || null, b.appointment_id || null, b.order_id || null, tariff?.id ?? null, b.drug_id || null,
  source, description, qty, unit, amount, ins ? insurer.id : null, ins, amount - ins, vDate(b.date, 'date', today()), ctx.user?.id ?? null, now());
  return Number(r.lastInsertRowid);
}

export function cancelCharge(db, ctx, companyId, id) {
  const c = db.get('SELECT * FROM clinic_charges WHERE id = ? AND company_id = ?', id, companyId); if (!c) throw notFound();
  if (c.status !== 'pending') throw conflict('billed', 'Cette ligne est déjà facturée : faites un avoir depuis la facture');
  db.run("UPDATE clinic_charges SET status = 'cancelled' WHERE id = ?", c.id);
  audit(db, ctx, 'cancel', 'clinic_charge', c.id, c.description);
  return { ok: true };
}

/**
 * Bills the patient's share of the pending charges as one invoice (validated in Compta).
 * Lines fully covered by the insurer are marked billed without a patient line.
 */
export function billPatient(db, ctx, company, patientId, { charge_ids } = {}) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, company.id); if (!p) throw notFound('Patient introuvable');
  let rows = db.all("SELECT c.*, i.name insurer_name FROM clinic_charges c LEFT JOIN clinic_insurers i ON i.id = c.insurer_id WHERE c.patient_id = ? AND c.company_id = ? AND c.status = 'pending' ORDER BY c.id", p.id, company.id);
  if (Array.isArray(charge_ids) && charge_ids.length) { const set = new Set(charge_ids.map(Number)); rows = rows.filter((r) => set.has(r.id)); }
  if (!rows.length) return null;
  return db.tx(() => {
    const payable = rows.filter((r) => r.patient_amount > 0);
    let docId = null, number = null;
    if (payable.length) {
      const lines = payable.map((r) => {
        const tariff = r.tariff_id ? db.get('SELECT account_code FROM clinic_tariffs WHERE id = ?', r.tariff_id) : null;
        const disc = r.amount ? (r.insurer_amount / r.amount) * 100 : 0;
        return { description: r.insurer_amount ? `${r.description} · prise en charge ${r.insurer_name} ${fcfa(r.insurer_amount)}` : r.description, qty: r.qty, unit_price: r.unit_price, discount: disc, vat_rate: 0,
          account_code: tariff?.account_code || ACCOUNT_FOR[r.source] || '7061', kind: r.source === 'pharmacy' ? 'good' : 'service' };
      });
      // Rounding of the line discount must give exactly the patient's share.
      for (let i = 0; i < lines.length; i++) {
        const gross = Math.round(lines[i].qty * lines[i].unit_price);
        if (Math.round(gross * (1 - lines[i].discount / 100)) !== payable[i].patient_amount) { lines[i].qty = 1; lines[i].unit_price = payable[i].patient_amount; lines[i].discount = 0; }
      }
      const chunks = [];
      for (let i = 0; i < lines.length; i += 190) chunks.push([lines.slice(i, i + 190), payable.slice(i, i + 190)]);
      for (const [ls, cs] of chunks) {
        docId = docs.createDocument(db, sys(ctx), company, { kind: 'invoice', partner_id: ensurePartner(db, company.id, p), date: today(), due_date: today(), validate: true,
          subject: `Soins – ${nameOf(p)} (dossier ${p.mrn})`, notes: 'Prestations de santé exonérées de TVA.', lines: ls });
        for (const c of cs) db.run("UPDATE clinic_charges SET status = 'billed', document_id = ? WHERE id = ?", docId, c.id);
      }
      number = db.get('SELECT number FROM documents WHERE id = ?', docId).number;
    }
    for (const r of rows.filter((x) => x.patient_amount <= 0)) db.run("UPDATE clinic_charges SET status = 'billed' WHERE id = ?", r.id);
    audit(db, ctx, 'bill', 'clinic_patient', p.id, number || 'tiers payant');
    return { document_id: docId, number, total: payable.reduce((s, r) => s + r.patient_amount, 0), insurer_total: rows.reduce((s, r) => s + r.insurer_amount, 0) };
  });
}

/** Everything the patient owes or paid: pending charges, invoices, receipts. */
export function account(db, companyId, patientId) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, companyId); if (!p) throw notFound('Patient introuvable');
  const pending = db.all("SELECT c.*, i.name insurer_name FROM clinic_charges c LEFT JOIN clinic_insurers i ON i.id = c.insurer_id WHERE c.patient_id = ? AND c.status = 'pending' ORDER BY c.id", p.id);
  const invoices = p.partner_id ? db.all("SELECT id, number, date, due_date, total, paid, credited, status, pay_token, (total - paid - credited) balance FROM documents WHERE partner_id = ? AND kind = 'invoice' AND status IN ('open','partial','paid') ORDER BY date DESC, id DESC LIMIT 60", p.partner_id) : [];
  const open = invoices.filter((d) => ['open', 'partial'].includes(d.status));
  return {
    pending, invoices, receipts: db.all('SELECT id, number, amount, method, reference, created_at FROM clinic_receipts WHERE patient_id = ? ORDER BY id DESC LIMIT 40', p.id),
    pending_patient: pending.reduce((s, c) => s + c.patient_amount, 0), pending_insurer: pending.reduce((s, c) => s + c.insurer_amount, 0),
    open_balance: open.reduce((s, d) => s + d.balance, 0),
    due: pending.reduce((s, c) => s + c.patient_amount, 0) + open.reduce((s, d) => s + d.balance, 0),
    insurer_year: db.get("SELECT COALESCE(SUM(insurer_amount),0) s FROM clinic_charges WHERE patient_id = ? AND status != 'cancelled' AND substr(date,1,4) = ?", p.id, today().slice(0, 4)).s,
  };
}

/** Desk payment: bills what is pending, then spreads the amount over the oldest open invoices. One receipt. */
export function collect(db, bus, ctx, company, b) {
  const p = db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', b.patient_id, company.id); if (!p) throw notFound('Patient introuvable');
  const method = oneOf(b.method, ['cash', 'bank', 'cheque', 'mtn_momo', 'orange_money'], 'method', 'cash');
  return db.tx(() => {
    billPatient(db, ctx, company, p.id, { charge_ids: b.charge_ids });
    const fresh = db.get('SELECT partner_id FROM clinic_patients WHERE id = ?', p.id);
    const open = fresh.partner_id ? db.all("SELECT id, number, (total - paid - credited) balance FROM documents WHERE partner_id = ? AND kind = 'invoice' AND status IN ('open','partial') ORDER BY date, id", fresh.partner_id)
      .filter((d) => !b.document_ids?.length || b.document_ids.map(Number).includes(d.id)) : [];
    const due = open.reduce((s, d) => s + d.balance, 0);
    if (!due) throw conflict('nothing_due', 'Ce patient ne doit rien pour le moment');
    let left = b.amount === undefined || b.amount === '' ? due : int(b.amount, 'amount', { min: 1 });
    if (left > due) throw bad('overpay', `Le montant dépasse le reste à payer (${fcfa(due)})`);
    const allocations = [];
    for (const d of open) {
      if (left <= 0) break;
      const a = Math.min(left, d.balance);
      const pid = tr.recordPayment(db, sys(ctx), company, { direction: 'in', document_id: d.id, amount: a, method, reference: str(b.reference, 80), phone: str(b.phone, 30), notes: `Teknons Santé – ${nameOf(p)}` });
      allocations.push({ document_id: d.id, number: d.number, amount: a, payment_id: pid });
      left -= a;
    }
    const total = allocations.reduce((s, x) => s + x.amount, 0);
    const number = nextNumber(db, company.id, `RCS-${today().slice(0, 4)}`, 5);
    const rid = Number(db.run('INSERT INTO clinic_receipts (company_id, number, patient_id, amount, method, reference, payer, allocations, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      company.id, number, p.id, total, method, str(b.reference, 80), str(b.payer, 120), JSON.stringify(allocations), ctx.user?.id ?? null, now()).lastInsertRowid);
    audit(db, ctx, 'collect', 'clinic_receipt', rid, `${number} ${fcfa(total)} ${nameOf(p)}`);
    bus?.emit(company.id, 'change', { entity: 'clinic_payment', id: p.id });
    return { id: rid, number, amount: total, allocations, balance: account(db, company.id, p.id).due };
  });
}

/** Mobile Money prompt on the patient's phone for the oldest open invoice (desk or portal). */
export async function momoForPatient(db, momo, ctx, company, patientId, { provider, phone, amount, document_id, replaceStale = false }) {
  billPatient(db, ctx, company, patientId);
  const p = db.get('SELECT partner_id FROM clinic_patients WHERE id = ? AND company_id = ?', patientId, company.id);
  const open = p?.partner_id ? db.all("SELECT * FROM documents WHERE partner_id = ? AND kind = 'invoice' AND status IN ('open','partial') ORDER BY date, id", p.partner_id) : [];
  const doc = document_id ? open.find((d) => d.id === Number(document_id)) : open[0];
  if (!doc) throw conflict('nothing_due', 'Rien à payer pour le moment');
  const balance = doc.total - doc.paid - doc.credited;
  const value = amount ? Math.min(Number(amount), balance) : balance;
  const id = await tr.startMomo(db, momo, company, doc, { provider: oneOf(provider, Object.keys(PROVIDERS), 'provider'), phone, amount: value, userId: ctx.user?.id ?? null, replaceStale });
  return { payment_id: id, document: doc.number, amount: value };
}

// ---------------- Insurers ----------------
export function insurers(db, companyId) {
  return db.all(`SELECT i.*, (SELECT COUNT(*) FROM clinic_patients p WHERE p.insurer_id = i.id AND p.status = 'active') patients,
      (SELECT COALESCE(SUM(insurer_amount),0) FROM clinic_charges c WHERE c.insurer_id = i.id AND c.claim_id IS NULL AND c.status != 'cancelled') to_claim,
      (SELECT COALESCE(SUM(d.total - d.paid - d.credited),0) FROM documents d WHERE d.partner_id = i.partner_id AND d.kind = 'invoice' AND d.status IN ('open','partial')) receivable
    FROM clinic_insurers i WHERE i.company_id = ? ORDER BY i.active DESC, i.name`, companyId);
}

export function saveInsurer(db, ctx, b, id) {
  const cid = ctx.user.company_id;
  const cur = id ? db.get('SELECT * FROM clinic_insurers WHERE id = ? AND company_id = ?', id, cid) : {};
  if (id && !cur) throw notFound();
  const name = str(b.name ?? cur.name, 120); if (!name) throw bad('name', "Nom de l'assureur obligatoire");
  const vals = [name, oneOf(b.kind ?? cur.kind ?? 'insurer', ['insurer', 'mutual', 'employer', 'program'], 'kind'), Math.max(0, Math.min(100, num(b.coverage_pct ?? cur.coverage_pct ?? 80, 'coverage_pct', { min: 0 }))),
    int(b.ceiling ?? cur.ceiling ?? 0, 'ceiling', { min: 0 }), str(b.contract_no ?? cur.contract_no, 60), str(b.phone ?? cur.phone, 40), str(b.email ?? cur.email, 120)];
  if (id) {
    db.run('UPDATE clinic_insurers SET name = ?, kind = ?, coverage_pct = ?, ceiling = ?, contract_no = ?, phone = ?, email = ?, active = ? WHERE id = ?', ...vals, b.active === undefined ? cur.active : (b.active ? 1 : 0), id);
    db.run('UPDATE partners SET name = ?, phone = ?, email = ? WHERE id = ?', name, vals[5], vals[6], cur.partner_id);
  } else {
    const pid = Number(db.run("INSERT INTO partners (company_id, kind, name, phone, email, notes, created_at) VALUES (?, 'client', ?, ?, ?, 'Assureur / tiers payant', ?)", cid, name, vals[5], vals[6], now()).lastInsertRowid);
    id = Number(db.run('INSERT INTO clinic_insurers (company_id, partner_id, name, kind, coverage_pct, ceiling, contract_no, phone, email) VALUES (?,?,?,?,?,?,?,?,?)', cid, pid, ...vals).lastInsertRowid);
  }
  audit(db, ctx, id ? 'save' : 'create', 'clinic_insurer', id);
  return db.get('SELECT * FROM clinic_insurers WHERE id = ?', id);
}

/** Lines not yet claimed from an insurer over a period, one per charge. */
export function claimable(db, companyId, insurerId, from, to) {
  return db.all(`SELECT c.*, p.mrn, p.last_name, p.first_name, p.insurance_no FROM clinic_charges c JOIN clinic_patients p ON p.id = c.patient_id
    WHERE c.company_id = ? AND c.insurer_id = ? AND c.claim_id IS NULL AND c.status != 'cancelled' AND c.insurer_amount > 0 AND c.date BETWEEN ? AND ? ORDER BY p.last_name, c.date, c.id`, companyId, insurerId, from, to);
}

/** Creates the monthly claim: one invoice to the insurer, one line per patient. */
export function createClaim(db, bus, ctx, company, b) {
  const ins = db.get('SELECT * FROM clinic_insurers WHERE id = ? AND company_id = ?', b.insurer_id, company.id); if (!ins) throw notFound('Assureur introuvable');
  const from = vDate(b.from, 'from'), to = vDate(b.to, 'to', today());
  if (from > to) throw bad('period', 'Période invalide');
  const rows = claimable(db, company.id, ins.id, from, to);
  if (!rows.length) throw conflict('empty', 'Aucune prestation à réclamer sur cette période');
  return db.tx(() => {
    const byPatient = new Map();
    for (const r of rows) {
      const k = r.patient_id;
      if (!byPatient.has(k)) byPatient.set(k, { name: `${r.last_name} ${r.first_name}`, mrn: r.mrn, no: r.insurance_no, n: 0, amount: 0, ids: [], src: {} });
      const x = byPatient.get(k); x.n++; x.amount += r.insurer_amount; x.ids.push(r.id); x.src[ACCOUNT_FOR[r.source] || '7061'] = (x.src[ACCOUNT_FOR[r.source] || '7061'] || 0) + r.insurer_amount;
    }
    const number = nextNumber(db, company.id, `BRD-${to.slice(0, 7)}`, 3);
    const lines = [];
    for (const x of byPatient.values()) {
      for (const [account, v] of Object.entries(x.src)) lines.push({ description: `${x.name} – dossier ${x.mrn}${x.no ? ` – assuré n° ${x.no}` : ''} (${x.n} prestation${x.n > 1 ? 's' : ''})`, qty: 1, unit_price: v, vat_rate: 0, account_code: account, kind: account === '7011' ? 'good' : 'service' });
    }
    const docIds = [];
    for (let i = 0; i < lines.length; i += 190) {
      docIds.push(docs.createDocument(db, sys(ctx), company, { kind: 'invoice', partner_id: ins.partner_id, date: today(), validate: true,
        subject: `Bordereau ${number} – tiers payant du ${from.split('-').reverse().join('/')} au ${to.split('-').reverse().join('/')}`, notes: `Contrat ${ins.contract_no || '—'}. Détail des prestations joint (bordereau ${number}).`, lines: lines.slice(i, i + 190) }));
    }
    const total = rows.reduce((s, r) => s + r.insurer_amount, 0);
    const id = Number(db.run('INSERT INTO clinic_insurer_claims (company_id, number, insurer_id, period_from, period_to, document_id, count, total, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      company.id, number, ins.id, from, to, docIds[0], rows.length, total, ctx.user.id, now()).lastInsertRowid);
    for (const r of rows) db.run('UPDATE clinic_charges SET claim_id = ? WHERE id = ?', id, r.id);
    audit(db, ctx, 'claim', 'clinic_insurer', ins.id, `${number} ${fcfa(total)}`);
    bus?.emit(company.id, 'change', { entity: 'clinic_claim', id });
    return { id, number, total, count: rows.length, patients: byPatient.size, document_ids: docIds };
  });
}

export function claims(db, companyId, insurerId) {
  return db.all(`SELECT c.*, i.name insurer_name, d.number doc_number, d.status doc_status, d.paid doc_paid, d.total doc_total FROM clinic_insurer_claims c JOIN clinic_insurers i ON i.id = c.insurer_id LEFT JOIN documents d ON d.id = c.document_id
    WHERE c.company_id = ? ${insurerId ? 'AND c.insurer_id = ' + Number(insurerId) : ''} ORDER BY c.id DESC LIMIT 200`, companyId);
}
export function claimDetail(db, companyId, id) {
  const c = db.get('SELECT c.*, i.name insurer_name, i.contract_no, i.coverage_pct FROM clinic_insurer_claims c JOIN clinic_insurers i ON i.id = c.insurer_id WHERE c.id = ? AND c.company_id = ?', id, companyId);
  if (!c) throw notFound();
  c.lines = db.all('SELECT ch.*, p.mrn, p.last_name, p.first_name, p.insurance_no FROM clinic_charges ch JOIN clinic_patients p ON p.id = ch.patient_id WHERE ch.claim_id = ? ORDER BY p.last_name, ch.date, ch.id', id);
  return c;
}

/** Cancels the unpaid part of an invoice with a validated credit note (never by deleting it). */
export function creditUnpaid(db, ctx, company, documentId) {
  const d = db.get('SELECT * FROM documents WHERE id = ? AND company_id = ?', documentId, company.id);
  if (!d || !['open', 'partial'].includes(d.status) || d.paid > 0) return null;
  const id = docs.creditNoteFor(db, sys(ctx), company, d.id);
  docs.validateDocument(db, sys(ctx), company, id);
  db.run("UPDATE clinic_charges SET status = 'cancelled' WHERE document_id = ?", d.id);
  return id;
}
