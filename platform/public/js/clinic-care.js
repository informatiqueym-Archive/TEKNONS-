// Teknons Santé, clinical side: the doctor's day, the consultation workspace
// (vitals with live NEWS2, notes, ICD-10 coding, e-prescription checked as you
// type, lab and imaging orders, procedures, certificates, admission), the lab
// worklist with flagged results, the bed board, the inpatient chart, and the
// pharmacy (prescriptions to fill, counter sales, stock by lot and expiry).
import { api } from './api.js';
import { state, L, esc, money, num, dt, today, icon, can, canAny, table, field, dialog, toast, offlineNote, qs } from './ui.js';
import { R, S, fail, me, kpi, wa, avatar, ageTxt, pname, time, dtm, mins, triage, newsPill, kindName, apptPill, spark, vitalsForm, readVitals, liveNews, pickPatient, VITALS } from './clinic.js';

const FLAG = { L: ['bas', 'low', 'warn'], H: ['haut', 'high', 'warn'], LL: ['critique bas', 'critical low', 'bad'], HH: ['critique haut', 'critical high', 'bad'], A: ['anormal', 'abnormal', 'warn'] };
const flagPill = (f) => (f && FLAG[f] ? `<span class="pill ${FLAG[f][2]}">${esc(L(FLAG[f][0], FLAG[f][1]))}</span>` : '');
const ORDER = { ordered: ['Demandé', 'Ordered', 'info'], sampled: ['Prélevé', 'Sampled', 'info'], done: ['À valider', 'To validate', 'warn'], validated: ['Validé', 'Validated', 'ok'], cancelled: ['Annulé', 'Cancelled', ''] };
const orderPill = (s) => { const x = ORDER[s] || [s, s, '']; return `<span class="pill ${x[2]}">${esc(L(x[0], x[1]))}</span>`; };
const RX = { active: ['À servir', 'To fill', 'info'], partial: ['Partiel', 'Partly filled', 'warn'], dispensed: ['Servie', 'Filled', 'ok'], cancelled: ['Annulée', 'Cancelled', ''] };
const rxPill = (s) => { const x = RX[s] || [s, s, '']; return `<span class="pill ${x[2]}">${esc(L(x[0], x[1]))}</span>`; };
const range = (p) => (p.lo != null && p.hi != null ? `${String(p.lo).replace('.', ',')} – ${String(p.hi).replace('.', ',')}` : p.choices ? '' : '');
const tariffs = (...kinds) => (S().tariffs || []).filter((t) => t.active && kinds.includes(t.kind));
const tname = (t) => L(t.name, t.name_en || t.name);
const lvlCls = (l) => (['allergy', 'major', 'pregnancy'].includes(l) ? 'bad' : 'warn');
const LVL = { allergy: ['Allergie', 'Allergy'], major: ['Interaction majeure', 'Major interaction'], moderate: ['Interaction', 'Interaction'], duplicate: ['Doublon', 'Duplicate'], pregnancy: ['Grossesse', 'Pregnancy'] };

/** Frequent prescriptions in Central Africa, one click each. */
const TEMPLATES = [
  ['Paludisme simple', 'Uncomplicated malaria', [['Artéméther-Luméfantrine 20/120 mg', '4 cp', '2 fois par jour', '3 jours', 1], ['Paracétamol 500 mg', '1 g', '3 fois par jour si fièvre', '3 jours', 18]]],
  ['Paludisme grave', 'Severe malaria', [['Artésunate injectable 60 mg', '2,4 mg/kg IV', 'H0, H12, H24 puis 1 fois par jour', '3 jours', 6], ['Sérum glucosé 5 % 500 ml', '500 ml', '3 fois par jour', '2 jours', 6]]],
  ['Fièvre typhoïde', 'Typhoid fever', [['Ciprofloxacine 500 mg', '1 cp', '2 fois par jour', '7 jours', 14], ['Paracétamol 500 mg', '1 g', '3 fois par jour', '5 jours', 15]]],
  ['Infection urinaire', 'Urinary infection', [['Ciprofloxacine 500 mg', '1 cp', '2 fois par jour', '5 jours', 10]]],
  ['Angine / IRA', 'Sore throat / ARI', [['Amoxicilline 500 mg', '1 g', '2 fois par jour', '6 jours', 24], ['Paracétamol 500 mg', '1 g', '3 fois par jour', '3 jours', 18]]],
  ['Diarrhée de l\'enfant', 'Child diarrhoea', [['Sels de réhydratation orale', '1 sachet', 'après chaque selle', '3 jours', 6], ['Zinc 20 mg', '1 cp', '1 fois par jour', '10 jours', 10]]],
  ['HTA', 'Hypertension', [['Amlodipine 5 mg', '1 cp', '1 fois par jour', '30 jours', 30]]],
  ['Diabète type 2', 'Type 2 diabetes', [['Metformine 850 mg', '1 cp', '2 fois par jour', '30 jours', 60]]],
  ['CPN', 'Antenatal', [['Fer + acide folique', '1 cp', '1 fois par jour', '30 jours', 30]]],
];

let drugCache = null;
async function drugList() {
  if (!drugCache) drugCache = await api.get('/api/clinic/drugs').catch(() => []);
  return drugCache;
}
window.addEventListener('tk:change', () => { drugCache = null; });

// ===================== The doctor's day =====================
export async function doctorHome(ctx) {
  const d = await api.get('/api/clinic/my-day');
  const pr = d.practitioner;
  ctx.title(L('Ma journée', 'My day'));
  if (!pr) {
    ctx.el.innerHTML = `<div class="card empty"><b>${L('Votre compte n\'est pas relié à une fiche praticien.', 'Your account is not linked to a practitioner profile.')}</b><p class="muted">${L('Demandez à l\'administrateur de vous ajouter dans Réglages › Praticiens.', 'Ask the administrator to add you in Settings › Practitioners.')}</p><a class="btn primary" href="#/clinic/desk">${L('Voir la file d\'attente', 'Open the queue')}</a></div>`;
    return;
  }
  const waiting = d.queue.filter((v) => v.status === 'waiting'), inc = d.queue.filter((v) => v.status === 'in_consult'), done = d.queue.filter((v) => v.status === 'done');
  ctx.actions(`${waiting.length ? `<button class="btn primary" id="next">${icon('bell')}<span>${L('Appeler le suivant', 'Call next')}</span></button>` : ''}`);
  const nextAppt = d.appointments.find((a) => ['booked', 'confirmed'].includes(a.status));
  ctx.el.innerHTML = `${offlineNote(d)}<div class="card cl-hello"><div><small>${new Date().toLocaleDateString(state.lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
      <h2>${L('Bonjour', 'Hello')} ${esc(pr.title || 'Dr')} ${esc(pr.name.split(' ').slice(-1)[0])}</h2>
      <p>${waiting.length ? `${waiting.length} ${L('patient(s) vous attendent', 'patient(s) waiting for you')}` : L('Personne ne vous attend pour l\'instant.', 'Nobody is waiting for you right now.')}${nextAppt ? ` · ${L('prochain rendez-vous à', 'next appointment at')} <b>${esc(nextAppt.time)}</b>` : ''}${d.unread ? ` · <a href="#/clinic/messages">${d.unread} ${L('message(s) patient', 'patient message(s)')}</a>` : ''}</p></div>
      <div class="cl-hello-k"><div><b>${done.length}</b><small>${L('vus', 'seen')}</small></div><div><b>${waiting.length}</b><small>${L('en attente', 'waiting')}</small></div><div><b>${d.appointments.filter((a) => a.status !== 'cancelled').length}</b><small>${L('rendez-vous', 'appointments')}</small></div><div><b>${d.inpatients.length}</b><small>${L('hospitalisés', 'inpatients')}</small></div></div></div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>${icon('concierge')} ${L('Ma file d\'attente', 'My queue')}</h3>
        ${[...inc, ...waiting].map((v) => `<a class="cl-q ${v.status}" style="--c:var(--blue)" href="#/clinic/visit/${v.id}"><div class="cl-tk">${v.queue_no}</div><div class="grow">${pname(v)} <span class="muted sm">${ageTxt(v)} · ${esc(kindName(v.kind))}</span>${v.allergies ? ` <span class="pill bad">${L('allergie', 'allergy')}</span>` : ''}<div class="muted sm">${triage(v.priority)} ${mins(v.wait_min)}${v.complaint ? ` · ${esc(v.complaint)}` : ''} ${newsPill(v.news)}</div></div><span class="btn sm ${v.status === 'in_consult' ? 'primary' : ''}">${v.status === 'in_consult' ? L('Reprendre', 'Resume') : L('Ouvrir', 'Open')}</span></a>`).join('') || `<p class="muted">${L('File vide.', 'Queue empty.')}</p>`}
        ${done.length ? `<details><summary class="muted sm">${done.length} ${L('consultation(s) terminée(s)', 'finished')}</summary>${done.map((v) => `<div class="lrow row between"><a href="#/clinic/visit/${v.id}">${pname(v)}</a><span class="muted sm">${time(v.ended_at)}</span></div>`).join('')}</details>` : ''}</div>
      <div class="card"><h3>${icon('calendar')} ${L('Mes rendez-vous du jour', 'My appointments today')}</h3>
        ${d.appointments.filter((a) => a.status !== 'cancelled').map((a) => `<div class="lrow row between"><span><b>${esc(a.time)}</b> ${pname(a)} ${a.mode === 'tele' ? `<span class="pill info">🎥 ${L('vidéo', 'video')}</span>` : ''}<div class="muted sm">${esc(a.reason || '')}</div></span>${apptPill(a.status)}</div>`).join('') || `<p class="muted">${L('Aucun rendez-vous.', 'No appointment.')}</p>`}</div>
      <div class="card"><h3>${icon('scan')} ${L('Résultats récents de mes patients', 'Recent results for my patients')}</h3>
        ${d.results.map((o) => `<div class="lrow row between"><span><a target="_blank" href="/api/clinic/orders/${o.id}/print">${esc(o.test_name)}</a> · ${pname(o)}<div class="muted sm">${dtm(o.validated_at)}</div></span>${o.critical ? `<span class="pill bad">${L('critique', 'critical')}</span>` : o.abnormal ? `<span class="pill warn">${L('anormal', 'abnormal')}</span>` : `<span class="pill ok">${L('normal', 'normal')}</span>`}</div>`).join('') || `<p class="muted">${L('Aucun résultat sur 48 h.', 'No result in 48 h.')}</p>`}</div>
      <div class="card"><h3>${icon('bed')} ${L('Mes patients hospitalisés', 'My inpatients')}</h3>
        ${d.inpatients.map((a) => `<a class="lrow row between" href="#/clinic/admission/${a.id}"><span><b>${esc(a.bed_label || '')}</b> ${pname(a)}<div class="muted sm">${esc(a.ward || '')} · ${L('depuis le', 'since')} ${dt(a.admitted_at)}</div></span>${newsPill(a.news)}</a>`).join('') || `<p class="muted">${L('Aucun patient hospitalisé.', 'No inpatient.')}</p>`}</div>
    </div>`;
  document.getElementById('next')?.addEventListener('click', async () => {
    try { const v = await api.post('/api/clinic/call', { practitioner_id: pr.id }); toast(`${L('Ticket', 'Ticket')} ${v.queue_no} ${L('appelé', 'called')}`, 'ok'); location.hash = `#/clinic/visit/${v.id}`; } catch (e) { fail(e); }
  });
}

