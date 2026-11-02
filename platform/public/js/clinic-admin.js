// Teknons Santé, management side: the cashier (patient accounts, receipts,
// Mobile Money), insurers and monthly claims, activity reports, disease
// surveillance for the health district, patient messages and the clinic's
// settings (practitioners, departments, tariffs, beds, public links).
import { api } from './api.js';
import { state, L, esc, money, moneyShort, num, dt, today, icon, can, canAny, table, field, dialog, toast, offlineNote, qs } from './ui.js';
import { R, S, fail, kpi, wa, pname, dtm, methodName, refreshMeta, pickPatient } from './clinic.js';

const SRC = { consult: ['Consultations', 'Consultations'], lab: ['Laboratoire', 'Lab'], imaging: ['Imagerie', 'Imaging'], pharmacy: ['Pharmacie', 'Pharmacy'], bed: ['Hospitalisation', 'Wards'], surgery: ['Chirurgie', 'Surgery'], act: ['Actes', 'Procedures'], care: ['Soins', 'Care'], other: ['Autres', 'Other'] };
const srcName = (s) => L(...(SRC[s] || [s, s]));
const INS_KIND = { insurer: ['Assurance', 'Insurer'], mutual: ['Mutuelle', 'Mutual'], employer: ['Employeur', 'Employer'], program: ['Programme / ONG', 'Programme / NGO'] };

// ===================== Cashier =====================
R('/clinic/cashier', async (ctx) => {
  const q = ctx.query;
  if (q.patient) return patientAccount(ctx, Number(q.patient));
  const date = q.date || today();
  ctx.title(L('Caisse et facturation', 'Cashier & billing'));
  ctx.actions(`<button class="btn primary" id="find">${icon('cash')}<span class="hide-m">${L('Encaisser un patient', 'Take a payment')}</span></button>`);
  const d = await api.get('/api/clinic/cashier?date=' + date);
  document.getElementById('find').addEventListener('click', async () => { const p = await pickPatient({ title: L('Encaisser…', 'Take payment from…') }); if (p) location.hash = `#/clinic/cashier?patient=${p.id}`; });
  const by = Object.fromEntries(d.methods.map((m) => [m.method, m]));
  ctx.el.innerHTML = `${offlineNote(d)}<div class="filters"><input class="in" type="date" id="d" value="${date}"><span class="muted sm">${L('Journée de caisse', 'Cash day')}</span></div>
    <div class="grid g4" style="margin-bottom:14px">${kpi(L('Encaissé (accueil)', 'Collected (desk)'), money(d.total), `${d.receipts.length} ${L('reçu(s)', 'receipt(s)')}`, 'accent')}
      ${kpi(L('Espèces', 'Cash'), money(by.cash?.v || 0), `${by.cash?.n || 0} ${L('opération(s)', 'payment(s)')}`)}
      ${kpi('Mobile Money', money((by.mtn_momo?.v || 0) + (by.orange_money?.v || 0)), `MTN ${moneyShort(by.mtn_momo?.v || 0)} · Orange ${moneyShort(by.orange_money?.v || 0)}`)}
      ${kpi(L('Pharmacie et en ligne', 'Pharmacy & online'), money(d.counter.v + d.online.v), `${L('comptoir', 'counter')} ${moneyShort(d.counter.v)} · ${L('portail', 'portal')} ${moneyShort(d.online.v)}`)}</div>
    <div class="grid g2"><div class="card"><h3>${L('Patients avec prestations à régler', 'Patients with items to pay')}</h3>
      ${d.waiting.map((p) => `<a class="lrow row between" href="#/clinic/cashier?patient=${p.id}"><span>${pname(p)} <span class="muted sm mono">${esc(p.mrn)}</span><div class="muted sm">${p.n} ${L('prestation(s)', 'item(s)')}${p.insurer_name ? ` · ${esc(p.insurer_name)} ${money(p.insurer)}` : ''}</div></span><b class="num">${money(p.due)}</b></a>`).join('') || `<p class="muted">${L('Tout est réglé.', 'All settled.')}</p>`}</div>
    <div class="card"><h3>${L('Reçus de la journée', 'Receipts of the day')}</h3>${table({ rows: d.receipts, columns: [
      { label: 'N°', render: (r) => `<a class="mono" target="_blank" href="/api/clinic/receipts/${r.id}">${esc(r.number)}</a>` }, { label: L('Patient', 'Patient'), render: (r) => pname(r) },
      { label: L('Mode', 'Method'), render: (r) => esc(methodName(r.method)), hideM: true }, { label: L('Caissier', 'Cashier'), key: 'by_name', hideM: true }, { label: L('Montant', 'Amount'), cls: 'r', render: (r) => `<b>${money(r.amount)}</b>` }] })}</div></div>`;
  document.getElementById('d').addEventListener('change', (e) => { location.hash = '#/clinic/cashier?date=' + e.target.value; });
}, true);

