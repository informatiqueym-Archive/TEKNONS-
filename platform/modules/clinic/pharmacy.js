// The clinic pharmacy: drug catalogue with generic names, lots with expiry
// dates (first expired, first out), receptions from suppliers (a supplier bill
// in Compta), dispensing of prescriptions (charged to the patient and insurer),
// counter sales without prescription, stock counts, expiry and reorder alerts.
import { bad, notFound, conflict } from '../../core/errors.js';
import { str, int, num, oneOf, date as vDate } from '../../core/validate.js';
import { now, today } from '../../core/schema.js';
import { audit, raiseAlert } from '../../core/alerts.js';
import { fcfa } from '../../core/format.js';
import * as docs from '../accounting/documents.js';
import * as tr from '../accounting/treasury.js';
import { addCharge, billPatient, ensurePartner, sys } from './billing.js';
import { settingsOf } from './schema.js';

export function drugs(db, companyId, q = {}) {
  const s = `%${str(q.q, 80)}%`;
  const soon = new Date(Date.now() + (Number(q.days) || settingsOf(db, companyId).expiry_alert_days) * 864e5).toISOString().slice(0, 10);
  return db.all(`SELECT d.*, (SELECT MIN(expiry) FROM clinic_lots l WHERE l.drug_id = d.id AND l.qty > 0) next_expiry,
      (SELECT COALESCE(SUM(qty),0) FROM clinic_lots l WHERE l.drug_id = d.id AND l.qty > 0 AND l.expiry <= ?) expiring,
      (SELECT COALESCE(SUM(qty),0) FROM clinic_lots l WHERE l.drug_id = d.id AND l.qty > 0 AND l.expiry < ?) expired,
      (SELECT COALESCE(SUM(-m.qty),0) FROM clinic_stock_moves m WHERE m.drug_id = d.id AND m.kind = 'out' AND m.at >= ?) used30
    FROM clinic_drugs d WHERE d.company_id = ? ${q.all ? '' : 'AND d.active = 1'} AND (d.name LIKE ? OR d.dci LIKE ? OR d.barcode = ? OR d.category LIKE ?)
    ${q.low ? 'AND d.stock <= d.reorder' : ''} ORDER BY d.name LIMIT 1000`, soon, today(), new Date(Date.now() - 30 * 864e5).toISOString(), companyId, s, s, str(q.q, 60), s)
    .map((d) => ({ ...d, days_left: d.used30 > 0 ? Math.round(d.stock / (d.used30 / 30)) : null }));
}

export function saveDrug(db, ctx, b, id) {
  const cid = ctx.user.company_id;
  const cur = id ? db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ?', id, cid) : {};
  if (id && !cur) throw notFound();
  const name = str(b.name ?? cur.name, 160); if (!name) throw bad('name', 'Nom du médicament obligatoire');
  const vals = [str(b.code ?? cur.code, 30), name, str(b.dci ?? cur.dci, 120).toLowerCase(), str(b.form ?? cur.form, 40), str(b.strength ?? cur.strength, 40), str(b.category ?? cur.category, 60), str(b.unit ?? cur.unit ?? 'u', 20),
    int(b.price ?? cur.price ?? 0, 'price', { min: 0 }), int(b.cost ?? cur.cost ?? 0, 'cost', { min: 0 }), num(b.reorder ?? cur.reorder ?? 0, 'reorder', { min: 0 }), str(b.classes ?? cur.classes, 200),
    (b.rx_only ?? cur.rx_only ?? 1) ? 1 : 0, (b.essential ?? cur.essential ?? 1) ? 1 : 0, str(b.barcode ?? cur.barcode, 40), (b.active ?? cur.active ?? 1) ? 1 : 0];
  if (id) db.run('UPDATE clinic_drugs SET code = ?, name = ?, dci = ?, form = ?, strength = ?, category = ?, unit = ?, price = ?, cost = ?, reorder = ?, classes = ?, rx_only = ?, essential = ?, barcode = ?, active = ? WHERE id = ?', ...vals, id);
  else id = Number(db.run('INSERT INTO clinic_drugs (company_id, code, name, dci, form, strength, category, unit, price, cost, reorder, classes, rx_only, essential, barcode, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', cid, ...vals).lastInsertRowid);
  audit(db, ctx, 'save', 'clinic_drug', id, name);
  return db.get('SELECT * FROM clinic_drugs WHERE id = ?', id);
}

export const lotsOf = (db, drugId) => db.all('SELECT * FROM clinic_lots WHERE drug_id = ? AND qty > 0 ORDER BY expiry, id', drugId);