// ===================== Consultations list =====================
R('/clinic/consult', async (ctx) => {
  const q = ctx.query;
  ctx.title(L('Consultations', 'Consultations'));
  ctx.actions(`<button class="btn primary" id="walk">${icon('plus')}<span class="hide-m">${L('Consulter un patient', 'See a patient')}</span></button>`);
  const [queue, visits] = await Promise.all([api.get('/api/clinic/queue' + (q.all ? '' : me() ? '?mine=1' : '')), api.get('/api/clinic/visits' + qs({ from: q.from, to: q.to, mine: q.all ? '' : me() ? 1 : '' }))]);
  document.getElementById('walk').addEventListener('click', async () => {
    const p = await pickPatient(); if (!p) return;
    try { const v = await api.post('/api/clinic/checkin', { patient_id: p.id, practitioner_id: me()?.id, kind: 'consult' }); location.hash = `#/clinic/visit/${v.id}`; } catch (e) { fail(e); }
  });
  const open = queue.filter((v) => v.status !== 'done');
  ctx.el.innerHTML = `<div class="tabs" style="margin-bottom:12px"><a href="#/clinic/consult" class="${q.all ? '' : 'on'}">${L('Mes patients', 'My patients')}</a><a href="#/clinic/consult?all=1" class="${q.all ? 'on' : ''}">${L('Tout l\'établissement', 'Whole facility')}</a></div>
    <h3>${L('En attente et en cours', 'Waiting and in progress')} <span class="muted sm">${open.length}</span></h3>
    ${table({ rows: open, href: (v) => `#/clinic/visit/${v.id}`, empty: L('Personne en attente.', 'Nobody waiting.'), columns: [
      { label: '#', render: (v) => `<b>${v.queue_no}</b>` }, { label: L('Patient', 'Patient'), render: (v) => `${pname(v)} <span class="muted sm">${ageTxt(v)}</span>` },
      { label: L('Tri', 'Triage'), render: (v) => `${triage(v.priority)} ${newsPill(v.news)}` }, { label: L('Motif', 'Complaint'), key: 'complaint', hideM: true },
      { label: L('Attente', 'Wait'), render: (v) => mins(v.wait_min) }, { label: L('Praticien', 'Practitioner'), render: (v) => esc(v.practitioner_name || '—'), hideM: true }] })}
    <h3 style="margin-top:18px">${L('Consultations récentes', 'Recent consultations')}</h3>
    ${table({ rows: visits.filter((v) => v.status === 'done'), href: (v) => `#/clinic/visit/${v.id}`, columns: [
      { label: 'Date', render: (v) => dtm(v.arrived_at) }, { label: L('Patient', 'Patient'), render: (v) => `${pname(v)}<div class="muted sm mono">${esc(v.mrn)}</div>` },
      { label: L('Diagnostic', 'Diagnosis'), render: (v) => `${esc(v.diagnosis || '')}${v.icd.length ? `<div class="muted sm">${v.icd.map(esc).join(', ')}</div>` : ''}` },
      { label: L('Praticien', 'Practitioner'), render: (v) => esc(v.practitioner_name || ''), hideM: true }] })}`;
}, true);

// ===================== Consultation workspace =====================
async function visitPage(ctx) {
  let v = await api.get(`/api/clinic/visits/${ctx.params.id}`);
  const p = v.patient;
  const mine = can('prescribe');
  if (v.status === 'waiting' && mine) { try { await api.put(`/api/clinic/visits/${v.id}`, { status: 'in_consult' }); v.status = 'in_consult'; } catch {} }
  const closed = v.status === 'done' || v.status === 'cancelled';
  ctx.title(`${L('Consultation', 'Consultation')} · ${p.last_name} ${p.first_name || ''}`);
  ctx.actions(`${v.tele_url ? `<a class="btn" target="_blank" rel="noopener" href="${esc(v.tele_url)}">🎥 <span class="hide-m">${L('Rejoindre la vidéo', 'Join video')}</span></a>` : ''}
    <a class="btn" href="#/clinic/patient/${p.id}">${icon('user')}<span class="hide-m">${L('Dossier', 'File')}</span></a>
    ${!closed && mine ? `<button class="btn primary" id="close">${icon('check')}<span>${L('Terminer', 'Finish')}</span></button>` : ''}`);
  const vit = v.vitals || {};
  const hist = v.previous || [];
  const trendKeys = [['bp_sys', L('TA syst.', 'SBP'), 90, 140], ['weight', L('Poids', 'Weight')], ['temp', 'T°', 36, 38], ['glucose', L('Glycémie', 'Glucose'), 0.7, 1.1]];
  const allTrend = [...hist].reverse().map((h) => h.vitals).concat([vit]);
  const side = `<div class="card cl-side">
    <div class="row" style="gap:10px">${avatar(p, 48)}<div><b>${esc(p.last_name)} ${esc(p.first_name || '')}</b><div class="muted sm">${p.sex === 'F' ? L('F', 'F') : L('H', 'M')} · ${ageTxt(p)} · <span class="mono">${esc(p.mrn)}</span></div>
      <div class="muted sm">${p.insurer_name ? `${icon('shield')} ${esc(p.insurer_name)}` : L('patient payant', 'self-pay')}${p.blood_group ? ` · <b style="color:var(--bad)">${esc(p.blood_group)}</b>` : ''}</div></div></div>
    ${p.allergies ? `<div class="cl-alert bad">⚠ ${L('Allergies', 'Allergies')} : <b>${esc(p.allergies)}</b></div>` : `<div class="cl-alert ok">${L('Aucune allergie connue', 'No known allergy')}</div>`}
    ${p.pregnant ? `<div class="cl-alert warn">${L('Grossesse en cours', 'Pregnant')}</div>` : ''}
    ${p.chronic ? `<h4>${L('Antécédents', 'History')}</h4><div class="sc-tags">${p.chronic.split(/[,;]/).filter(Boolean).map((x) => `<i>${esc(x.trim())}</i>`).join('')}</div>` : ''}
    <h4>${L('Traitements en cours', 'Current treatments')}</h4>${(v.active_rx || []).map((x) => `<div class="sm"><b>${esc(x.name)}</b> <span class="muted">${esc([x.dose, x.frequency].filter(Boolean).join(' · '))}</span></div>`).join('') || (p.treatments ? `<div class="sm">${esc(p.treatments)}</div>` : '<div class="muted sm">—</div>')}
    ${allTrend.filter((x) => Object.keys(x || {}).length).length > 1 ? `<h4>${L('Évolution', 'Trends')}</h4><div class="cl-trends">${trendKeys.map(([k, l, lo, hi]) => { const vals = allTrend.map((x) => x?.[k]); return vals.filter((x) => x != null).length > 1 ? `<div><span class="muted sm">${l}</span>${spark(vals, { w: 200, h: 36, lo, hi })}</div>` : ''; }).join('')}</div>` : ''}
    <h4>${L('Consultations précédentes', 'Previous visits')}</h4>${hist.map((h) => `<a class="cl-hist" href="#/clinic/visit/${h.id}"><b>${dt(h.arrived_at)}</b> ${esc(h.diagnosis || kindName(h.kind))}<small>${esc(h.practitioner_name || '')}${h.icd.length ? ` · ${h.icd.map(esc).join(', ')}` : ''}</small></a>`).join('') || '<div class="muted sm">—</div>'}
    ${v.recent_results.length ? `<h4>${L('Derniers résultats', 'Latest results')}</h4>${v.recent_results.map((o) => `<a class="cl-hist" target="_blank" href="/api/clinic/orders/${o.id}/print"><b>${esc(o.test_name)}</b> ${o.critical ? `<span class="pill bad">!</span>` : o.abnormal ? `<span class="pill warn">±</span>` : ''}<small>${dt(o.validated_at)} · ${o.results.filter((r) => r.value !== '').slice(0, 3).map((r) => `${esc(r.label)} ${esc(String(r.value))}`).join(' · ')}</small></a>`).join('')}` : ''}
  </div>`;

  const icdChips = (list) => list.map((c) => `<span class="cl-icd ${c.surveillance ? 'sv' : ''}" data-code="${esc(c.code)}"><b>${esc(c.code)}</b> ${esc(L(c.fr, c.en))}${closed ? '' : ' <button type="button" aria-label="x">×</button>'}</span>`).join('');
  const orders = v.orders.map((o) => `<div class="lrow row between"><span><b>${esc(o.test_name)}</b> ${o.priority === 'urgent' ? '<span class="pill bad">urgent</span>' : ''} ${orderPill(o.status)} ${o.critical ? `<span class="pill bad">${L('critique', 'critical')}</span>` : ''}
      ${o.results.length && ['done', 'validated'].includes(o.status) ? `<div class="sm">${o.results.filter((r) => r.value !== '').map((r) => `${esc(r.label)} <b class="${r.flag ? 'bad-t' : ''}">${esc(String(r.value).replace('.', ','))}</b> ${esc(r.unit || '')}`).join(' · ')}</div>` : ''}${o.conclusion ? `<div class="sm muted">${esc(o.conclusion.slice(0, 220))}</div>` : ''}</span>
      ${o.status === 'validated' ? `<a class="btn sm" target="_blank" href="/api/clinic/orders/${o.id}/print">${icon('print')}</a>` : ''}</div>`).join('');
  const rxs = v.prescriptions.map((r) => `<div class="cl-rx"><div class="row between"><span>${rxPill(r.status)} <span class="muted sm">${dtm(r.created_at)}</span></span><span class="row" style="gap:4px"><a class="btn sm" target="_blank" href="/api/clinic/prescriptions/${r.id}/print">${icon('print')} ${L('Imprimer', 'Print')}</a>${r.status === 'active' && mine ? `<button class="btn sm ghost" data-rxc="${r.id}">${icon('x')}</button>` : ''}</span></div>
      ${r.lines.map((l) => `<div class="sm"><b>${esc(l.name)}</b> ${esc([l.dose, l.frequency, l.duration].filter(Boolean).join(' · '))}${l.qty ? ` <span class="muted">× ${num(l.qty)}</span>` : ''}${l.instructions ? ` <span class="muted">· ${esc(l.instructions)}</span>` : ''}</div>`).join('')}
      ${r.alerts.length ? `<div class="sm" style="color:var(--warn)">⚠ ${r.alerts.map((a) => esc(L(a.fr, a.en))).join(' · ')}</div>` : ''}</div>`).join('');
  const charges = v.charges.map((c) => `<div class="lrow row between sm"><span>${esc(c.description)}${c.qty !== 1 ? ` × ${num(c.qty)}` : ''}</span><span class="num">${money(c.amount)}${c.insurer_amount ? ` <span class="muted">(${L('patient', 'patient')} ${money(c.patient_amount)})</span>` : ''}</span></div>`).join('');

  ctx.el.innerHTML = `${v.news >= 5 ? `<div class="card banner ${v.news >= 7 ? 'bad' : 'warn'}"><b>NEWS2 = ${v.news}</b> · ${v.news >= 7 ? L('Risque élevé : évaluation urgente, envisager l\'hospitalisation ou le transfert.', 'High risk: urgent assessment, consider admission or transfer.') : L('Risque moyen : surveillance rapprochée.', 'Medium risk: close monitoring.')}</div>` : ''}
  ${closed ? `<div class="card banner ${v.status === 'done' ? 'info' : ''}">${v.status === 'done' ? `${L('Consultation terminée et signée le', 'Consultation signed on')} ${dtm(v.signed_at || v.ended_at)}` : L('Consultation annulée', 'Consultation cancelled')}</div>` : ''}
  <div class="cl-work"><div>
    <form class="card" id="note" autocomplete="off">
      <div class="row between"><h3>${L('Constantes', 'Vital signs')}</h3><span class="muted sm" id="saved"></span></div>
      ${vitalsForm(vit)}${vit.bmi ? `<p class="muted sm">IMC ${String(vit.bmi).replace('.', ',')}</p>` : ''}
      <div class="form f2" style="margin-top:12px">
        ${field({ name: 'complaint', label: L('Motif de consultation', 'Chief complaint'), span: true }, v)}
        ${field({ name: 'history', label: L('Histoire de la maladie, anamnèse', 'History of present illness'), type: 'textarea', span: true }, v)}
        ${field({ name: 'exam', label: L('Examen clinique', 'Physical examination'), type: 'textarea', span: true }, v)}
        ${field({ name: 'diagnosis', label: L('Diagnostic', 'Diagnosis'), span: true }, v)}
      </div>
      <label class="fld">${L('Codes CIM-10', 'ICD-10 codes')}<div class="cl-icds" id="icds">${icdChips(v.icd)}</div>${closed ? '' : `<input class="in" id="icdq" placeholder="${L('Rechercher : paludisme, B54, HTA, grossesse…', 'Search: malaria, B54, hypertension…')}" list="icdl"><datalist id="icdl"></datalist>`}</label>
      <div class="form f2">${field({ name: 'plan', label: L('Conduite à tenir, conseils', 'Plan and advice'), type: 'textarea', span: true }, v)}
        ${field({ name: 'follow_up', label: L('Revoir le', 'Follow-up on'), type: 'date' }, v)}${field({ name: 'notes', label: L('Note privée (non imprimée)', 'Private note (not printed)') }, v)}</div>
    </form>
    <div class="card" style="margin-top:14px"><div class="row between"><h3>${icon('edit')} ${L('Ordonnance', 'Prescription')}</h3>${!closed && mine ? `<button class="btn sm primary" id="rx">${icon('plus')} ${L('Prescrire', 'Prescribe')}</button>` : ''}</div>${rxs || `<p class="muted sm">${L('Aucune ordonnance.', 'No prescription.')}</p>`}</div>
  </div><div>
    <div class="card"><div class="row between"><h3>${icon('scan')} ${L('Examens', 'Tests')}</h3>${!closed ? `<button class="btn sm" id="ord">${icon('plus')} ${L('Demander', 'Order')}</button>` : ''}</div>${orders || `<p class="muted sm">${L('Aucun examen demandé.', 'No test ordered.')}</p>`}</div>
    <div class="card" style="margin-top:14px"><div class="row between"><h3>${icon('cash')} ${L('Actes facturés', 'Billed items')}</h3>${!closed ? `<button class="btn sm" id="act">${icon('plus')} ${L('Acte', 'Procedure')}</button>` : ''}</div>${charges || `<p class="muted sm">—</p>`}</div>
    <div class="card" style="margin-top:14px"><h3>${L('Documents et orientation', 'Documents and next steps')}</h3>
      <div class="menu-grid">${mine ? `<button type="button" id="cert">${icon('invoice')}<b>${L('Certificat', 'Certificate')}</b></button>` : ''}
        ${v.admission ? `<a href="#/clinic/admission/${v.admission.id}">${icon('bed')}<b>${esc(v.admission.number)}</b></a>` : !closed || v.status === 'done' ? `<button type="button" id="adm">${icon('bed')}<b>${L('Hospitaliser', 'Admit')}</b></button>` : ''}
        <button type="button" id="book2">${icon('calendar')}<b>${L('Rendez-vous de suivi', 'Follow-up booking')}</b></button>
        ${p.phone ? `<a target="_blank" href="${wa(p.phone, `Bonjour ${p.first_name || ''}, ${state.me.company.name} : votre ordonnance et vos résultats sont disponibles dans votre espace santé.`)}">${icon('phone')}<b>WhatsApp</b></a>` : ''}</div>
      ${v.certificates.map((c) => `<div class="lrow row between sm"><span>${esc({ rest: L('Arrêt de travail', 'Sick note'), fitness: L('Aptitude', 'Fitness'), medical: L('Certificat médical', 'Medical certificate') }[c.kind] || c.kind)}${c.rest_days ? ` · ${c.rest_days} ${L('j', 'd')}` : ''}</span><a target="_blank" href="/api/clinic/certificates/${c.id}/print">${icon('print')}</a></div>`).join('')}</div>
  </div>${side}</div>`;

  // ---- autosave of the note ----
  const form = document.getElementById('note');
  liveNews(form);
  let icd = v.icd.map((c) => c.code);
  let timer = null, dirty = false;
  const saved = document.getElementById('saved');
  const payload = () => { const f = Object.fromEntries(['complaint', 'history', 'exam', 'diagnosis', 'plan', 'follow_up', 'notes'].map((k) => [k, form.querySelector(`[name=${k}]`).value])); return { ...f, vitals: readVitals(form), icd }; };
  const save = async () => { if (!dirty || closed) return; dirty = false; saved.textContent = L('Enregistrement…', 'Saving…'); try { const r = await api.put(`/api/clinic/visits/${v.id}`, payload()); saved.textContent = `✓ ${L('Enregistré', 'Saved')} ${time(new Date().toISOString())}`; if (r?.news != null) v.news = r.news; } catch (e) { dirty = true; saved.textContent = ''; fail(e); } };
  const touch = () => { if (closed) return; dirty = true; saved.textContent = L('Modifié', 'Edited'); clearTimeout(timer); timer = setTimeout(save, 1200); };
  if (closed) form.querySelectorAll('input,textarea,select').forEach((x) => { x.disabled = true; });
  form.addEventListener('input', touch); form.addEventListener('change', touch);
  form.addEventListener('submit', (e) => e.preventDefault());
  const flushSave = async () => { clearTimeout(timer); await save(); };
  ctx.cleanup = flushSave;
  window.addEventListener('hashchange', flushSave, { once: true });

  // ---- ICD search ----
  const icds = document.getElementById('icds'), iq = document.getElementById('icdq');
  const redrawIcd = () => { icds.innerHTML = icdChips(icd.map((c) => S().icd.find((x) => x.code === c) || { code: c, fr: c, en: c })); };
  icds.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; icd = icd.filter((c) => c !== b.parentElement.dataset.code); redrawIcd(); touch(); });
  if (iq) {
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    iq.addEventListener('input', () => {
      const t = norm(iq.value.trim()); const exact = S().icd.find((x) => `${x.code} · ${L(x.fr, x.en)}` === iq.value);
      if (exact) { if (!icd.includes(exact.code)) icd.push(exact.code); iq.value = ''; redrawIcd(); touch(); if (!form.diagnosis.value) { form.diagnosis.value = L(exact.fr, exact.en); } return; }
      document.getElementById('icdl').innerHTML = t.length < 2 ? '' : S().icd.filter((x) => norm(`${x.code} ${x.fr} ${x.en}`).includes(t)).slice(0, 12).map((x) => `<option value="${esc(`${x.code} · ${L(x.fr, x.en)}`)}">`).join('');
    });
  }

  // ---- actions ----
  const reload = async () => { await flushSave(); ctx.rerender(); };
  document.getElementById('close')?.addEventListener('click', async () => {
    clearTimeout(timer); dirty = false;
    const x = payload();
    if (!x.diagnosis.trim() && !icd.length) { toast(L('Indiquez un diagnostic ou un code CIM-10 avant de terminer.', 'Add a diagnosis or ICD-10 code first.'), 'err'); form.diagnosis.focus(); return; }
    try { await api.post(`/api/clinic/visits/${v.id}/close`, x); toast(L('Consultation terminée et signée', 'Consultation signed'), 'ok'); location.hash = me() ? '#/' : '#/clinic/consult'; } catch (e) { fail(e); }
  });
  document.getElementById('rx')?.addEventListener('click', async () => { await flushSave(); if (await prescribeDialog({ patient: p, visit_id: v.id })) ctx.rerender(); });
  ctx.el.querySelectorAll('[data-rxc]').forEach((b) => b.addEventListener('click', async () => { if (!confirm(L('Annuler cette ordonnance ?', 'Cancel this prescription?'))) return; try { await api.post(`/api/clinic/prescriptions/${b.dataset.rxc}/cancel`); reload(); } catch (e) { fail(e); } }));
  document.getElementById('ord')?.addEventListener('click', async () => { if (await orderDialog({ visit_id: v.id })) reload(); });
  document.getElementById('act')?.addEventListener('click', async () => {
    const list = tariffs('care', 'act', 'surgery', 'consult');
    if (await dialog({ title: L('Ajouter des actes', 'Add procedures'), wide: true, body: `<div class="cl-checks">${list.map((t) => `<label class="check"><input type="checkbox" name="t${t.id}"> ${esc(tname(t))} <span class="muted sm num">${money(t.price)}</span></label>`).join('')}</div>`,
      onSubmit: (x) => { const ids = list.filter((t) => x['t' + t.id]).map((t) => t.id); if (!ids.length) throw new Error(L('Cochez au moins un acte', 'Tick at least one')); return api.post(`/api/clinic/visits/${v.id}/acts`, { tariff_ids: ids }); } })) reload();
  });
  document.getElementById('cert')?.addEventListener('click', async () => { const c = await certificateDialog({ visit_id: v.id }); if (c) { window.open(`/api/clinic/certificates/${c.id}/print?print=1`, '_blank'); reload(); } });
  document.getElementById('adm')?.addEventListener('click', async () => { await flushSave(); const a = await admitDialog({ visit_id: v.id, patient: p, reason: form.diagnosis.value || v.complaint }); if (a) location.hash = `#/clinic/admission/${a.id}`; });
  document.getElementById('book2').addEventListener('click', async () => { const { bookDialog } = await import('./clinic.js'); await bookDialog({ patient: p, practitioner_id: v.practitioner_id || me()?.id || '', date: form.follow_up.value || today() }); });
}
visitPage.noLiveRender = true;
R('/clinic/visit/:id', visitPage, true);