async function patientAccount(ctx, id) {
  const a = await api.get(`/api/clinic/account/${id}`, { cache: false });
  const p = a.patient;
  ctx.title(`${L('Caisse', 'Cashier')} · ${p.last_name} ${p.first_name || ''}`);
  ctx.actions(`<a class="btn" href="#/clinic/cashier">${L('Retour', 'Back')}</a><a class="btn" href="#/clinic/patient/${p.id}">${icon('user')}<span class="hide-m">${L('Dossier', 'File')}</span></a>`);
  const momoOk = S().momo?.mtn_momo || S().momo?.orange_money || S().momo?.mode === 'sandbox';
  ctx.el.innerHTML = `<div class="grid g4" style="margin-bottom:14px">${kpi(L('Reste à payer', 'Balance due'), money(a.due), p.insurer_name ? `${esc(p.insurer_name)} · ${p.cover} %` : L('patient payant', 'self-pay'), a.due ? 'warn' : 'accent')}
    ${kpi(L('Prestations non facturées', 'Unbilled items'), money(a.pending_patient), `${a.pending.length} ${L('ligne(s)', 'line(s)')}`)}${kpi(L('Part assureur', 'Insurer share'), money(a.pending_insurer), L('réclamée au bordereau mensuel', 'claimed in the monthly batch'))}${kpi(L('Factures ouvertes', 'Open invoices'), money(a.open_balance))}</div>
  <div class="grid g2"><div class="card"><h3>${L('Prestations à facturer', 'Items to bill')}</h3>
    ${a.pending.length ? `<table class="tbl"><thead><tr><th></th><th>${L('Prestation', 'Item')}</th><th class="r">${L('Total', 'Total')}</th><th class="r">${L('Assureur', 'Insurer')}</th><th class="r">${L('Patient', 'Patient')}</th></tr></thead><tbody>
      ${a.pending.map((c) => `<tr><td><input type="checkbox" data-ch="${c.id}" checked></td><td>${esc(c.description)}${c.qty !== 1 ? ` × ${num(c.qty)}` : ''}<div class="muted sm">${dt(c.date)} · ${esc(srcName(c.source))}</div></td><td class="r num">${money(c.amount)}</td><td class="r num muted">${money(c.insurer_amount)}</td><td class="r num"><b>${money(c.patient_amount)}</b></td></tr>`).join('')}</tbody></table>
      ${canAny('reception', 'treasury', 'settings') ? `<p class="muted sm">${L('Décochez une ligne pour la laisser en attente (ex. examen non encore fait).', 'Untick a line to leave it pending.')}</p>` : ''}` : `<p class="muted">${L('Aucune prestation en attente.', 'Nothing pending.')}</p>`}
    <h3 style="margin-top:14px">${L('Factures', 'Invoices')}</h3>${table({ rows: a.invoices, href: (d) => `#/doc/${d.id}`, columns: [{ label: 'N°', render: (d) => `<span class="mono">${esc(d.number)}</span>` }, { label: 'Date', render: (d) => dt(d.date) }, { label: L('Total', 'Total'), cls: 'r', render: (d) => money(d.total) }, { label: L('Reste', 'Due'), cls: 'r', render: (d) => (d.balance > 0 ? `<b>${money(d.balance)}</b>` : `<span class="pill ok">${L('payée', 'paid')}</span>`) }] })}</div>
  <div class="card cl-pay"><h3>${icon('cash')} ${L('Encaissement', 'Payment')}</h3>
    <div class="cl-due"><small>${L('À payer', 'To pay')}</small><b class="num" id="due">${money(a.due)}</b></div>
    <form id="pay" class="form f2">${field({ name: 'amount', label: L('Montant reçu', 'Amount received'), type: 'number', value: a.due || '', min: 1 })}
      ${field({ name: 'method', label: L('Mode', 'Method'), type: 'select', options: [['cash', L('Espèces', 'Cash')], ['mtn_momo', 'MTN MoMo'], ['orange_money', 'Orange Money'], ['bank', L('Carte / virement', 'Card / transfer')], ['cheque', L('Chèque', 'Cheque')]] })}
      ${field({ name: 'reference', label: L('Référence (transaction, chèque)', 'Reference') })}${field({ name: 'payer', label: L('Payé par (si autre)', 'Paid by (if other)') })}
      <div style="grid-column:1/-1" class="row"><button class="btn primary grow" ${a.due ? '' : 'disabled'}>${icon('check')} ${L('Encaisser et imprimer le reçu', 'Collect and print receipt')}</button></div></form>
    ${momoOk && a.due ? `<div class="cl-momo"><b>${L('Paiement sur le téléphone du patient', 'Payment on the patient\'s phone')}</b><p class="muted sm">${L('Le patient valide avec son code secret MoMo. Aucune manipulation d\'espèces.', 'The patient confirms with their MoMo PIN.')}</p>
      <div class="row" style="gap:6px"><input class="in grow" id="mphone" value="${esc(p.phone || '')}" placeholder="6XX XX XX XX"><button class="btn" id="momo">${L('Envoyer la demande', 'Send request')}</button></div></div>` : ''}
    ${p.phone && a.due ? `<a class="btn" style="margin-top:10px;width:100%" target="_blank" href="${wa(p.phone, `Bonjour ${p.first_name || ''}, votre solde à ${state.me.company.name} est de ${money(a.due)}. Vous pouvez le régler par MoMo depuis votre espace santé.`)}">${icon('phone')} ${L('Rappel WhatsApp', 'WhatsApp reminder')}</a>` : ''}
    <h3 style="margin-top:14px">${L('Reçus', 'Receipts')}</h3>${a.receipts.map((r) => `<div class="lrow row between sm"><a target="_blank" class="mono" href="/api/clinic/receipts/${r.id}">${esc(r.number)}</a><span>${dtm(r.created_at)} · ${esc(methodName(r.method))}</span><b class="num">${money(r.amount)}</b></div>`).join('') || `<p class="muted sm">—</p>`}</div></div>`;
  const chosen = () => [...ctx.el.querySelectorAll('[data-ch]')].filter((c) => c.checked).map((c) => Number(c.dataset.ch));
  const recalc = () => { const sel = new Set(chosen()); const due = a.open_balance + a.pending.filter((c) => sel.has(c.id)).reduce((s, c) => s + c.patient_amount, 0); document.getElementById('due').textContent = money(due); ctx.el.querySelector('[name=amount]').value = due || ''; };
  ctx.el.querySelectorAll('[data-ch]').forEach((c) => c.addEventListener('change', recalc));
  document.getElementById('pay').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const r = await api.post('/api/clinic/collect', { patient_id: p.id, amount: f.amount.value, method: f.method.value, reference: f.reference.value, payer: f.payer.value, charge_ids: a.pending.length ? chosen() : undefined });
      toast(`${L('Reçu', 'Receipt')} ${r.number} · ${money(r.amount)}`, 'ok');
      window.open(`/api/clinic/receipts/${r.id}?print=1`, '_blank');
      ctx.rerender();
    } catch (er) { fail(er); btn.disabled = false; }
  });
  document.getElementById('momo')?.addEventListener('click', async () => {
    try { const r = await api.post('/api/clinic/momo', { patient_id: p.id, phone: document.getElementById('mphone').value }); toast(`${L('Demande envoyée', 'Request sent')} · ${money(r.amount)} · ${r.document}`, 'ok'); } catch (e) { fail(e); }
  });
}

// ===================== Insurers and claims =====================
R('/clinic/insurers', async (ctx) => {
  ctx.title(L('Assureurs et tiers payant', 'Insurers & claims'));
  const edit = canAny('settings', 'accounting');
  ctx.actions(edit ? `<button class="btn primary" id="add">${icon('plus')}<span class="hide-m">${L('Assureur', 'Insurer')}</span></button>` : '');
  const [ins, claims] = await Promise.all([api.get('/api/clinic/insurers'), api.get('/api/clinic/claims').catch(() => [])]);
  document.getElementById('add')?.addEventListener('click', async () => { if (await insurerDialog()) { await refreshMeta(); ctx.rerender(); } });
  const toClaim = ins.reduce((s, i) => s + i.to_claim, 0), recv = ins.reduce((s, i) => s + i.receivable, 0);
  ctx.el.innerHTML = `<div class="grid g4" style="margin-bottom:14px">${kpi(L('À réclamer', 'To claim'), money(toClaim), L('prestations pas encore sur un bordereau', 'not yet on a claim'), toClaim ? 'warn' : 'accent')}${kpi(L('Bordereaux non réglés', 'Unpaid claims'), money(recv), L('créances sur les assureurs', 'receivable from insurers'))}${kpi(L('Assureurs actifs', 'Active insurers'), ins.filter((i) => i.active).length)}${kpi(L('Patients couverts', 'Covered patients'), num(ins.reduce((s, i) => s + i.patients, 0)))}</div>
    <div class="cl-ins">${ins.map((i) => `<div class="card ${i.active ? '' : 'dim'}"><div class="row between"><h3 style="margin:0">${esc(i.name)}</h3><span class="pill">${esc(L(...(INS_KIND[i.kind] || [i.kind, i.kind])))}</span></div>
      <div class="muted sm">${i.coverage_pct} % ${L('pris en charge', 'covered')}${i.ceiling ? ` · ${L('plafond', 'ceiling')} ${money(i.ceiling)}/${L('an', 'yr')}` : ''}${i.contract_no ? ` · ${L('contrat', 'contract')} ${esc(i.contract_no)}` : ''}</div>
      <div class="lrow row between"><span>${L('Patients', 'Patients')}</span><b>${num(i.patients)}</b></div><div class="lrow row between"><span>${L('À réclamer', 'To claim')}</span><b class="num">${money(i.to_claim)}</b></div><div class="lrow row between"><span>${L('Créance', 'Receivable')}</span><b class="num">${money(i.receivable)}</b></div>
      <div class="row" style="gap:6px;margin-top:8px">${can('accounting') || can('settings') ? `<button class="btn sm primary" data-claim="${i.id}" ${i.to_claim ? '' : 'disabled'}>${icon('invoice')} ${L('Bordereau', 'Claim')}</button>` : ''}${edit ? `<button class="btn sm" data-edit="${i.id}">${icon('edit')}</button>` : ''}<a class="btn sm" href="#/partner/${i.partner_id}">${L('Compte', 'Account')}</a></div></div>`).join('') || `<div class="card empty"><b>${L('Aucun assureur', 'No insurer')}</b></div>`}</div>
    <h3 style="margin-top:18px">${L('Bordereaux', 'Claims')}</h3>${table({ rows: claims, columns: [
      { label: 'N°', render: (c) => `<a class="mono" target="_blank" href="/api/clinic/claims/${c.id}/print">${esc(c.number)}</a>` }, { label: L('Assureur', 'Insurer'), key: 'insurer_name' },
      { label: L('Période', 'Period'), render: (c) => `${dt(c.period_from)} → ${dt(c.period_to)}`, hideM: true }, { label: L('Prestations', 'Items'), cls: 'r', render: (c) => num(c.count), hideM: true },
      { label: L('Montant', 'Amount'), cls: 'r', render: (c) => `<b>${money(c.total)}</b>` },
      { label: L('Statut', 'Status'), render: (c) => (c.doc_status === 'paid' ? `<span class="pill ok">${L('réglé', 'paid')}</span>` : c.doc_paid ? `<span class="pill info">${L('partiel', 'partial')}</span>` : `<span class="pill warn">${L('en attente', 'pending')}</span>`) },
      { label: '', cls: 'r', render: (c) => `<a class="btn sm" href="/api/clinic/claims/${c.id}/print?format=xlsx">Excel</a> ${c.document_id ? `<a class="btn sm" href="#/doc/${c.document_id}">${L('Facture', 'Invoice')}</a>` : ''}` }] })}`;
  ctx.el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => { if (await insurerDialog(ins.find((i) => i.id === Number(b.dataset.edit)))) { await refreshMeta(); ctx.rerender(); } }));
  ctx.el.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', async () => {
    const i = ins.find((x) => x.id === Number(b.dataset.claim));
    const m0 = new Date(); m0.setUTCDate(1); m0.setUTCMonth(m0.getUTCMonth() - 1);
    const from = m0.toISOString().slice(0, 10), to = new Date(Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const r = await dialog({ title: `${L('Bordereau', 'Claim')} · ${i.name}`, wide: true, submit: L('Créer le bordereau et la facture', 'Create claim and invoice'),
      body: `<div class="form f2">${field({ name: 'from', label: L('Du', 'From'), type: 'date', value: from })}${field({ name: 'to', label: L('Au', 'To'), type: 'date', value: to })}</div><div id="prev" class="muted sm"></div>`,
      onOpen: (d) => { const load = async () => { const x = await api.get(`/api/clinic/claimable?insurer_id=${i.id}&from=${d.querySelector('[name=from]').value}&to=${d.querySelector('[name=to]').value}`, { cache: false }).catch(() => null); d.querySelector('#prev').innerHTML = x ? `<b>${x.rows.length}</b> ${L('prestation(s) pour', 'item(s) for')} <b>${x.patients}</b> ${L('patient(s)', 'patient(s)')} · <b>${money(x.total)}</b>` : ''; }; d.addEventListener('change', load); load(); },
      onSubmit: (x) => api.post('/api/clinic/claims', { insurer_id: i.id, ...x }) });
    if (r) { toast(`${r.number} · ${money(r.total)}`, 'ok'); window.open(`/api/clinic/claims/${r.id}/print?print=1`, '_blank'); ctx.rerender(); }
  }));
}, true);

function insurerDialog(i = null) {
  return dialog({ title: i ? i.name : L('Nouvel assureur', 'New insurer'), wide: true,
    body: `<div class="form f3">${[{ name: 'name', label: L('Nom', 'Name'), required: true }, { name: 'kind', label: L('Type', 'Type'), type: 'select', options: Object.entries(INS_KIND).map(([k, v]) => [k, L(v[0], v[1])]) },
      { name: 'coverage_pct', label: L('Taux de prise en charge (%)', 'Coverage (%)'), type: 'number', value: 80 }, { name: 'ceiling', label: L('Plafond annuel par patient (0 = aucun)', 'Yearly ceiling per patient'), type: 'number', value: 0 },
      { name: 'contract_no', label: L('N° de convention', 'Contract no.') }, { name: 'phone', label: L('Téléphone', 'Phone') }, { name: 'email', label: 'E-mail', type: 'email' }].map((f) => field(f, i || {})).join('')}
      ${i ? field({ name: 'active', label: L('Actif', 'Active'), type: 'checkbox' }, i) : ''}</div>`,
    onSubmit: (x) => (i ? api.put(`/api/clinic/insurers/${i.id}`, x) : api.post('/api/clinic/insurers', x)) });
}

// ===================== Reports =====================
R('/clinic/reports', async (ctx) => {
  const q = ctx.query; const from = q.from || new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10), to = q.to || today();
  ctx.title(L('Activité et rapports', 'Activity & reports'));
  ctx.actions(`<a class="btn" href="/api/clinic/report${qs({ from, to, format: 'xlsx' })}">${icon('download')}<span class="hide-m">Excel</span></a>`);
  const d = await api.get('/api/clinic/report' + qs({ from, to }));
  const rev = d.revenue.reduce((s, r) => s + r.amount, 0), ins = d.revenue.reduce((s, r) => s + r.insurer, 0);
  const visits = d.visits.reduce((s, v) => s + v.n, 0);
  const maxP = Math.max(1, ...d.practitioners.map((p) => p.visits));
  ctx.el.innerHTML = `<form class="filters" id="f"><input class="in" type="date" name="from" value="${from}"><input class="in" type="date" name="to" value="${to}">
      ${[['Ce mois', 'This month', today().slice(0, 7) + '-01', today()], ['30 jours', '30 days', new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10), today()], ['Cette année', 'This year', today().slice(0, 4) + '-01-01', today()]].map(([fr, en, a, b]) => `<a class="btn sm ${a === from && b === to ? 'primary' : ''}" href="#/clinic/reports${qs({ from: a, to: b })}">${L(fr, en)}</a>`).join('')}</form>
    <div class="grid g4" style="margin-bottom:14px">${kpi(L('Chiffre d\'affaires', 'Revenue'), money(rev), `${L('dont assureurs', 'insurers')} ${money(ins)} (${rev ? Math.round((ins / rev) * 100) : 0} %)`, 'accent')}
      ${kpi(L('Consultations', 'Consultations'), num(visits), `${num(d.patients.n || 0)} ${L('patients', 'patients')} · ${num(d.patients.new_patients || 0)} ${L('nouveaux', 'new')}`)}
      ${kpi(L('Hospitalisations', 'Admissions'), num(d.admissions.n || 0), `${L('occupation', 'occupancy')} ${d.admissions.occupancy} % · DMS ${d.admissions.alos != null ? String(d.admissions.alos).replace('.', ',') + ' j' : '—'}`)}
      ${kpi(L('Rendez-vous', 'Appointments'), num(d.appointments.n || 0), `${d.appointments.online || 0} ${L('en ligne', 'online')} · ${d.appointments.tele || 0} ${L('vidéo', 'video')} · ${d.appointments.no_show_rate} % ${L('absents', 'no-show')}`)}</div>
    <div class="grid g2"><div class="card"><h3>${L('Recettes par activité', 'Revenue by activity')}</h3><div class="bar-list">${d.revenue.map((r) => `<div class="it"><span>${esc(srcName(r.source))}</span><b class="num">${money(r.amount)}</b><div class="tr"><i style="width:${(r.amount / (d.revenue[0]?.amount || 1)) * 100}%"></i></div></div>`).join('') || '<p class="muted">—</p>'}</div></div>
      <div class="card"><h3>${L('Activité par praticien', 'By practitioner')}</h3>${table({ rows: d.practitioners, columns: [{ label: L('Praticien', 'Practitioner'), render: (p) => `${esc(p.title || 'Dr')} ${esc(p.name)}<div class="muted sm">${esc(p.specialty || '')}</div>` },
        { label: L('Consult.', 'Visits'), cls: 'r', render: (p) => `<div class="cl-mini"><i style="width:${(p.visits / maxP) * 100}%"></i></div>${p.visits}` }, { label: L('Durée moy.', 'Avg time'), cls: 'r', render: (p) => (p.minutes != null ? `${p.minutes} min` : '—'), hideM: true }, { label: L('Généré', 'Generated'), cls: 'r', render: (p) => money(p.revenue) }] })}</div>
      <div class="card"><h3>${L('Diagnostics les plus fréquents', 'Top diagnoses')}</h3><div class="bar-list">${d.diagnoses.map((x) => `<div class="it"><span>${esc(L(x.fr, x.en))} <span class="muted sm mono">${esc(x.code)}</span></span><b class="num">${x.n}</b><div class="tr"><i style="width:${(x.n / (d.diagnoses[0]?.n || 1)) * 100}%"></i></div></div>`).join('') || '<p class="muted">—</p>'}</div></div>
      <div class="card"><h3>${L('Laboratoire : volumes et délais', 'Lab volumes and turnaround')}</h3>${table({ rows: d.lab, columns: [{ label: L('Examen', 'Test'), key: 'name' }, { label: 'N', cls: 'r', key: 'n' }, { label: L('Délai', 'TAT'), cls: 'r', render: (x) => (x.tat != null ? `<span class="${x.tat_hours && x.tat > x.tat_hours ? 'bad-t' : ''}">${String(x.tat).replace('.', ',')} h</span> <span class="muted sm">/ ${x.tat_hours} h</span>` : '—') }, { label: L('Anormaux', 'Abnormal'), cls: 'r', render: (x) => `${x.n ? Math.round(((x.abnormal || 0) / x.n) * 100) : 0} %` }] })}</div>
      <div class="card"><h3>${L('Tiers payant', 'Insurers')}</h3>${table({ rows: d.insurers, columns: [{ label: L('Assureur', 'Insurer'), key: 'name' }, { label: L('Prestations', 'Items'), cls: 'r', key: 'n' }, { label: L('Part assureur', 'Insurer share'), cls: 'r', render: (x) => money(x.amount) }] })}</div>
      <div class="card"><h3>${L('Médicaments les plus délivrés', 'Top dispensed drugs')}</h3>${table({ rows: d.drugs, columns: [{ label: L('Médicament', 'Drug'), key: 'name' }, { label: L('Qté', 'Qty'), cls: 'r', render: (x) => num(x.qty) }, { label: L('Valeur', 'Value'), cls: 'r', render: (x) => money(x.value) }] })}</div></div>`;
  const f = document.getElementById('f');
  f.addEventListener('change', () => { location.hash = '#/clinic/reports' + qs({ from: f.from.value, to: f.to.value }); });
});

// ===================== Surveillance =====================
R('/clinic/surveillance', async (ctx) => {
  const weeks = Number(ctx.query.weeks) || 8;
  ctx.title(L('Surveillance épidémiologique', 'Disease surveillance'));
  ctx.actions(`<a class="btn primary" href="/api/clinic/surveillance?weeks=${weeks}&format=xlsx">${icon('download')}<span>${L('Rapport MAPE (Excel)', 'Weekly report (Excel)')}</span></a>`);
  const d = await api.get(`/api/clinic/surveillance?weeks=${weeks}`);
  const maxM = Math.max(1, ...d.malaria.map((m) => m.tested));
  ctx.el.innerHTML = `${d.signals.map((s) => `<div class="card banner ${s.level === 'danger' ? 'bad' : 'warn'}"><b>${s.level === 'danger' ? '🚨' : '⚠'}</b> ${esc(L(s.fr, s.en))}</div>`).join('')}
    <div class="card" style="margin-bottom:14px"><p class="muted" style="margin:0">${L('Les cas sont comptés à partir des codes CIM-10 posés en consultation (maladies à potentiel épidémique, MAPE). Le fichier Excel suit le format hebdomadaire transmis au district de santé', 'Cases come from the ICD-10 codes entered in consultations. The Excel file follows the weekly format sent to the health district')}${d.district ? ` (<b>${esc(d.district)}</b>)` : ''}.</p></div>
    <div class="filters">${[4, 8, 13, 26].map((w) => `<a class="btn sm ${w === weeks ? 'primary' : ''}" href="#/clinic/surveillance?weeks=${w}">${w} ${L('semaines', 'weeks')}</a>`).join('')}</div>
    <div class="card"><h3>${L('Cas par semaine', 'Cases per week')}</h3><div class="tbl-wrap"><table class="tbl cl-sv"><thead><tr><th>${L('Maladie', 'Disease')}</th>${d.weeks.map((w) => `<th class="r">S${w.no}</th>`).join('')}<th class="r">Total</th><th class="r hide-m">&lt; 5 ${L('ans', 'y')}</th></tr></thead><tbody>
      ${d.diseases.map((x) => { const mx = Math.max(1, ...Object.values(x.weeks)); return `<tr><td><b>${esc(L(x.fr, x.en))}</b> <span class="muted sm mono">${esc(x.code)}</span>${x.level === 'immediate' ? ` <span class="pill bad">${L('immédiate', 'immediate')}</span>` : ''}</td>${d.weeks.map((w) => { const n = x.weeks[w.start] || 0; return `<td class="r"><span class="cl-heat" style="--a:${n / mx}">${n || ''}</span></td>`; }).join('')}<td class="r"><b>${x.total}</b></td><td class="r hide-m">${x.under5}</td></tr>`; }).join('') || `<tr><td colspan="${d.weeks.length + 3}" class="muted">${L('Aucun cas de maladie sous surveillance.', 'No case of a disease under surveillance.')}</td></tr>`}</tbody></table></div></div>
    <div class="card" style="margin-top:14px"><h3>${L('Paludisme : tests et positivité', 'Malaria: tests and positivity')}</h3>
      <div class="cl-mal">${d.malaria.map((m) => `<div title="${m.positive}/${m.tested}"><div class="cl-mal-b"><i style="height:${(m.tested / maxM) * 100}%"><b style="height:${m.tested ? (m.positive / m.tested) * 100 : 0}%"></b></i></div><small>S${d.weeks.find((w) => w.start === m.week)?.no}</small><span class="${m.rate >= 50 ? 'bad-t' : ''}">${m.tested ? m.rate + ' %' : '—'}</span></div>`).join('')}</div>
      <div class="legend" style="margin-top:8px"><span><i style="background:var(--blue-l)"></i>${L('testés', 'tested')}</span><span><i style="background:var(--blue)"></i>${L('positifs', 'positive')}</span></div></div>`;
});

// ===================== Patient messages =====================
R('/clinic/messages', async (ctx) => {
  ctx.title(L('Messages patients', 'Patient messages'));
  const rows = await api.get('/api/clinic/inbox');
  ctx.el.innerHTML = `<div class="card"><p class="muted sm" style="margin-top:0">${L('Messages envoyés depuis le portail patient. Les réponses apparaissent sur le portail du patient.', 'Messages sent from the patient portal. Replies appear on the patient\'s portal.')}</p>
    ${rows.map((m) => `<a class="lrow row between" href="#/clinic/patient/${m.patient_id}?tab=messages"><span>${pname(m)} ${m.unread ? `<b class="cl-dot">${m.unread}</b>` : ''}<div class="muted sm">${esc((m.last_body || '').slice(0, 120))}</div></span><span class="muted sm">${dtm(m.last_at)}</span></a>`).join('') || `<p class="muted">${L('Aucun message.', 'No message.')}</p>`}</div>`;
}, true);

// ===================== Settings =====================
R('/clinic/settings', async (ctx) => {
  const tab = ctx.query.tab || 'general';
  ctx.title(L("Réglages de l'établissement", 'Clinic settings'));
  await refreshMeta();
  const s = S().settings;
  const tabs = [['general', L('Établissement', 'Facility')], ['practitioners', L('Praticiens', 'Practitioners')], ['tariffs', L('Tarifs et actes', 'Tariffs')], ['beds', L('Lits', 'Beds')], ['departments', L('Services', 'Departments')], ['links', L('Liens publics', 'Public links')]];
  const head = `<div class="tabs" style="margin-bottom:14px">${tabs.map(([k, l]) => `<a class="${k === tab ? 'on' : ''}" href="#/clinic/settings?tab=${k}">${l}</a>`).join('')}</div>`;
  if (tab === 'general') {
    ctx.el.innerHTML = `${head}<form class="card" id="f"><div class="form f3">${[
      { name: 'kind', label: L('Type d\'établissement', 'Facility type'), type: 'select', options: [['clinic', L('Clinique', 'Clinic')], ['hospital', L('Hôpital', 'Hospital')], ['medical_center', L('Centre médical', 'Medical centre')], ['maternity', L('Maternité', 'Maternity')], ['dental', L('Cabinet dentaire', 'Dental')], ['lab', L('Laboratoire', 'Laboratory')]] },
      { name: 'director_name', label: L('Directeur / médecin-chef', 'Director') }, { name: 'director_title', label: L('Titre', 'Title') },
      { name: 'approval_no', label: L('N° d\'agrément MINSANTE', 'Licence no.') }, { name: 'health_district', label: L('District de santé', 'Health district') }, { name: 'emergency_phone', label: L('Téléphone urgences', 'Emergency phone') },
      { name: 'mrn_prefix', label: L('Préfixe des dossiers', 'File number prefix') }, { name: 'slot_minutes', label: L('Durée d\'un créneau (min)', 'Slot length (min)'), type: 'select', options: [10, 15, 20, 30, 45, 60].map((x) => [x, x]) },
      { name: 'expiry_alert_days', label: L('Alerte péremption (jours)', 'Expiry alert (days)'), type: 'number' }, { name: 'open_from', label: L('Ouverture', 'Opens'), type: 'time' }, { name: 'open_to', label: L('Fermeture', 'Closes'), type: 'time' },
      { name: 'tele_base', label: L('Salle de visioconférence', 'Video room base'), hint: 'https://meet.jit.si/' },
      { name: 'welcome_text', label: L('Message d\'accueil (page de rendez-vous)', 'Welcome text (booking page)'), type: 'textarea', span: true }].map((f) => field(f, s)).join('')}</div>
      <div class="form f2" style="margin-top:8px">${[['booking_open', L('Prise de rendez-vous en ligne', 'Online booking')], ['tele_enabled', L('Téléconsultation', 'Teleconsultation')], ['portal_pay', L('Paiement MoMo sur le portail', 'MoMo payment on the portal')], ['consult_prepay', L('Téléconsultation payée d\'avance', 'Prepaid teleconsultation')], ['drugs_covered', L('Médicaments couverts par le tiers payant', 'Drugs covered by insurers')]].map(([k, l]) => field({ name: k, label: l, type: 'checkbox' }, s)).join('')}</div>
      <button class="btn primary" style="margin-top:12px">${L('Enregistrer', 'Save')}</button></form>`;
    document.getElementById('f').addEventListener('submit', async (e) => { e.preventDefault(); const x = Object.fromEntries([...e.target.elements].filter((el) => el.name).map((el) => [el.name, el.type === 'checkbox' ? el.checked : el.value])); try { await api.put('/api/clinic/settings', x); await refreshMeta(); toast(L('Enregistré', 'Saved'), 'ok'); } catch (er) { fail(er); } });
    return;
  }
  if (tab === 'practitioners') {
    const users = await api.get('/api/users').catch(() => []);
    const prs = S().practitioners;
    ctx.actions(`<button class="btn primary" id="add">${icon('plus')}<span class="hide-m">${L('Praticien', 'Practitioner')}</span></button>`);
    ctx.el.innerHTML = `${head}<p class="muted sm">${L('Un praticien est un utilisateur (rôle Médecin, Infirmier…) avec ses horaires, son tarif et sa salle. Il apparaît dans l\'agenda et sur la page de rendez-vous en ligne.', 'A practitioner is a user with hours, fee and room. They appear in the agenda and the online booking page.')} <a href="#/users">${L('Gérer les comptes', 'Manage accounts')}</a></p>
      ${table({ rows: prs, columns: [{ label: L('Praticien', 'Practitioner'), render: (p) => `<i class="cl-chip" style="background:${esc(p.color)}"></i><b>${esc(p.title || 'Dr')} ${esc(p.name)}</b><div class="muted sm">${esc(p.specialty || '')} · ${esc(({ owner: L('Direction', 'Owner'), manager: L('Direction', 'Management'), doctor: L('Médecin', 'Doctor'), nurse: L('Infirmier', 'Nurse'), midwife: L('Sage-femme', 'Midwife') })[p.role] || p.role)}</div>` },
        { label: L('Horaires', 'Hours'), render: (p) => `${esc(p.start)}–${esc(p.end)}<div class="muted sm">${p.days.split(',').map((x) => ['D', 'L', 'M', 'M', 'J', 'V', 'S'][x]).join(' ')}</div>` },
        { label: L('Tarifs', 'Fees'), render: (p) => `${money(p.consult_fee)}<div class="muted sm">${L('vidéo', 'video')} ${money(p.tele_fee)}</div>`, hideM: true }, { label: L('Salle', 'Room'), key: 'room', hideM: true },
        { label: L('En ligne', 'Online'), render: (p) => `${p.online ? '<span class="pill ok">RDV</span>' : ''} ${p.tele ? '<span class="pill info">🎥</span>' : ''} ${p.active ? '' : `<span class="pill">${L('inactif', 'inactive')}</span>`}` },
        { label: '', cls: 'r', render: (p) => `<button class="btn sm" data-ed="${p.id}">${icon('edit')}</button>` }] })}`;
    const dlg = (p = null) => dialog({ title: p ? `${p.title || 'Dr'} ${p.name}` : L('Nouveau praticien', 'New practitioner'), wide: true,
      body: `<div class="form f3">${p ? '' : field({ name: 'user_id', label: L('Compte utilisateur', 'User account'), type: 'select', required: true, options: users.filter((u) => u.active !== 0 && !prs.some((x) => x.user_id === u.id)).map((u) => [u.id, `${u.name} (${u.role})`]) })}
        ${[{ name: 'title', label: L('Titre', 'Title'), value: 'Dr' }, { name: 'specialty', label: L('Spécialité', 'Specialty') }, { name: 'department_id', label: L('Service', 'Department'), type: 'select', options: [['', '—'], ...S().departments.map((d) => [d.id, d.name])] },
          { name: 'order_no', label: L('N° d\'ordre', 'Registration no.') }, { name: 'room', label: L('Salle / bureau', 'Room') }, { name: 'color', label: L('Couleur', 'Colour'), type: 'color', value: '#6D3BEB' },
          { name: 'consult_fee', label: L('Tarif consultation', 'Consultation fee'), type: 'number', value: 5000 }, { name: 'tele_fee', label: L('Tarif téléconsultation', 'Video fee'), type: 'number', value: 5000 },
          { name: 'start', label: L('Début', 'Start'), type: 'time', value: '08:00' }, { name: 'end', label: L('Fin', 'End'), type: 'time', value: '16:00' }].map((f) => field(f, p || {})).join('')}</div>
        <label class="fld">${L('Jours de consultation', 'Working days')}<div class="row" style="gap:10px;flex-wrap:wrap">${[[1, L('Lun', 'Mon')], [2, L('Mar', 'Tue')], [3, L('Mer', 'Wed')], [4, L('Jeu', 'Thu')], [5, L('Ven', 'Fri')], [6, L('Sam', 'Sat')], [0, L('Dim', 'Sun')]].map(([k, l]) => `<label class="check"><input type="checkbox" name="d${k}" ${(p?.days || '1,2,3,4,5').split(',').includes(String(k)) ? 'checked' : ''}> ${l}</label>`).join('')}</div></label>
        <div class="form f3">${field({ name: 'online', label: L('Visible en ligne', 'Bookable online'), type: 'checkbox' }, p || { online: 1 })}${field({ name: 'tele', label: L('Téléconsultation', 'Video'), type: 'checkbox' }, p || { tele: 1 })}${p ? field({ name: 'active', label: L('Actif', 'Active'), type: 'checkbox' }, p) : ''}</div>
        ${field({ name: 'bio', label: L('Présentation (page publique)', 'Bio (public page)'), type: 'textarea' }, p || {})}`,
      onSubmit: (x) => { const days = [0, 1, 2, 3, 4, 5, 6].filter((k) => x['d' + k]).join(','); return p ? api.put(`/api/clinic/practitioners/${p.id}`, { ...x, days }) : api.post('/api/clinic/practitioners', { ...x, days }); } });
    document.getElementById('add').addEventListener('click', async () => { if (await dlg()) ctx.rerender(); });
    ctx.el.querySelectorAll('[data-ed]').forEach((b) => b.addEventListener('click', async () => { if (await dlg(prs.find((p) => p.id === Number(b.dataset.ed)))) ctx.rerender(); }));
    return;
  }
  if (tab === 'tariffs') {
    const KIND = { consult: L('Consultation', 'Consultation'), lab: L('Biologie', 'Laboratory'), imaging: L('Imagerie', 'Imaging'), care: L('Soins', 'Care'), act: L('Actes', 'Procedures'), surgery: L('Chirurgie', 'Surgery'), other: L('Autres', 'Other') };
    const list = S().tariffs;
    ctx.actions(`<button class="btn primary" id="add">${icon('plus')}<span class="hide-m">${L('Tarif', 'Tariff')}</span></button>`);
    ctx.el.innerHTML = `${head}${Object.entries(KIND).map(([k, l]) => { const rows = list.filter((t) => t.kind === k); return rows.length ? `<h3>${l}</h3>${table({ rows, columns: [{ label: 'Code', render: (t) => `<span class="mono">${esc(t.code)}</span>` }, { label: L('Désignation', 'Name'), render: (t) => `${esc(t.name)}${t.params.length ? ` <span class="muted sm">${t.params.length} ${L('paramètres', 'parameters')}</span>` : ''}${t.active ? '' : ` <span class="pill">${L('inactif', 'inactive')}</span>`}` }, { label: L('Délai', 'TAT'), render: (t) => (t.tat_hours ? `${t.tat_hours} h` : ''), hideM: true }, { label: L('Tiers payant', 'Covered'), render: (t) => (t.covered ? '✓' : '—'), hideM: true }, { label: L('Prix', 'Price'), cls: 'r', render: (t) => `<b>${money(t.price)}</b>` }, { label: '', cls: 'r', render: (t) => `<button class="btn sm" data-ed="${t.id}">${icon('edit')}</button>` }] })}` : ''; }).join('')}`;
    const dlg = (t = null) => dialog({ title: t ? t.name : L('Nouveau tarif', 'New tariff'), wide: true,
      body: `<div class="form f3">${[{ name: 'code', label: 'Code', required: true }, { name: 'name', label: L('Désignation', 'Name'), required: true }, { name: 'name_en', label: L('Désignation (anglais)', 'Name (English)') },
        { name: 'kind', label: L('Type', 'Type'), type: 'select', options: Object.entries(KIND) }, { name: 'price', label: L('Prix', 'Price'), type: 'number', required: true }, { name: 'tat_hours', label: L('Délai de rendu (h)', 'Turnaround (h)'), type: 'number' },
        { name: 'params', label: L('Panel de résultats (biologie)', 'Result panel (lab)'), type: 'select', options: [['', '—'], ...(S().panels || []).map((x) => [x, x])], value: '' }].map((f) => field(f, t || { kind: 'act' })).join('')}
        ${field({ name: 'covered', label: L('Pris en charge par les assureurs', 'Covered by insurers'), type: 'checkbox' }, t || { covered: 1 })}${t ? field({ name: 'active', label: L('Actif', 'Active'), type: 'checkbox' }, t) : ''}</div>`,
      onSubmit: (x) => { const body = { ...x }; if (!body.params) delete body.params; return t ? api.put(`/api/clinic/tariffs/${t.id}`, body) : api.post('/api/clinic/tariffs', body); } });
    document.getElementById('add').addEventListener('click', async () => { if (await dlg()) ctx.rerender(); });
    ctx.el.querySelectorAll('[data-ed]').forEach((b) => b.addEventListener('click', async () => { if (await dlg(list.find((t) => t.id === Number(b.dataset.ed)))) ctx.rerender(); }));
    return;
  }
  if (tab === 'beds') {
    const beds = await api.get('/api/clinic/beds', { cache: false });
    ctx.actions(`<button class="btn primary" id="add">${icon('plus')}<span class="hide-m">${L('Lit', 'Bed')}</span></button>`);
    const KIND = [['standard', L('Standard', 'Standard')], ['private', L('Privée', 'Private')], ['vip', 'VIP'], ['icu', L('Soins intensifs', 'ICU')], ['maternity', L('Maternité', 'Maternity')]];
    ctx.el.innerHTML = `${head}${table({ rows: beds, columns: [{ label: L('Service', 'Ward'), key: 'ward' }, { label: L('Chambre', 'Room'), key: 'room' }, { label: L('Lit', 'Bed'), render: (b) => `<b>${esc(b.label)}</b>` }, { label: L('Type', 'Type'), render: (b) => esc(KIND.find((k) => k[0] === b.kind)?.[1] || b.kind), hideM: true }, { label: L('Prix / nuit', 'Rate / night'), cls: 'r', render: (b) => money(b.daily_rate) }, { label: '', cls: 'r', render: (b) => `<button class="btn sm" data-ed="${b.id}">${icon('edit')}</button>` }] })}`;
    const dlg = (b = null) => dialog({ title: b ? b.label : L('Nouveau lit', 'New bed'), body: `<div class="form f2">${[{ name: 'ward', label: L('Service', 'Ward'), required: true, list: 'wl' }, { name: 'room', label: L('Chambre', 'Room') }, { name: 'label', label: L('Libellé du lit', 'Bed label'), required: true }, { name: 'kind', label: L('Type', 'Type'), type: 'select', options: KIND }, { name: 'daily_rate', label: L('Prix par nuit', 'Rate per night'), type: 'number', value: 15000 }].map((f) => field(f, b || {})).join('')}
        <datalist id="wl">${[...new Set(beds.map((x) => x.ward))].map((w) => `<option value="${esc(w)}">`).join('')}</datalist>${b ? field({ name: 'active', label: L('En service', 'In service'), type: 'checkbox' }, b) : ''}</div>`,
      onSubmit: (x) => (b ? api.put(`/api/clinic/beds/${b.id}`, x) : api.post('/api/clinic/beds', x)) });
    document.getElementById('add').addEventListener('click', async () => { if (await dlg()) ctx.rerender(); });
    ctx.el.querySelectorAll('[data-ed]').forEach((x) => x.addEventListener('click', async () => { if (await dlg(beds.find((b) => b.id === Number(x.dataset.ed)))) ctx.rerender(); }));
    return;
  }
  if (tab === 'departments') {
    const deps = S().departments;
    ctx.actions(`<button class="btn primary" id="add">${icon('plus')}<span class="hide-m">${L('Service', 'Department')}</span></button>`);
    ctx.el.innerHTML = `${head}${table({ rows: deps, columns: [{ label: L('Service', 'Department'), render: (d) => `<i class="cl-chip" style="background:${esc(d.color)}"></i><b>${esc(d.name)}</b>${d.active ? '' : ` <span class="pill">${L('inactif', 'inactive')}</span>`}` }, { label: L('Type', 'Type'), key: 'kind' }, { label: '', cls: 'r', render: (d) => `<button class="btn sm" data-ed="${d.id}">${icon('edit')}</button>` }] })}`;
    const dlg = (d = null) => dialog({ title: d ? d.name : L('Nouveau service', 'New department'), body: `<div class="form f2">${[{ name: 'name', label: L('Nom', 'Name'), required: true }, { name: 'name_en', label: L('Nom (anglais)', 'Name (English)') }, { name: 'kind', label: L('Type', 'Type'), type: 'select', options: ['consult', 'emergency', 'surgery', 'lab', 'imaging', 'pharmacy'].map((k) => [k, k]) }, { name: 'color', label: L('Couleur', 'Colour'), type: 'color', value: '#6D3BEB' }].map((f) => field(f, d || {})).join('')}${d ? field({ name: 'active', label: L('Actif', 'Active'), type: 'checkbox' }, d) : ''}</div>`,
      onSubmit: (x) => (d ? api.put(`/api/clinic/departments/${d.id}`, x) : api.post('/api/clinic/departments', x)) });
    document.getElementById('add').addEventListener('click', async () => { if (await dlg()) ctx.rerender(); });
    ctx.el.querySelectorAll('[data-ed]').forEach((x) => x.addEventListener('click', async () => { if (await dlg(deps.find((d) => d.id === Number(x.dataset.ed)))) ctx.rerender(); }));
    return;
  }
  // public links
  ctx.el.innerHTML = `${head}<div class="grid g2">
    <div class="card"><h3>${icon('calendar')} ${L('Rendez-vous en ligne', 'Online booking')}</h3><p class="muted">${L('À afficher à l\'accueil, sur Facebook, Google Maps et WhatsApp. Le patient choisit le médecin, le créneau, et peut payer la téléconsultation par MoMo.', 'Share it on social media and Google Maps. Patients pick the doctor and time, and can pay video visits with MoMo.')}</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input class="in grow" readonly value="${esc(S().booking_url)}"><a class="btn primary" target="_blank" href="${esc(S().booking_url)}">${L('Ouvrir', 'Open')}</a></div>
      <div class="cl-qr" id="qr"></div></div>
    <div class="card"><h3>${icon('monitor')} ${L('Écran de la salle d\'attente', 'Waiting-room screen')}</h3><p class="muted">${L('Ouvrez ce lien sur une télévision ou un PC dans la salle d\'attente : il affiche les tickets appelés et le bureau, avec une annonce sonore. Les noms sont abrégés (confidentialité).', 'Open this on a TV in the waiting room: it shows called tickets and rooms with a chime. Names are shortened for privacy.')}</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input class="in grow" readonly value="${esc(S().display_url)}"><a class="btn primary" target="_blank" href="${esc(S().display_url)}">${L('Ouvrir', 'Open')}</a><button class="btn" id="renew">${L('Changer le lien', 'Renew link')}</button></div></div>
    <div class="card"><h3>${icon('card')} ${L('Cartes de santé', 'Health cards')}</h3><p class="muted">${L('Cartes patient avec QR code : à l\'accueil, un scan ouvre directement le dossier.', 'Patient cards with a QR code: a scan at the desk opens the file.')}</p><a class="btn" target="_blank" href="/api/clinic/cards?recent=1">${icon('print')} ${L('Imprimer les cartes des nouveaux patients', 'Print cards for new patients')}</a></div>
    <div class="card"><h3>${icon('shield')} ${L('Vérification des documents', 'Document verification')}</h3><p class="muted">${L('Chaque ordonnance, certificat et compte rendu porte un QR code. Pharmacies, employeurs et écoles vérifient l\'authenticité en ligne, sans voir aucune donnée médicale.', 'Every prescription, certificate and report has a QR code anyone can verify, without seeing medical data.')}</p></div></div>`;
  drawQr(document.getElementById('qr'), S().booking_url);
  document.getElementById('renew')?.addEventListener('click', async () => { if (!confirm(L('L\'ancien lien de l\'écran cessera de fonctionner. Continuer ?', 'The old screen link will stop working. Continue?'))) return; try { await api.put('/api/clinic/settings', { renew_display: true }); await refreshMeta(); ctx.rerender(); } catch (e) { fail(e); } });
});

/** QR code drawn in the browser (no third-party service sees the link). */
function drawQr(el, text) {
  if (!el) return;
  const go = () => { try { el.innerHTML = ''; new window.QRCode(el, { text, width: 168, height: 168, correctLevel: window.QRCode.CorrectLevel.M }); } catch {} };
  if (window.QRCode) return go();
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload = go;
  document.head.append(s);
}