const supplierFor = (db, companyId, name) => {
  const n = str(name, 120); if (!n) return null;
  const s = db.get("SELECT id FROM partners WHERE company_id = ? AND kind = 'supplier' AND name = ? COLLATE NOCASE", companyId, n);
  return s ? s.id : Number(db.run("INSERT INTO partners (company_id, kind, name, created_at) VALUES (?, 'supplier', ?, ?)", companyId, n, now()).lastInsertRowid);
};

/** Goods received from a supplier: lots with expiry, stock up, supplier bill in Compta. */
export function receive(db, bus, ctx, company, b) {
  const lines = (Array.isArray(b.lines) ? b.lines : []).filter((l) => Number(l.qty) > 0);
  if (!lines.length) throw bad('lines', 'Ajoutez au moins une ligne');
  return db.tx(() => {
    const billLines = [];
    for (const [i, l] of lines.entries()) {
      const d = db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ?', l.drug_id, company.id); if (!d) throw bad('drug', `Ligne ${i + 1} : médicament introuvable`);
      const qty = num(l.qty, 'qty', { min: 0.01 }); const cost = int(l.cost ?? d.cost, 'cost', { min: 0 });
      const expiry = vDate(l.expiry, 'expiry'); if (expiry <= today()) throw bad('expiry', `Ligne ${i + 1} : produit déjà périmé`);
      const lot = Number(db.run('INSERT INTO clinic_lots (company_id, drug_id, lot, expiry, qty, cost, received_at) VALUES (?,?,?,?,?,?,?)', company.id, d.id, str(l.lot, 40), expiry, qty, cost, now()).lastInsertRowid);
      // Weighted average cost
      const newCost = d.stock + qty > 0 ? Math.round((Math.max(0, d.stock) * d.cost + qty * cost) / (Math.max(0, d.stock) + qty)) : cost;
      db.run('UPDATE clinic_drugs SET stock = stock + ?, cost = ? WHERE id = ?', qty, newCost, d.id);
      db.run("INSERT INTO clinic_stock_moves (company_id, drug_id, lot_id, kind, qty, ref, note, user_id, at) VALUES (?,?,?, 'in', ?, ?, ?, ?, ?)", company.id, d.id, lot, qty, str(b.reference, 60), str(b.supplier, 120), ctx.user.id, now());
      billLines.push({ description: `${d.name} – lot ${str(l.lot, 40) || '—'} (exp. ${expiry.split('-').reverse().join('/')})`, qty, unit_price: cost, vat_rate: 0, account_code: '6011', kind: 'good' });
    }
    let bill = null;
    const sup = supplierFor(db, company.id, b.supplier);
    if (sup && b.bill !== false && billLines.some((l) => l.unit_price > 0)) {
      const id = docs.createDocument(db, sys(ctx), company, { kind: 'bill', partner_id: sup, date: today(), supplier_ref: str(b.reference, 60), validate: true, subject: 'Réception pharmacie', lines: billLines.filter((l) => l.unit_price > 0) });
      bill = db.get('SELECT id, number, total FROM documents WHERE id = ?', id);
    }
    audit(db, ctx, 'receive', 'clinic_pharmacy', null, `${lines.length} ligne(s) ${b.supplier || ''}`);
    bus?.emit(company.id, 'change', { entity: 'clinic_stock' });
    return { lines: lines.length, bill };
  });
}

/** Takes stock out lot by lot, earliest expiry first. Expired lots are skipped. */
function takeStock(db, ctx, companyId, drug, qty, ref) {
  let left = qty;
  for (const l of lotsOf(db, drug.id).filter((x) => x.expiry >= today())) {
    if (left <= 0) break;
    const t = Math.min(left, l.qty);
    db.run('UPDATE clinic_lots SET qty = qty - ? WHERE id = ?', t, l.id);
    db.run("INSERT INTO clinic_stock_moves (company_id, drug_id, lot_id, kind, qty, ref, user_id, at) VALUES (?,?,?, 'out', ?, ?, ?, ?)", companyId, drug.id, l.id, -t, ref, ctx.user?.id ?? null, now());
    left -= t;
  }
  if (left > 0.0001) throw conflict('stock', `Stock insuffisant pour ${drug.name} (manque ${Math.round(left * 100) / 100} ${drug.unit})`);
  db.run('UPDATE clinic_drugs SET stock = stock - ? WHERE id = ?', qty, drug.id);
}