/** E-prescription with a live safety check against the patient's file. */
export async function prescribeDialog({ patient, visit_id, admission_id }) {
  const drugs = await drugList();
  const byName = new Map(drugs.map((d) => [d.name.toLowerCase(), d]));
  const line = (l = {}) => `<div class="cl-rxl"><input class="in" name="name" list="drl" placeholder="${L('Médicament (nom ou DCI)', 'Drug (name or INN)')}" value="${esc(l.name || '')}" required>
    <input class="in" name="dose" placeholder="${L('Dose', 'Dose')}" value="${esc(l.dose || '')}"><input class="in" name="frequency" placeholder="${L('Fréquence', 'Frequency')}" value="${esc(l.frequency || '')}">
    <input class="in" name="duration" placeholder="${L('Durée', 'Duration')}" value="${esc(l.duration || '')}"><input class="in num" name="qty" inputmode="decimal" placeholder="${L('Qté', 'Qty')}" value="${esc(l.qty ?? '')}">
    <input class="in" name="instructions" placeholder="${L('Consignes', 'Instructions')}" value="${esc(l.instructions || '')}"><button type="button" class="btn ghost sm" data-del aria-label="x">${icon('trash')}</button><small class="cl-stock"></small></div>`;
  const readLines = (d) => [...d.querySelectorAll('.cl-rxl')].map((r) => { const o = Object.fromEntries([...r.querySelectorAll('input')].map((i) => [i.name, i.value.trim()])); const dr = byName.get(o.name.toLowerCase()); return { ...o, drug_id: dr?.id, qty: o.qty === '' ? 1 : o.qty.replace(',', '.') }; }).filter((l) => l.name);
  let alerts = [];
  return dialog({ title: `${L('Ordonnance', 'Prescription')} · ${patient.last_name} ${patient.first_name || ''}`, wide: true, submit: L('Signer l\'ordonnance', 'Sign prescription'),
    body: `${patient.allergies ? `<div class="cl-alert bad">⚠ ${L('Allergies', 'Allergies')} : <b>${esc(patient.allergies)}</b></div>` : ''}
      <div class="cl-tpl"><span class="muted sm">${L('Protocoles', 'Protocols')} :</span>${TEMPLATES.map((t, i) => `<button type="button" class="btn sm" data-tpl="${i}">${esc(L(t[0], t[1]))}</button>`).join('')}</div>
      <datalist id="drl">${drugs.map((d) => `<option value="${esc(d.name)}">${esc(d.dci)}${d.stock != null ? ` · stock ${num(d.stock)}` : ''}</option>`).join('')}</datalist>
      <div id="lines">${line()}</div><button type="button" class="btn sm" id="addl">${icon('plus')} ${L('Ligne', 'Line')}</button>
      <div id="alerts" class="cl-alerts"></div>${field({ name: 'notes', label: L('Note pour le patient ou le pharmacien', 'Note for the patient or pharmacist') })}
      <label class="check" id="ovr" hidden><input type="checkbox" name="override"> ${L('Je maintiens la prescription malgré les alertes (motif tracé)', 'I confirm despite the alerts (logged)')}</label>`,
    onOpen: (d) => {
      const box = d.querySelector('#lines'); let t;
      const check = async () => {
        const lines = readLines(d);
        d.querySelectorAll('.cl-rxl').forEach((r) => { const dr = byName.get(r.querySelector('[name=name]').value.trim().toLowerCase()); r.querySelector('.cl-stock').innerHTML = dr ? `${esc(dr.dci)} · ${dr.stock > 0 ? `${L('en stock', 'in stock')} ${num(dr.stock)}` : `<b style="color:var(--bad)">${L('rupture', 'out of stock')}</b>`}${dr.rx_only ? '' : ` · ${L('sans ordonnance', 'OTC')}`}` : r.querySelector('[name=name]').value ? L('hors livret (ordonnance externe)', 'not in formulary (outside pharmacy)') : ''; });
        if (!lines.length) { d.querySelector('#alerts').innerHTML = ''; return; }
        alerts = await api.post('/api/clinic/rx/check', { patient_id: patient.id, lines }).catch(() => []);
        d.querySelector('#alerts').innerHTML = alerts.length ? alerts.map((a) => `<div class="cl-alert ${lvlCls(a.level)}"><b>${esc(L(...(LVL[a.level] || [a.level, a.level])))}</b> · ${esc(L(a.fr, a.en))}</div>`).join('') : `<div class="cl-alert ok">✓ ${L('Aucune interaction, allergie ou doublon détecté', 'No interaction, allergy or duplicate found')}</div>`;
        d.querySelector('#ovr').hidden = !alerts.some((a) => ['allergy', 'major'].includes(a.level));
      };
      const later = () => { clearTimeout(t); t = setTimeout(check, 350); };
      box.addEventListener('input', later); box.addEventListener('change', later);
      box.addEventListener('click', (e) => { if (e.target.closest('[data-del]')) { e.target.closest('.cl-rxl').remove(); if (!box.children.length) box.insertAdjacentHTML('beforeend', line()); later(); } });
      d.querySelector('#addl').addEventListener('click', () => { box.insertAdjacentHTML('beforeend', line()); box.lastElementChild.querySelector('input').focus(); });
      d.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
        const tp = TEMPLATES[Number(b.dataset.tpl)][2];
        [...box.querySelectorAll('.cl-rxl')].filter((r) => !r.querySelector('[name=name]').value).forEach((r) => r.remove());
        box.insertAdjacentHTML('beforeend', tp.map(([name, dose, frequency, duration, qty]) => line({ name, dose, frequency, duration, qty })).join('')); later();
      }));
    },
    onSubmit: async (x, f) => {
      const lines = readLines(f);
      if (!lines.length) throw new Error(L('Ajoutez au moins un médicament', 'Add at least one drug'));
      try { const r = await api.post('/api/clinic/prescriptions', { patient_id: patient.id, visit_id, admission_id, lines, notes: x.notes, override: !!x.override }); toast(L('Ordonnance signée', 'Prescription signed'), 'ok'); return r; }
      catch (e) { if (e.data?.error === 'rx_alert') { f.querySelector('#ovr').hidden = false; } throw e; }
    } });
}

/** Lab and imaging orders: one tick per test, grouped by kind. */
export async function orderDialog({ visit_id, admission_id }) {
  const lab = tariffs('lab'), img = tariffs('imaging');
  const box = (list) => list.map((t) => `<label class="check"><input type="checkbox" name="t${t.id}"> ${esc(tname(t))} <span class="muted sm">${money(t.price)}${t.tat_hours ? ` · ${t.tat_hours} h` : ''}</span></label>`).join('');
  return dialog({ title: L('Demande d\'examens', 'Order tests'), wide: true, submit: L('Envoyer au laboratoire', 'Send to the lab'),
    body: `<h4>${L('Biologie', 'Laboratory')}</h4><div class="cl-checks">${box(lab)}</div><h4>${L('Imagerie et explorations', 'Imaging')}</h4><div class="cl-checks">${box(img)}</div>
      <div class="form f2">${field({ name: 'priority', label: L('Priorité', 'Priority'), type: 'select', options: [['routine', L('Normale', 'Routine')], ['urgent', L('Urgente', 'Urgent')]] })}${field({ name: 'clinical_info', label: L('Renseignements cliniques', 'Clinical information') })}</div>
      <p class="muted sm" id="tot"></p>`,
    onOpen: (d) => d.addEventListener('change', () => { const ids = [...lab, ...img].filter((t) => d.querySelector(`[name=t${t.id}]`).checked); d.querySelector('#tot').textContent = ids.length ? `${ids.length} ${L('examen(s)', 'test(s)')} · ${money(ids.reduce((s, t) => s + t.price, 0))}` : ''; }),
    onSubmit: (x) => { const ids = [...lab, ...img].filter((t) => x['t' + t.id]).map((t) => t.id); if (!ids.length) throw new Error(L('Cochez au moins un examen', 'Tick at least one test')); return api.post('/api/clinic/orders', { visit_id, admission_id, tariff_ids: ids, priority: x.priority, clinical_info: x.clinical_info }); } });
}

function certificateDialog({ visit_id }) {
  return dialog({ title: L('Certificat médical', 'Medical certificate'),
    body: `<div class="form f2">${field({ name: 'kind', label: L('Type', 'Type'), type: 'select', options: [['rest', L('Arrêt de travail / repos', 'Sick note')], ['fitness', L('Certificat d\'aptitude', 'Fitness certificate')], ['medical', L('Certificat médical', 'Medical certificate')]] })}
      ${field({ name: 'rest_days', label: L('Jours de repos', 'Days of rest'), type: 'number', value: 3, min: 1 })}${field({ name: 'from_date', label: L('À partir du', 'From'), type: 'date', value: today() })}
      ${field({ name: 'body', label: L('Texte (facultatif)', 'Text (optional)'), type: 'textarea', span: true })}</div><p class="muted sm">${L('Le certificat porte un QR code vérifiable : l\'employeur ou l\'école peut confirmer son authenticité sans voir le diagnostic.', 'The certificate carries a QR code anyone can verify, without seeing the diagnosis.')}</p>`,
    onSubmit: (x) => api.post('/api/clinic/certificates', { ...x, visit_id, rest_days: x.kind === 'rest' ? x.rest_days : 0 }) });
}

/** Admission: choose a free bed on the board. */
export async function admitDialog({ visit_id, patient, reason = '', bed_id = '' }) {
  patient = patient || await pickPatient({ title: L('Hospitaliser…', 'Admit…') });
  if (!patient) return null;
  const beds = (await api.get('/api/clinic/beds', { cache: false })).filter((b) => b.status === 'free');
  if (!beds.length) { toast(L('Aucun lit libre', 'No free bed'), 'err'); return null; }
  const wards = [...new Set(beds.map((b) => b.ward))];
  return dialog({ title: `${L('Hospitalisation', 'Admission')} · ${patient.last_name} ${patient.first_name || ''}`, wide: true, submit: L('Admettre', 'Admit'),
    body: `<label class="fld">${L('Lit', 'Bed')} *<div class="cl-bedpick">${wards.map((w) => `<div><small>${esc(w)}</small>${beds.filter((b) => b.ward === w).map((b) => `<label><input type="radio" name="bed_id" value="${b.id}" ${String(b.id) === String(bed_id) ? 'checked' : ''} required><span>${esc(b.label)}<small>${money(b.daily_rate)}/${L('j', 'd')}</small></span></label>`).join('')}</div>`).join('')}</div></label>
      <div class="form f2">${field({ name: 'reason', label: L('Motif d\'hospitalisation', 'Reason for admission'), value: reason, span: true })}${field({ name: 'expected_out', label: L('Sortie prévue', 'Expected discharge'), type: 'date' })}
      ${field({ name: 'practitioner_id', label: L('Médecin responsable', 'Attending doctor'), type: 'select', options: [['', L('Moi / le médecin de la consultation', 'Me / the consulting doctor')], ...(S().practitioners || []).filter((x) => x.active).map((x) => [x.id, `${x.title || 'Dr'} ${x.name}`])] })}</div>`,
    onSubmit: (x) => { if (!x.bed_id) throw new Error(L('Choisissez un lit', 'Pick a bed')); return api.post('/api/clinic/admissions', { ...x, visit_id, patient_id: patient.id }); } });
}