/** Dispenses a prescription (all or some lines). Each drug is charged to the patient's account. */
export function dispense(db, bus, ctx, company, rxId, b = {}) {
  const rx = db.get('SELECT * FROM clinic_prescriptions WHERE id = ? AND company_id = ?', rxId, company.id); if (!rx) throw notFound('Ordonnance introuvable');
  if (['dispensed', 'cancelled'].includes(rx.status)) throw conflict('state', 'Ordonnance déjà servie ou annulée');
  const lines = db.all('SELECT * FROM clinic_rx_lines WHERE prescription_id = ? ORDER BY id', rx.id);
  const want = new Map((b.lines || []).map((l) => [Number(l.id), Number(l.qty)]));
  return db.tx(() => {
    let n = 0;
    for (const l of lines) {
      if (!l.drug_id) continue;
      const remaining = Math.max(0, l.qty - l.dispensed);
      const qty = want.size ? Math.min(remaining, want.get(l.id) ?? 0) : remaining;
      if (qty <= 0) continue;
      const d = db.get('SELECT * FROM clinic_drugs WHERE id = ?', l.drug_id);
      takeStock(db, ctx, company.id, d, qty, rx.code);
      db.run('UPDATE clinic_rx_lines SET dispensed = dispensed + ? WHERE id = ?', qty, l.id);
      addCharge(db, sys(ctx), company.id, { patient_id: rx.patient_id, visit_id: rx.visit_id, admission_id: rx.admission_id, drug_id: d.id, source: 'pharmacy', description: `${d.name}`, qty, unit_price: d.price });
      n++;
    }
    if (!n) throw bad('nothing', 'Rien à délivrer (médicaments hors stock du catalogue ou déjà servis)');
    const left = db.get('SELECT COUNT(*) n FROM clinic_rx_lines WHERE prescription_id = ? AND drug_id IS NOT NULL AND dispensed < qty', rx.id).n;
    db.run('UPDATE clinic_prescriptions SET status = ? WHERE id = ?', left ? 'partial' : 'dispensed', rx.id);
    audit(db, ctx, 'dispense', 'clinic_prescription', rx.id, rx.code);
    stockAlerts(db, bus, company.id);
    bus?.emit(company.id, 'change', { entity: 'clinic_rx', id: rx.id });
    const bill = b.bill ? billPatient(db, ctx, company, rx.patient_id) : null;
    return { ok: true, lines: n, status: left ? 'partial' : 'dispensed', bill };
  });
}

/** Counter sale without prescription (or for an outside prescription): paid on the spot. */
export function counterSale(db, bus, ctx, company, b) {
  const items = (Array.isArray(b.items) ? b.items : []).filter((x) => Number(x.qty) > 0);
  if (!items.length) throw bad('items', 'Panier vide');
  const method = oneOf(b.method, ['cash', 'mtn_momo', 'orange_money', 'bank'], 'method', 'cash');
  return db.tx(() => {
    const lines = [];
    for (const it of items) {
      const d = db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ? AND active = 1', it.drug_id, company.id); if (!d) throw bad('drug', 'Médicament introuvable');
      if (d.rx_only && !b.prescription_ref) throw bad('rx_only', `${d.name} est délivré uniquement sur ordonnance : indiquez sa référence`);
      takeStock(db, ctx, company.id, d, num(it.qty, 'qty', { min: 0.01 }), 'COMPTOIR');
      lines.push({ description: d.name, qty: Number(it.qty), unit_price: d.price, vat_rate: 0, account_code: '7011', kind: 'good' });
    }
    const patient = b.patient_id ? db.get('SELECT * FROM clinic_patients WHERE id = ? AND company_id = ?', b.patient_id, company.id) : null;
    let partnerId = patient ? ensurePartner(db, company.id, patient) : null;
    if (!partnerId) {
      partnerId = db.get("SELECT id FROM partners WHERE company_id = ? AND kind = 'client' AND name = 'Clients comptoir pharmacie'", company.id)?.id
        ?? Number(db.run("INSERT INTO partners (company_id, kind, name, notes, created_at) VALUES (?, 'client', 'Clients comptoir pharmacie', 'Ventes au comptoir sans dossier patient', ?)", company.id, now()).lastInsertRowid);
    }
    const docId = docs.createDocument(db, sys(ctx), company, { kind: 'invoice', partner_id: partnerId, date: today(), due_date: today(), validate: true, subject: `Vente comptoir pharmacie${b.prescription_ref ? ` – ordonnance ${str(b.prescription_ref, 60)}` : ''}`, lines });
    const doc = db.get('SELECT * FROM documents WHERE id = ?', docId);
    tr.recordPayment(db, sys(ctx), company, { direction: 'in', document_id: docId, amount: doc.total, method, reference: str(b.reference, 80), notes: 'Comptoir pharmacie' });
    audit(db, ctx, 'counter_sale', 'clinic_pharmacy', docId, `${doc.number} ${fcfa(doc.total)}`);
    stockAlerts(db, bus, company.id);
    bus?.emit(company.id, 'change', { entity: 'clinic_stock' });
    return { document_id: docId, number: doc.number, total: doc.total, paid: db.get('SELECT paid FROM documents WHERE id = ?', docId).paid };
  });
}