// ===================== Laboratory and imaging =====================
R('/clinic/lab', async (ctx) => {
  const q = ctx.query; const tab = q.tab || 'todo';
  ctx.title(L('Laboratoire et imagerie', 'Lab & imaging'));
  const status = { todo: 'ordered', run: 'sampled,done', done: 'validated' }[tab];
  const rows = await api.get('/api/clinic/orders' + qs({ status, kind: q.kind, limit: tab === 'done' ? 150 : 300 }));
  const labPerm = can('lab');
  const counts = rows.length;
  ctx.el.innerHTML = `<div class="tabs" style="margin-bottom:12px">${[['todo', L('À prélever', 'To sample')], ['run', L('En cours et à valider', 'Running & to validate')], ['done', L('Validés', 'Validated')]].map(([k, l]) => `<a class="${k === tab ? 'on' : ''}" href="#/clinic/lab${qs({ ...q, tab: k })}">${l}${k === tab ? ` <b>${counts}</b>` : ''}</a>`).join('')}</div>
    <div class="filters"><select class="in" id="kind"><option value="">${L('Biologie et imagerie', 'All')}</option><option value="lab" ${q.kind === 'lab' ? 'selected' : ''}>${L('Biologie', 'Laboratory')}</option><option value="imaging" ${q.kind === 'imaging' ? 'selected' : ''}>${L('Imagerie', 'Imaging')}</option></select></div>
    ${rows.length ? `<div class="cl-lab">${rows.map((o) => `<div class="card cl-lo ${o.priority === 'urgent' ? 'urgent' : ''} ${o.late ? 'late' : ''}">
      <div class="row between"><b>${esc(o.test_name)}</b><span>${o.priority === 'urgent' ? '<span class="pill bad">URGENT</span> ' : ''}${orderPill(o.status)}</span></div>
      <div>${pname(o)} <span class="muted sm">${ageTxt(o)} · ${o.sex} · <span class="mono">${esc(o.mrn)}</span></span></div>
      <div class="muted sm"><span class="mono">${esc(o.number)}</span> · ${dtm(o.ordered_at)} · ${esc(o.title || 'Dr')} ${esc(o.practitioner_name || '')}${o.late ? ` · <b style="color:var(--bad)">${L('hors délai', 'late')}</b>` : ''}</div>
      ${o.clinical_info ? `<div class="sm">ℹ ${esc(o.clinical_info)}</div>` : ''}
      ${!o.paid ? `<div class="sm" style="color:var(--warn)">${L('Non réglé', 'Not paid')} · ${money(o.patient_amount)}</div>` : ''}
      ${o.status === 'validated' ? `<div class="sm">${o.results.filter((r) => r.value !== '').slice(0, 4).map((r) => `${esc(r.label)} <b>${esc(String(r.value).replace('.', ','))}</b>${r.flag ? ` ${flagPill(r.flag)}` : ''}`).join(' · ')}</div><div class="muted sm">${L('Validé par', 'Validated by')} ${esc(o.validated_name || '')} · ${dtm(o.validated_at)}</div>` : ''}
      <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">
        ${o.status === 'ordered' && labPerm ? `<button class="btn sm primary" data-s="${o.id}">${icon('check')} ${L('Prélevé', 'Sampled')}</button>` : ''}
        ${['ordered', 'sampled', 'done'].includes(o.status) && labPerm ? `<button class="btn sm ${o.status !== 'ordered' ? 'primary' : ''}" data-r="${o.id}">${icon('edit')} ${L('Résultats', 'Results')}</button>` : ''}
        ${o.status === 'validated' ? `<a class="btn sm" target="_blank" href="/api/clinic/orders/${o.id}/print">${icon('print')} ${L('Compte rendu', 'Report')}</a>` : ''}
        ${['ordered', 'sampled'].includes(o.status) && canAny('lab', 'prescribe') ? `<button class="btn sm ghost" data-c="${o.id}">${icon('x')}</button>` : ''}</div></div>`).join('')}</div>` : `<div class="card empty"><b>${L('Rien dans cette liste', 'Nothing here')}</b></div>`}`;
  document.getElementById('kind').addEventListener('change', (e) => { location.hash = '#/clinic/lab' + qs({ ...q, kind: e.target.value }); });
  ctx.el.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', async () => { try { await api.post(`/api/clinic/orders/${b.dataset.s}/sample`); ctx.rerender(); } catch (e) { fail(e); } }));
  ctx.el.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', async () => { if (!confirm(L('Annuler cet examen ?', 'Cancel this test?'))) return; try { await api.post(`/api/clinic/orders/${b.dataset.c}/cancel`); ctx.rerender(); } catch (e) { fail(e); } }));
  ctx.el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', async () => { if (await resultsDialog(rows.find((o) => o.id === Number(b.dataset.r)))) ctx.rerender(); }));
}, true);

function flagOf(p, v) {
  if (v === '' || v == null) return '';
  if (p.choices) return (p.abnormal || []).includes(v) ? 'A' : '';
  if (p.text) return '';
  const x = Number(String(v).replace(',', '.')); if (Number.isNaN(x)) return '';
  if (p.clo != null && x < p.clo) return 'LL'; if (p.chi != null && x > p.chi) return 'HH';
  if (p.lo != null && x < p.lo) return 'L'; if (p.hi != null && x > p.hi) return 'H';
  return '';
}
function resultsDialog(o) {
  const prev = Object.fromEntries((o.results || []).map((r) => [r.k, r.value]));
  const params = o.params || [];
  return dialog({ title: `${o.test_name} · ${o.last_name} ${o.first_name || ''}`, wide: true, submit: L('Enregistrer', 'Save'),
    body: `${params.length ? `<table class="tbl cl-res"><thead><tr><th>${L('Paramètre', 'Parameter')}</th><th>${L('Résultat', 'Result')}</th><th>${L('Unité', 'Unit')}</th><th>${L('Valeurs de référence', 'Reference')}</th><th></th></tr></thead><tbody>
      ${params.map((p) => `<tr><td>${esc(p.label)}</td><td>${p.choices ? `<select class="in" name="p_${p.k}"><option value=""></option>${p.choices.map((c) => `<option ${prev[p.k] === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : p.text ? `<textarea class="in" name="p_${p.k}" rows="2">${esc(prev[p.k] ?? '')}</textarea>` : `<input class="in num" name="p_${p.k}" inputmode="decimal" value="${esc(String(prev[p.k] ?? '').replace('.', ','))}">`}</td>
        <td class="muted sm">${esc(p.unit || '')}</td><td class="muted sm">${range(p)}</td><td data-f="${p.k}">${flagPill(flagOf(p, prev[p.k]))}</td></tr>`).join('')}</tbody></table>` : ''}
      ${field({ name: 'conclusion', label: params.length ? L('Commentaire', 'Comment') : L('Compte rendu', 'Report'), type: 'textarea', value: o.conclusion || '' })}
      ${params.length ? '' : `<label class="check"><input type="checkbox" name="abnormal" ${o.abnormal ? 'checked' : ''}> ${L('Examen anormal (à discuter avec le patient)', 'Abnormal finding (to discuss with the patient)')}</label>`}
      <label class="check"><input type="checkbox" name="validate" checked> ${L('Valider et transmettre au médecin et au portail patient', 'Validate and send to the doctor and patient portal')}</label>
      <p class="muted sm">${L('Une valeur critique déclenche une alerte immédiate au médecin prescripteur.', 'A critical value alerts the prescriber immediately.')}</p>`,
    onOpen: (d) => d.addEventListener('input', (e) => { const k = e.target.name?.slice(2); const p = params.find((x) => x.k === k); if (p) d.querySelector(`[data-f="${k}"]`).innerHTML = flagPill(flagOf(p, e.target.value)); }),
    onSubmit: (x) => {
      const values = Object.fromEntries(params.map((p) => [p.k, (x['p_' + p.k] ?? '').toString().replace(',', '.').trim()]));
      return api.post(`/api/clinic/orders/${o.id}/results`, { values, conclusion: x.conclusion, abnormal: !!x.abnormal, validate: !!x.validate }).then((r) => { if (r?.critical) toast(L('Valeur critique : le médecin est alerté', 'Critical value: doctor alerted'), 'err'); return r; });
    } });
}

// ===================== Wards and beds =====================
const BED = { free: ['Libre', 'Free', 'ok'], occupied: ['Occupé', 'Occupied', 'info'], cleaning: ['À nettoyer', 'Cleaning', 'warn'], blocked: ['Bloqué', 'Blocked', ''] };
R('/clinic/wards', async (ctx) => {
  ctx.title(L('Hospitalisation', 'Wards & beds'));
  ctx.actions(canAny('ward', 'prescribe') ? `<button class="btn primary" id="adm">${icon('plus')}<span class="hide-m">${L('Hospitaliser', 'Admit')}</span></button>` : '');
  const beds = await api.get('/api/clinic/beds');
  const wards = [...new Set(beds.map((b) => b.ward))];
  const occ = beds.filter((b) => b.status === 'occupied').length;
  const due = beds.reduce((s, b) => s + (b.due || 0), 0);
  const days = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 864e5));
  document.getElementById('adm')?.addEventListener('click', async () => { const a = await admitDialog({}); if (a) location.hash = `#/clinic/admission/${a.id}`; });
  ctx.el.innerHTML = `${offlineNote(beds)}<div class="grid g4" style="margin-bottom:14px">${kpi(L('Taux d\'occupation', 'Occupancy'), `${beds.length ? Math.round((occ / beds.length) * 100) : 0} %`, `${occ}/${beds.length} ${L('lits', 'beds')}`, 'accent')}
    ${kpi(L('Lits libres', 'Free beds'), beds.filter((b) => b.status === 'free').length, `${beds.filter((b) => b.status === 'cleaning').length} ${L('à nettoyer', 'to clean')}`)}
    ${kpi(L('Soins à faire (30 min)', 'Care due (30 min)'), due, L('médicaments et soins planifiés', 'planned meds and care'), due ? 'warn' : '')}
    ${kpi(L('Patients à surveiller', 'Patients at risk'), beds.filter((b) => b.last_news >= 5).length, 'NEWS2 ≥ 5', beds.some((b) => b.last_news >= 7) ? 'bad' : '')}</div>
    ${wards.map((w) => `<h3 class="cl-ward">${esc(w)} <span class="muted sm">${beds.filter((b) => b.ward === w && b.status === 'occupied').length}/${beds.filter((b) => b.ward === w).length}</span></h3>
    <div class="cl-beds">${beds.filter((b) => b.ward === w).map((b) => b.status === 'occupied' ? `<a class="cl-bed occupied ${b.last_news >= 7 ? 'crit' : b.last_news >= 5 ? 'risk' : ''}" href="#/clinic/admission/${b.admission_id}">
        <div class="row between"><b>${esc(b.label)}</b>${newsPill(b.last_news)}</div><div class="cl-bed-p">${esc(b.last_name)} ${esc((b.first_name || '').split(' ')[0])}</div>
        <small>${b.sex} · ${b.age ?? '?'} ${L('ans', 'y')} · J${days(b.admitted_at) + 1}${b.expected_out ? ` · ${L('sortie', 'out')} ${dt(b.expected_out)}` : ''}</small>
        <small>${esc(b.reason || '')}</small>${b.due ? `<span class="cl-due">${b.due} ${L('soin(s) dû(s)', 'due')}</span>` : ''}</a>`
      : `<button class="cl-bed ${b.status}" data-bed="${b.id}" data-st="${b.status}"><div class="row between"><b>${esc(b.label)}</b><span class="pill ${BED[b.status][2]}">${esc(L(BED[b.status][0], BED[b.status][1]))}</span></div><small>${esc(b.room)} · ${money(b.daily_rate)}/${L('nuit', 'night')}</small></button>`).join('')}</div>`).join('') || `<div class="card empty"><b>${L('Aucun lit configuré', 'No bed set up')}</b> <a href="#/clinic/settings?tab=beds">${L('Ajouter des lits', 'Add beds')}</a></div>`}`;
  ctx.el.querySelectorAll('[data-bed]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.bed, st = b.dataset.st;
    if (st === 'free' && canAny('ward', 'prescribe')) { const a = await admitDialog({ bed_id: id }); if (a) location.hash = `#/clinic/admission/${a.id}`; return; }
    if (!canAny('ward', 'settings')) return;
    const next = st === 'cleaning' || st === 'blocked' ? 'free' : 'blocked';
    if (!confirm(next === 'free' ? L('Marquer ce lit comme propre et libre ?', 'Mark this bed clean and free?') : L('Bloquer ce lit (panne, travaux) ?', 'Block this bed?'))) return;
    try { await api.put(`/api/clinic/beds/${id}`, { status: next }); ctx.rerender(); } catch (e) { fail(e); }
  }));
}, true);

// ===================== Inpatient chart =====================
async function admissionPage(ctx) {
  const a = await api.get(`/api/clinic/admissions/${ctx.params.id}`);
  const p = a.patient; const open = a.status === 'admitted';
  ctx.title(`${a.number} · ${p.last_name} ${p.first_name || ''}`);
  ctx.actions(`<a class="btn" href="#/clinic/patient/${p.id}">${icon('user')}<span class="hide-m">${L('Dossier', 'File')}</span></a>
    ${open && can('ward') ? `<button class="btn" id="tr">${icon('swap')}<span class="hide-m">${L('Transférer', 'Transfer')}</span></button>` : ''}
    ${open && can('prescribe') ? `<button class="btn primary" id="out">${icon('logout')}<span>${L('Sortie', 'Discharge')}</span></button>` : ''}
    ${!open ? `<a class="btn primary" target="_blank" href="/api/clinic/admissions/${a.id}/print">${icon('print')}<span>${L('Compte rendu', 'Summary')}</span></a>` : ''}`);
  const nowIso = new Date().toISOString();
  const planned = a.care.filter((c) => c.status === 'planned').sort((x, y) => x.planned_at.localeCompare(y.planned_at));
  const dueNow = planned.filter((c) => c.planned_at <= new Date(Date.now() + 30 * 60e3).toISOString());
  const vit = a.care.filter((c) => c.kind === 'vitals' && c.status === 'done').reverse();
  const KIND = { vitals: ['Constantes', 'Vitals', 'chart'], med: ['Médicament', 'Medication', 'box'], care: ['Soin', 'Care', 'clipboard'], note: ['Observation', 'Note', 'edit'] };
  const careRow = (c) => `<div class="cl-care s-${c.status} ${c.status === 'planned' && c.planned_at < nowIso ? 'late' : ''}">${icon(KIND[c.kind]?.[2] || 'list')}<div class="grow"><div class="row between"><b>${esc(c.label || L(KIND[c.kind][0], KIND[c.kind][1]))}</b><span class="muted sm">${c.status === 'planned' ? `${L('prévu', 'due')} ${dtm(c.planned_at)}` : dtm(c.done_at || c.created_at)}</span></div>
    ${c.kind === 'vitals' ? `<div class="sm">${VITALS.filter(([k]) => c.vitals[k] != null).map(([k, fr, en, u]) => `${esc(L(fr, en))} <b>${esc(String(c.vitals[k]).replace('.', ','))}</b>${u.startsWith('/') || u === '%' ? '' : ' ' + u}`).join(' · ')} ${newsPill(c.news)}</div>` : ''}
    ${c.note ? `<div class="sm muted">${esc(c.note)}</div>` : ''}<div class="muted sm">${c.status === 'missed' ? `<span class="pill bad">${L('non fait', 'missed')}</span> ` : ''}${esc(c.user_name || '')}</div></div>
    ${c.status === 'planned' && open && canAny('ward', 'care') ? `<div class="row" style="gap:4px"><button class="btn sm primary" data-done="${c.id}">${icon('check')}</button><button class="btn sm ghost" data-miss="${c.id}">${icon('x')}</button></div>` : ''}</div>`;
  ctx.el.innerHTML = `${p.allergies ? `<div class="card banner bad">⚠ <b>${L('Allergies', 'Allergies')} : ${esc(p.allergies)}</b></div>` : ''}
  <div class="card cl-head">${avatar(p, 56)}<div class="grow"><h2 style="margin:0">${esc(p.last_name)} ${esc(p.first_name || '')} <span class="pill ${open ? 'info' : 'ok'}">${open ? L('Hospitalisé', 'Inpatient') : L('Sorti', 'Discharged')}</span></h2>
    <div class="muted">${ageTxt(p)} · ${esc(a.ward || '')} · ${L('lit', 'bed')} <b>${esc(a.bed_label || '')}</b> · ${L('entré le', 'admitted')} ${dtm(a.admitted_at)} · J${a.nights + (open ? 1 : 0)}</div>
    <div class="muted sm">${esc(a.title || 'Dr')} ${esc(a.practitioner_name || '')} · ${esc(a.reason || '')}${a.icd.length ? ` · ${a.icd.map((c) => esc(c.code)).join(', ')}` : ''}</div></div>
    <div class="r"><div class="muted sm">${open ? L('Séjour estimé', 'Estimated stay') : L('Séjour', 'Stay')}</div><div class="big num">${money(a.bed_estimate)}</div><div class="muted sm">${a.nights} ${L('nuit(s)', 'night(s)')} × ${money(a.daily_rate)}</div></div></div>
  ${!open ? `<div class="card" style="margin-top:14px"><h3>${L('Compte rendu de sortie', 'Discharge summary')}</h3><p>${esc(a.summary || '')}</p><p class="muted sm">${dtm(a.discharged_at)} · ${esc(a.outcome)}</p></div>` : ''}
  <div class="grid g2" style="margin-top:14px"><div>
    <div class="card"><div class="row between"><h3>${icon('clipboard')} ${L('Pancarte et soins', 'Nursing chart')}</h3>${open && canAny('ward', 'care') ? `<button class="btn sm primary" id="add">${icon('plus')} ${L('Saisir', 'Record')}</button>` : ''}</div>
      ${dueNow.length ? `<h4 style="color:var(--warn)">${L('À faire maintenant', 'Due now')} (${dueNow.length})</h4>${dueNow.map(careRow).join('')}` : ''}
      ${planned.length > dueNow.length ? `<details><summary class="muted sm">${planned.length - dueNow.length} ${L('soin(s) planifié(s) plus tard', 'planned later')}</summary>${planned.filter((c) => !dueNow.includes(c)).map(careRow).join('')}</details>` : ''}
      <h4>${L('Historique', 'History')}</h4>${a.care.filter((c) => c.status !== 'planned').slice(0, 60).map(careRow).join('') || `<p class="muted sm">—</p>`}</div>
  </div><div>
    ${vit.length > 1 ? `<div class="card"><h3>${L('Courbes', 'Charts')}</h3><div class="cl-trends">${[['temp', 'T°', 36, 38, 'var(--bad)'], ['pulse', L('Pouls', 'Pulse'), 50, 100], ['bp_sys', L('TA syst.', 'SBP'), 90, 140], ['spo2', 'SpO₂', 94, 100]].map(([k, l, lo, hi, c]) => `<div><div class="row between"><span class="muted sm">${l}</span><b class="num">${esc(String(vit[vit.length - 1].vitals[k] ?? '—').replace('.', ','))}</b></div>${spark(vit.map((x) => x.vitals[k]), { lo, hi, color: c })}</div>`).join('')}</div></div>` : ''}
    <div class="card" style="margin-top:${vit.length > 1 ? 14 : 0}px"><div class="row between"><h3>${icon('edit')} ${L('Prescriptions', 'Prescriptions')}</h3>${open && can('prescribe') ? `<button class="btn sm" id="rx">${icon('plus')}</button>` : ''}</div>
      ${a.prescriptions.map((r) => `<div class="cl-rx"><div class="row between">${rxPill(r.status)}<a target="_blank" href="/api/clinic/prescriptions/${r.id}/print">${icon('print')}</a></div>${r.lines.map((l) => `<div class="sm"><b>${esc(l.name)}</b> ${esc([l.dose, l.frequency, l.duration].filter(Boolean).join(' · '))}</div>`).join('')}</div>`).join('') || `<p class="muted sm">—</p>`}</div>
    <div class="card" style="margin-top:14px"><div class="row between"><h3>${icon('scan')} ${L('Examens', 'Tests')}</h3>${open && canAny('prescribe', 'care') ? `<button class="btn sm" id="ord">${icon('plus')}</button>` : ''}</div>
      ${a.orders.map((o) => `<div class="lrow row between sm"><span>${esc(o.test_name)} ${orderPill(o.status)} ${o.critical ? `<span class="pill bad">!</span>` : ''}</span>${o.status === 'validated' ? `<a target="_blank" href="/api/clinic/orders/${o.id}/print">${icon('print')}</a>` : ''}</div>`).join('') || `<p class="muted sm">—</p>`}</div>
    <div class="card" style="margin-top:14px"><div class="row between"><h3>${icon('cash')} ${L('Consommations', 'Charges')}</h3>${open ? `<button class="btn sm" id="chg">${icon('plus')}</button>` : ''}</div>
      ${a.charges.map((c) => `<div class="lrow row between sm"><span>${esc(c.description)}${c.qty !== 1 ? ` × ${num(c.qty)}` : ''}</span><span class="num">${money(c.amount)}</span></div>`).join('') || `<p class="muted sm">—</p>`}
      ${open ? `<p class="muted sm">${L('Les nuitées sont facturées automatiquement à la sortie.', 'Bed nights are charged automatically at discharge.')}</p>` : ''}</div>
  </div></div>`;
  const mark = (id, status) => async () => { try { await api.put(`/api/clinic/care/${id}`, { status }); ctx.rerender(); } catch (e) { fail(e); } };
  ctx.el.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', mark(b.dataset.done, 'done')));
  ctx.el.querySelectorAll('[data-miss]').forEach((b) => b.addEventListener('click', mark(b.dataset.miss, 'missed')));
  document.getElementById('add')?.addEventListener('click', async () => { if (await careDialog(a)) ctx.rerender(); });
  document.getElementById('rx')?.addEventListener('click', async () => { if (await prescribeDialog({ patient: p, admission_id: a.id })) ctx.rerender(); });
  document.getElementById('ord')?.addEventListener('click', async () => { if (await orderDialog({ admission_id: a.id })) ctx.rerender(); });
  document.getElementById('chg')?.addEventListener('click', async () => {
    const list = tariffs('care', 'act', 'surgery');
    const drugs = await drugList();
    if (await dialog({ title: L('Ajouter une consommation', 'Add a charge'), body: `<div class="form f2">${field({ name: 'tariff_id', label: L('Acte ou soin', 'Procedure or care'), type: 'select', options: [['', L('— Médicament / consommable —', '— Drug / supply —')], ...list.map((t) => [t.id, `${tname(t)} · ${money(t.price)}`])] })}
        ${field({ name: 'drug', label: L('ou médicament', 'or drug'), list: 'drl2' })}<datalist id="drl2">${drugs.map((d) => `<option value="${esc(d.name)}">`).join('')}</datalist>${field({ name: 'qty', label: L('Quantité', 'Quantity'), type: 'number', value: 1, min: 0 })}</div>`,
      onSubmit: (x) => {
        if (x.tariff_id) return api.post(`/api/clinic/admissions/${a.id}/charges`, { tariff_id: x.tariff_id, qty: x.qty });
        const d = drugs.find((y) => y.name === x.drug); if (!d) throw new Error(L('Choisissez un acte ou un médicament', 'Pick a procedure or drug'));
        return api.post(`/api/clinic/admissions/${a.id}/charges`, { description: d.name, unit_price: d.price, qty: x.qty, source: 'pharmacy' });
      } })) ctx.rerender();
  });
  document.getElementById('tr')?.addEventListener('click', async () => {
    const beds = (await api.get('/api/clinic/beds', { cache: false })).filter((b) => b.status === 'free');
    if (await dialog({ title: L('Transfert de lit', 'Bed transfer'), body: field({ name: 'bed_id', label: L('Nouveau lit', 'New bed'), type: 'select', options: beds.map((b) => [b.id, `${b.ward} · ${b.label} · ${money(b.daily_rate)}`]) }),
      onSubmit: (x) => api.post(`/api/clinic/admissions/${a.id}/transfer`, { bed_id: x.bed_id }) })) ctx.rerender();
  });
  document.getElementById('out')?.addEventListener('click', async () => {
    const r = await dialog({ title: L('Sortie du patient', 'Discharge'), wide: true, submit: L('Valider la sortie', 'Discharge'),
      body: `<div class="form f2">${field({ name: 'outcome', label: L('Mode de sortie', 'Outcome'), type: 'select', options: [['healed', L('Guéri', 'Healed')], ['improved', L('Amélioré', 'Improved')], ['transferred', L('Transféré / évacué', 'Transferred')], ['against_advice', L('Contre avis médical', 'Against advice')], ['deceased', L('Décédé', 'Deceased')]], value: 'improved' })}
        ${field({ name: 'diagnosis', label: L('Diagnostic de sortie', 'Discharge diagnosis'), value: a.diagnosis || a.reason })}
        ${field({ name: 'summary', label: L('Compte rendu (évolution, traitement de sortie, suivi)', 'Summary (course, discharge treatment, follow-up)'), type: 'textarea', span: true, required: true })}</div>
        <p class="muted sm">${a.nights} ${L('nuit(s) seront facturées', 'night(s) will be charged')} : <b>${money(a.bed_estimate)}</b>. ${L('Le lit passe « à nettoyer ».', 'The bed goes to cleaning.')}</p>`,
      onSubmit: (x) => api.post(`/api/clinic/admissions/${a.id}/discharge`, x) });
    if (r) { toast(L('Sortie enregistrée', 'Discharged'), 'ok'); ctx.rerender(); }
  });
}
R('/clinic/admission/:id', admissionPage, true);