/** Stock count or write-off: sets a lot (or the whole drug) to the counted quantity. */
export function adjust(db, bus, ctx, companyId, b) {
  const d = db.get('SELECT * FROM clinic_drugs WHERE id = ? AND company_id = ?', b.drug_id, companyId); if (!d) throw notFound();
  const kind = oneOf(b.kind, ['adjust', 'expired'], 'kind', 'adjust');
  return db.tx(() => {
    if (kind === 'expired') {
      let n = 0;
      for (const l of lotsOf(db, d.id).filter((x) => x.expiry < today() || (b.lot_id && x.id === Number(b.lot_id)))) {
        db.run('UPDATE clinic_lots SET qty = 0 WHERE id = ?', l.id);
        db.run("INSERT INTO clinic_stock_moves (company_id, drug_id, lot_id, kind, qty, note, user_id, at) VALUES (?,?,?, 'expired', ?, ?, ?, ?)", companyId, d.id, l.id, -l.qty, `Lot ${l.lot} périmé le ${l.expiry}`, ctx.user.id, now());
        n += l.qty;
      }
      db.run('UPDATE clinic_drugs SET stock = MAX(0, stock - ?) WHERE id = ?', n, d.id);
      audit(db, ctx, 'expire', 'clinic_drug', d.id, `${n} ${d.unit}`);
      return { removed: n };
    }
    const counted = num(b.counted, 'counted', { min: 0 });
    const diff = counted - d.stock;
    if (diff > 0) db.run('INSERT INTO clinic_lots (company_id, drug_id, lot, expiry, qty, cost, received_at) VALUES (?,?,?,?,?,?,?)', companyId, d.id, 'INVENTAIRE', vDate(b.expiry, 'expiry', `${Number(today().slice(0, 4)) + 1}${today().slice(4)}`), diff, d.cost, now());
    else if (diff < 0) {
      let left = -diff;
      for (const l of [...lotsOf(db, d.id)].reverse()) { if (left <= 0) break; const t = Math.min(left, l.qty); db.run('UPDATE clinic_lots SET qty = qty - ? WHERE id = ?', t, l.id); left -= t; }
    }
    db.run('UPDATE clinic_drugs SET stock = ? WHERE id = ?', counted, d.id);
    db.run("INSERT INTO clinic_stock_moves (company_id, drug_id, kind, qty, note, user_id, at) VALUES (?,?, 'adjust', ?, ?, ?, ?)", companyId, d.id, diff, str(b.note, 200) || 'Inventaire', ctx.user.id, now());
    audit(db, ctx, 'count', 'clinic_drug', d.id, `${d.stock} → ${counted}`);
    bus?.emit(companyId, 'change', { entity: 'clinic_stock' });
    return { diff };
  });
}

export function moves(db, companyId, drugId) {
  return db.all('SELECT m.*, l.lot, l.expiry, u.name user_name FROM clinic_stock_moves m LEFT JOIN clinic_lots l ON l.id = m.lot_id LEFT JOIN users u ON u.id = m.user_id WHERE m.company_id = ? AND m.drug_id = ? ORDER BY m.id DESC LIMIT 200', companyId, drugId);
}

/** Reorder and expiry alerts (one per drug until read). */
export function stockAlerts(db, bus, companyId) {
  const s = settingsOf(db, companyId);
  for (const d of db.all('SELECT id, name, stock, reorder, unit FROM clinic_drugs WHERE company_id = ? AND active = 1 AND reorder > 0 AND stock <= reorder', companyId)) {
    raiseAlert(db, bus, companyId, { kind: 'clinic_low_stock', level: 'warning', title: `Stock bas : ${d.name}`, body: `Il reste ${d.stock} ${d.unit} (seuil ${d.reorder}). Pensez à commander.`, entity: 'clinic_drug', entity_id: d.id });
  }
  const soon = new Date(Date.now() + s.expiry_alert_days * 864e5).toISOString().slice(0, 10);
  for (const l of db.all('SELECT l.*, d.name FROM clinic_lots l JOIN clinic_drugs d ON d.id = l.drug_id WHERE l.company_id = ? AND l.qty > 0 AND l.expiry <= ?', companyId, soon)) {
    raiseAlert(db, bus, companyId, { kind: 'clinic_expiry', level: l.expiry < today() ? 'danger' : 'warning', title: `${l.expiry < today() ? 'Périmé' : 'Péremption proche'} : ${l.name}`, body: `Lot ${l.lot || '—'} : ${l.qty} unité(s), expire le ${l.expiry.split('-').reverse().join('/')}.`, entity: 'clinic_lot', entity_id: l.id });
  }
}