function careDialog(a) {
  const drugs = (a.prescriptions || []).filter((r) => ['active', 'partial', 'dispensed'].includes(r.status)).flatMap((r) => r.lines);
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
  return dialog({ title: L('Pancarte', 'Nursing chart'), wide: true,
    body: `<div class="tabs" id="kt">${[['vitals', L('Constantes', 'Vitals')], ['med', L('Médicament', 'Medication')], ['care', L('Soin', 'Care')], ['note', L('Observation', 'Note')]].map(([k, l], i) => `<a href="#" data-k="${k}" class="${i ? '' : 'on'}">${l}</a>`).join('')}</div><input type="hidden" name="kind" value="vitals">
      <div data-p="vitals">${vitalsForm({})}</div>
      <div data-p="med" hidden><div class="form f2">${field({ name: 'med_label', label: L('Médicament et dose', 'Drug and dose'), list: 'mdl' })}<datalist id="mdl">${drugs.map((l) => `<option value="${esc(`${l.name} ${l.dose || ''}`.trim())}">`).join('')}</datalist></div></div>
      <div data-p="care" hidden>${field({ name: 'care_label', label: L('Soin', 'Care'), placeholder: L('Pansement, toilette, sonde, glycémie capillaire…', 'Dressing, bathing, catheter…') })}</div>
      <div data-p="plan" hidden><div class="form f3">${field({ name: 'planned_at', label: L('Prévu à', 'Planned at'), type: 'datetime-local', value: nowLocal })}${field({ name: 'every_hours', label: L('Répéter toutes les (h)', 'Repeat every (h)'), type: 'number', placeholder: '8' })}${field({ name: 'days', label: L('Pendant (jours)', 'For (days)'), type: 'number', placeholder: '3' })}</div>
        <label class="check"><input type="checkbox" name="done" checked> ${L('Fait maintenant (sinon planifié)', 'Done now (otherwise planned)')}</label></div>
      ${field({ name: 'note', label: L('Observation', 'Note'), type: 'textarea' })}`,
    onOpen: (d) => {
      const show = (k) => { d.querySelector('[name=kind]').value = k; d.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x.dataset.k === k)); d.querySelectorAll('[data-p]').forEach((x) => { x.hidden = !(x.dataset.p === k || (x.dataset.p === 'plan' && ['med', 'care'].includes(k))); }); };
      d.querySelectorAll('[data-k]').forEach((x) => x.addEventListener('click', (e) => { e.preventDefault(); show(x.dataset.k); }));
      liveNews(d);
    },
    onSubmit: (x, f) => {
      const kind = x.kind;
      const body = { kind, note: x.note };
      if (kind === 'vitals') body.vitals = readVitals(f);
      if (kind === 'med' || kind === 'care') {
        body.label = kind === 'med' ? x.med_label : x.care_label;
        const planned = new Date(x.planned_at);
        if (!x.done || Number(x.every_hours) > 0) { body.planned_at = planned.toISOString(); body.every_hours = x.every_hours; body.days = x.days; body.done = !!x.done; }
      }
      return api.post(`/api/clinic/admissions/${a.id}/care`, body);
    } });
}

// ===================== Pharmacy =====================
R('/clinic/pharmacy', async (ctx) => {
  const q = ctx.query; const tab = q.tab || 'serve';
  ctx.title(L('Pharmacie', 'Pharmacy'));
  const pharm = can('pharmacy');
  ctx.actions(`${pharm ? `<button class="btn" id="recv">${icon('truck')}<span class="hide-m">${L('Réception', 'Receive stock')}</span></button>` : ''}<a class="btn" href="/api/clinic/drugs?format=xlsx">${icon('download')}<span class="hide-m">Excel</span></a>`);
  document.getElementById('recv')?.addEventListener('click', async () => { if (await receiveDialog()) ctx.rerender(); });
  const tabs = `<div class="tabs" style="margin-bottom:12px">${[['serve', L('Ordonnances à servir', 'To fill')], ['counter', L('Vente comptoir', 'Counter sale')], ['stock', L('Stock et péremptions', 'Stock & expiry')]].map(([k, l]) => `<a class="${k === tab ? 'on' : ''}" href="#/clinic/pharmacy?tab=${k}">${l}</a>`).join('')}</div>`;
  if (tab === 'serve') {
    const rx = await api.get('/api/clinic/prescriptions?status=active,partial&days=3');
    ctx.el.innerHTML = `${tabs}${rx.length ? `<div class="cl-lab">${rx.map((r) => `<div class="card cl-lo"><div class="row between"><b>${pname(r)}</b>${rxPill(r.status)}</div>
      <div class="muted sm"><span class="mono">${esc(r.mrn)}</span> · ${dtm(r.created_at)} · ${esc(r.title || 'Dr')} ${esc(r.practitioner_name || '')}${r.insurer_id ? ` · <span class="pill info">${L('tiers payant', 'insured')}</span>` : ''}</div>
      ${r.allergies ? `<div class="sm" style="color:var(--bad)">⚠ ${esc(r.allergies)}</div>` : ''}
      ${r.lines.map((l) => `<div class="lrow row between sm"><span><b>${esc(l.name)}</b> ${esc([l.dose, l.frequency, l.duration].filter(Boolean).join(' · '))}</span><span class="num">${l.drug_id ? `${num(l.dispensed)}/${num(l.qty)} ${l.stock < l.qty - l.dispensed ? `<span class="pill bad">${L('stock', 'stock')} ${num(l.stock)}</span>` : ''}` : `<span class="muted">${L('externe', 'external')}</span>`}</span></div>`).join('')}
      <div class="row" style="gap:6px;margin-top:8px"><a class="btn sm" target="_blank" href="/api/clinic/prescriptions/${r.id}/print">${icon('print')}</a>${pharm ? `<button class="btn sm primary" data-d="${r.id}">${icon('box')} ${L('Délivrer', 'Dispense')}</button>` : ''}</div></div>`).join('')}</div>` : `<div class="card empty"><b>${L('Aucune ordonnance en attente', 'No prescription waiting')}</b></div>`}`;
    ctx.el.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', async () => {
      const r = rx.find((x) => x.id === Number(b.dataset.d));
      const lines = r.lines.filter((l) => l.drug_id && l.dispensed < l.qty);
      const res = await dialog({ title: `${L('Délivrance', 'Dispense')} · ${r.last_name} ${r.first_name || ''}`, wide: true, submit: L('Délivrer', 'Dispense'),
        body: `${lines.map((l) => `<div class="lrow row between"><span><b>${esc(l.name)}</b><div class="muted sm">${L('prescrit', 'prescribed')} ${num(l.qty)} · ${L('déjà servi', 'given')} ${num(l.dispensed)} · stock ${num(l.stock)} · ${money(l.price)}</div></span><input class="in num" style="width:90px" name="l${l.id}" value="${Math.min(l.qty - l.dispensed, l.stock)}" inputmode="decimal"></div>`).join('') || `<p class="muted">${L('Rien à délivrer depuis la pharmacie interne.', 'Nothing to dispense from the in-house pharmacy.')}</p>`}
          <p class="muted sm">${L('Les lots qui expirent en premier sortent en premier (FEFO).', 'Lots expiring first go out first (FEFO).')}</p><label class="check"><input type="checkbox" name="bill" checked> ${L('Facturer tout de suite (passage en caisse)', 'Bill now (send to cashier)')}</label>`,
        onSubmit: (x) => api.post(`/api/clinic/pharmacy/dispense/${r.id}`, { lines: lines.map((l) => ({ id: l.id, qty: Number(String(x['l' + l.id]).replace(',', '.')) || 0 })), bill: !!x.bill }) });
      if (res) { toast(res.status === 'dispensed' ? L('Ordonnance servie', 'Prescription filled') : L('Délivrance partielle', 'Partly filled'), 'ok'); ctx.rerender(); }
    }));
    return;
  }
  const drugs = await api.get('/api/clinic/drugs' + qs({ q: q.q, all: q.all }), { cache: tab === 'stock' });
  if (tab === 'counter') {
    const cart = new Map();
    ctx.el.innerHTML = `${tabs}<div class="grid cl-counter"><div class="card"><input class="in" type="search" id="dq" placeholder="${L('Rechercher un médicament, une DCI, un code-barres…', 'Search drug, INN, barcode…')}" style="width:100%"><div id="dl" class="cl-dl"></div></div>
      <div class="card"><h3>${icon('cart')} ${L('Panier', 'Cart')}</h3><div id="cart"></div>
        <div class="form f2" style="margin-top:10px">${field({ name: 'prescription_ref', label: L('Réf. ordonnance (si exigée)', 'Prescription ref. (if needed)') })}${field({ name: 'method', label: L('Paiement', 'Payment'), type: 'select', options: [['cash', L('Espèces', 'Cash')], ['mtn_momo', 'MTN MoMo'], ['orange_money', 'Orange Money'], ['bank', L('Carte / virement', 'Card / transfer')]] })}</div>
        <button class="btn primary" style="width:100%;margin-top:10px" id="pay" disabled>${L('Encaisser', 'Charge')}</button></div></div>`;
    const list = document.getElementById('dl'), box = document.getElementById('cart'), pay = document.getElementById('pay');
    const drawList = () => { const t = document.getElementById('dq').value.trim().toLowerCase(); list.innerHTML = drugs.filter((d) => !t || `${d.name} ${d.dci} ${d.barcode || ''} ${d.category}`.toLowerCase().includes(t)).slice(0, 60).map((d) => `<button class="cl-pick" data-id="${d.id}" ${d.stock <= 0 ? 'disabled' : ''}><span><b>${esc(d.name)}</b><small>${esc(d.dci)} · ${esc(d.category)} · stock ${num(d.stock)}${d.rx_only ? ` · <i>${L('sur ordonnance', 'Rx only')}</i>` : ''}</small></span><b class="num">${money(d.price)}</b></button>`).join(''); };
    const drawCart = () => { const items = [...cart.values()]; const total = items.reduce((s, x) => s + x.d.price * x.qty, 0);
      box.innerHTML = items.map((x) => `<div class="lrow row between"><span>${esc(x.d.name)}${x.d.rx_only ? ' <span class="pill warn">Rx</span>' : ''}</span><span class="row" style="gap:4px"><button class="btn sm" data-m="${x.d.id}">−</button><b class="num">${x.qty}</b><button class="btn sm" data-p="${x.d.id}">+</button><span class="num" style="min-width:80px;text-align:right">${money(x.d.price * x.qty)}</span></span></div>`).join('') + `<div class="lrow row between"><b>${L('Total', 'Total')}</b><b class="num big">${money(total)}</b></div>`;
      pay.disabled = !items.length; };
    document.getElementById('dq').addEventListener('input', drawList);
    list.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; const d = drugs.find((x) => x.id === Number(b.dataset.id)); const c = cart.get(d.id) || { d, qty: 0 }; c.qty = Math.min(d.stock, c.qty + 1); cart.set(d.id, c); drawCart(); });
    box.addEventListener('click', (e) => { const m = e.target.closest('[data-m],[data-p]'); if (!m) return; const id = Number(m.dataset.m || m.dataset.p); const c = cart.get(id); c.qty += m.dataset.p ? 1 : -1; if (c.qty <= 0) cart.delete(id); else c.qty = Math.min(c.qty, c.d.stock); drawCart(); });
    pay.addEventListener('click', async () => {
      pay.disabled = true;
      try { const r = await api.post('/api/clinic/pharmacy/counter', { items: [...cart.values()].map((x) => ({ drug_id: x.d.id, qty: x.qty })), method: ctx.el.querySelector('[name=method]').value, prescription_ref: ctx.el.querySelector('[name=prescription_ref]').value });
        toast(`${L('Vente', 'Sale')} ${r.number} · ${money(r.total)}`, 'ok'); window.open(`/print/document/${r.document_id}`, '_blank'); ctx.rerender(); }
      catch (e) { fail(e); pay.disabled = false; }
    });
    drawList(); drawCart();
    return;
  }
  // stock
  const low = drugs.filter((d) => d.stock <= d.reorder), exp = drugs.filter((d) => d.expiring > 0), out = drugs.filter((d) => d.stock <= 0);
  const value = drugs.reduce((s, d) => s + d.stock * (d.cost || 0), 0);
  const soon = (d) => d.next_expiry && d.next_expiry <= new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  ctx.el.innerHTML = `${tabs}<div class="grid g4" style="margin-bottom:14px">${kpi(L('Références', 'Items'), drugs.length, `${L('valeur du stock', 'stock value')} ${money(value)}`, 'accent')}${kpi(L('En rupture', 'Out of stock'), out.length, '', out.length ? 'bad' : '', '#/clinic/pharmacy?tab=stock&f=out')}${kpi(L('Sous le seuil', 'Below reorder'), low.length, L('à commander', 'to order'), low.length ? 'warn' : '', '#/clinic/pharmacy?tab=stock&f=low')}${kpi(L('Péremption proche', 'Expiring soon'), exp.length, L('lots à écouler ou retirer', 'lots to use or remove'), exp.length ? 'warn' : '', '#/clinic/pharmacy?tab=stock&f=exp')}</div>
    <form class="filters" id="f"><input class="in" type="search" name="q" value="${esc(q.q || '')}" placeholder="${L('Rechercher…', 'Search…')}">${pharm || can('settings') ? `<button type="button" class="btn" id="newd">${icon('plus')} ${L('Médicament', 'Drug')}</button>` : ''}</form>
    ${table({ rows: q.f === 'out' ? out : q.f === 'low' ? low : q.f === 'exp' ? exp : drugs, columns: [
      { label: L('Médicament', 'Drug'), render: (d) => `<a href="#" data-drug="${d.id}"><b>${esc(d.name)}</b></a><div class="muted sm">${esc(d.dci)} · ${esc(d.form || '')}${d.rx_only ? '' : ` · ${L('libre', 'OTC')}`}</div>` },
      { label: L('Catégorie', 'Category'), key: 'category', hideM: true },
      { label: 'Stock', cls: 'r', render: (d) => `<b class="num ${d.stock <= 0 ? 'bad-t' : ''}">${num(d.stock)}</b> <span class="muted sm">${esc(d.unit || '')}</span>${d.stock <= d.reorder ? ` <span class="pill ${d.stock <= 0 ? 'bad' : 'warn'}">${L('commander', 'reorder')}</span>` : ''}` },
      { label: L('Autonomie', 'Days left'), cls: 'r', hideM: true, render: (d) => (d.days_left == null ? '—' : `<span class="${d.days_left < 14 ? 'bad-t' : ''}">${d.days_left} ${L('j', 'd')}</span>`) },
      { label: L('Péremption', 'Expiry'), render: (d) => (d.next_expiry ? `<span class="pill ${d.expired ? 'bad' : soon(d) ? 'warn' : ''}">${dt(d.next_expiry)}</span>` : '—') },
      { label: L('Prix', 'Price'), cls: 'r', render: (d) => money(d.price), hideM: true }] })}`;
  const f = document.getElementById('f'); let t;
  f.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { location.hash = '#/clinic/pharmacy' + qs({ tab: 'stock', q: f.q.value, f: q.f }); }, 350); });
  f.addEventListener('submit', (e) => e.preventDefault());
  document.getElementById('newd')?.addEventListener('click', async () => { if (await drugDialog()) ctx.rerender(); });
  ctx.el.querySelectorAll('[data-drug]').forEach((a) => a.addEventListener('click', async (e) => { e.preventDefault(); if (await drugCard(Number(a.dataset.drug))) ctx.rerender(); }));
}, true);

function drugDialog(d = null) {
  return dialog({ title: d ? d.name : L('Nouveau médicament', 'New drug'), wide: true,
    body: `<div class="form f3">${[{ name: 'name', label: L('Nom commercial et dosage', 'Name and strength'), required: true }, { name: 'dci', label: 'DCI' }, { name: 'form', label: L('Forme', 'Form') }, { name: 'strength', label: L('Dosage', 'Strength') }, { name: 'category', label: L('Classe thérapeutique', 'Category') }, { name: 'unit', label: L('Unité', 'Unit'), value: 'cp' },
      { name: 'price', label: L('Prix de vente', 'Price'), type: 'number' }, { name: 'reorder', label: L('Seuil de commande', 'Reorder level'), type: 'number' }, { name: 'barcode', label: L('Code-barres', 'Barcode') },
      { name: 'classes', label: L('Classes (interactions)', 'Classes (interactions)'), hint: 'nsaid, anticoag, betalactam…' }].map((x) => field(x, d || {})).join('')}
      ${field({ name: 'rx_only', label: L('Sur ordonnance uniquement', 'Prescription only'), type: 'checkbox' }, d || { rx_only: 1 })}${field({ name: 'active', label: L('Actif', 'Active'), type: 'checkbox' }, d || { active: 1 })}</div>`,
    onSubmit: (x) => (d ? api.put(`/api/clinic/drugs/${d.id}`, x) : api.post('/api/clinic/drugs', x)) });
}

async function drugCard(id) {
  const d = await api.get(`/api/clinic/drugs/${id}`, { cache: false });
  const pharm = can('pharmacy');
  let act = null;
  await dialog({ title: d.name, wide: true, submit: null, cancel: L('Fermer', 'Close'),
    body: `<p class="muted">${esc(d.dci)} · ${esc(d.form || '')} ${esc(d.strength || '')} · ${esc(d.category || '')} · <b>${money(d.price)}</b> · ${L('coût moyen', 'avg cost')} ${money(d.cost)}</p>
      <h4>${L('Lots en stock', 'Lots in stock')} (${num(d.stock)})</h4>${table({ rows: d.lots, columns: [{ label: L('Lot', 'Lot'), key: 'lot' }, { label: L('Péremption', 'Expiry'), render: (l) => `<span class="pill ${l.expiry < today() ? 'bad' : ''}">${dt(l.expiry)}</span>` }, { label: L('Qté', 'Qty'), cls: 'r', render: (l) => num(l.qty) }, { label: L('Coût', 'Cost'), cls: 'r', render: (l) => money(l.cost) }] })}
      <h4>${L('Derniers mouvements', 'Recent moves')}</h4>${table({ rows: d.moves.slice(0, 15), columns: [{ label: 'Date', render: (m) => dtm(m.at) }, { label: L('Type', 'Type'), key: 'kind' }, { label: L('Qté', 'Qty'), cls: 'r', render: (m) => `<b class="${m.qty < 0 ? 'bad-t' : ''}">${m.qty > 0 ? '+' : ''}${num(m.qty)}</b>` }, { label: L('Réf.', 'Ref.'), render: (m) => esc(m.ref || m.note || '') }] })}
      ${pharm ? `<div class="menu-grid" style="margin-top:12px"><button type="button" data-a="edit">${icon('edit')}<b>${L('Modifier', 'Edit')}</b></button><button type="button" data-a="count">${icon('list')}<b>${L('Inventaire', 'Stock count')}</b></button>${d.lots.some((l) => l.expiry < today()) ? `<button type="button" class="danger" data-a="expired">${icon('trash')}<b>${L('Retirer les périmés', 'Remove expired')}</b></button>` : ''}</div>` : ''}`,
    onOpen: (dl) => dl.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => { act = b.dataset.a; dl.querySelector('[data-x]').click(); })) });
  try {
    if (act === 'edit') return await drugDialog(d);
    if (act === 'expired') { await api.post('/api/clinic/pharmacy/adjust', { drug_id: d.id, kind: 'expired' }); toast(L('Lots périmés retirés', 'Expired lots removed'), 'ok'); return true; }
    if (act === 'count') return await dialog({ title: `${L('Inventaire', 'Stock count')} · ${d.name}`, body: `<div class="form f2">${field({ name: 'counted', label: L('Quantité comptée', 'Counted'), type: 'number', value: d.stock, required: true })}${field({ name: 'note', label: L('Commentaire', 'Note') })}</div>`, onSubmit: (x) => api.post('/api/clinic/pharmacy/adjust', { drug_id: d.id, kind: 'adjust', ...x }) });
  } catch (e) { fail(e); }
  return null;
}

async function receiveDialog() {
  const drugs = await api.get('/api/clinic/drugs?all=1', { cache: false });
  const inYear = new Date(Date.now() + 540 * 864e5).toISOString().slice(0, 10);
  const line = () => `<div class="cl-rcv"><input class="in" name="drug" list="rdl" placeholder="${L('Médicament', 'Drug')}" required><input class="in" name="lot" placeholder="${L('N° lot', 'Lot no.')}"><input class="in" type="date" name="expiry" value="${inYear}"><input class="in num" name="qty" placeholder="${L('Qté', 'Qty')}" inputmode="decimal"><input class="in num" name="cost" placeholder="${L('Coût unit.', 'Unit cost')}" inputmode="decimal"><button type="button" class="btn ghost sm" data-del>${icon('trash')}</button></div>`;
  return dialog({ title: L('Réception de commande', 'Receive an order'), wide: true, submit: L('Entrer en stock', 'Add to stock'),
    body: `<div class="form f2">${field({ name: 'supplier', label: L('Fournisseur', 'Supplier'), placeholder: 'CENAME, LABOREX…' })}${field({ name: 'reference', label: L('N° de bon / facture', 'Delivery / invoice no.') })}</div>
      <datalist id="rdl">${drugs.map((d) => `<option value="${esc(d.name)}">`).join('')}</datalist><div id="rl">${line()}${line()}</div><button type="button" class="btn sm" id="addr">${icon('plus')} ${L('Ligne', 'Line')}</button>
      <p class="muted sm">${L('La facture fournisseur est créée et comptabilisée automatiquement (compte 6011). Le coût moyen pondéré est mis à jour.', 'The supplier bill is created and posted automatically. Weighted average cost is updated.')}</p>`,
    onOpen: (d) => { const box = d.querySelector('#rl'); d.querySelector('#addr').addEventListener('click', () => box.insertAdjacentHTML('beforeend', line())); box.addEventListener('click', (e) => { if (e.target.closest('[data-del]') && box.children.length > 1) e.target.closest('.cl-rcv').remove(); }); },
    onSubmit: (x, f) => {
      const lines = [...f.querySelectorAll('.cl-rcv')].map((r) => { const o = Object.fromEntries([...r.querySelectorAll('input')].map((i) => [i.name, i.value.trim()])); const d = drugs.find((y) => y.name === o.drug); return o.drug ? { drug_id: d?.id, name: o.drug, lot: o.lot, expiry: o.expiry, qty: o.qty.replace(',', '.'), cost: o.cost === '' ? undefined : o.cost.replace(',', '.') } : null; }).filter(Boolean);
      const unknown = lines.find((l) => !l.drug_id); if (unknown) throw new Error(`${L('Médicament inconnu', 'Unknown drug')} : ${unknown.name}`);
      if (!lines.length) throw new Error(L('Ajoutez au moins une ligne', 'Add at least one line'));
      return api.post('/api/clinic/pharmacy/receive', { supplier: x.supplier, reference: x.reference, lines });
    } });
}

