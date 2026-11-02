// Teknons Santé (clinics and hospitals): navigation, dashboards by role, the
// arrival desk with the waiting queue, the agenda, the patient list and the
// 360° patient file. The consultation, lab, wards and pharmacy are in
// clinic-care.js; cashier, insurers, reports, surveillance and settings in
// clinic-admin.js.
import { api } from './api.js';
import { state, L, esc, money, moneyShort, num, dt, today, icon, can, canAny, table, field, dialog, toast, showError, offlineNote, qs } from './ui.js';

export const routes = [];
export const R = (path, fn, live = false) => routes.push([path, fn, live]);
export const S = () => state.clinic;
export const fail = (e) => { if (!e?.quiet) showError(e); };
export const role = () => state.me.user.role;
export const me = () => S()?.me;
export const clinical = () => canAny('care', 'prescribe');
export async function refreshMeta() { try { state.clinic = await api.get('/api/clinic/meta', { cache: false }); } catch {} }
export const kpi = (l, v, s = '', cls = '', href = '') => `<${href ? `a href="${href}"` : 'div'} class="card kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></${href ? 'a' : 'div'}>`;
export const waNumber = (p) => String(p || '').replace(/\D/g, '').replace(/^(6\d{8})$/, '237$1');
export const wa = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
export const avatar = (p, size = 36) => `<span class="cl-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 2.6)}px" data-sex="${esc(p.sex || '')}">${esc(((p.last_name || '?')[0] || '') + ((p.first_name || '')[0] || ''))}</span>`;
export const ageTxt = (p) => (p.age == null ? '' : p.age >= 2 ? `${p.age} ${L('ans', 'y')}` : L('nourrisson', 'infant'));
export const pname = (p) => `<b>${esc(p.last_name)}</b> ${esc(p.first_name || '')}`;
export const time = (iso) => (iso ? new Date(iso).toLocaleTimeString(state.lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
export const dtm = (iso) => (iso ? `${dt(iso)} ${time(iso)}` : '');
export const mins = (m) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);
export const TRIAGE = { 1: ['Immédiat', 'Immediate', '#DC2626'], 2: ['Très urgent', 'Very urgent', '#EA580C'], 3: ['Urgent', 'Urgent', '#CA8A04'], 4: ['Standard', 'Standard', '#16A34A'], 5: ['Non urgent', 'Non-urgent', '#2563EB'] };
export const triage = (n) => { const t = TRIAGE[n] || TRIAGE[4]; return `<span class="cl-tri" style="--c:${t[2]}">${esc(L(t[0], t[1]))}</span>`; };
export const newsPill = (n) => (n == null ? '' : `<span class="pill ${n >= 7 ? 'bad' : n >= 5 ? 'warn' : n >= 1 ? 'info' : 'ok'}" title="NEWS2">NEWS ${n}</span>`);
const KIND = { consult: ['Consultation', 'Consultation'], emergency: ['Urgence', 'Emergency'], tele: ['Téléconsultation', 'Teleconsultation'], followup: ['Contrôle', 'Follow-up'], antenatal: ['CPN', 'Antenatal'], care: ['Soins', 'Nursing care'] };
export const kindName = (k) => L(...(KIND[k] || [k, k]));
const APPT = { booked: ['Réservé', 'Booked', 'info'], confirmed: ['Confirmé', 'Confirmed', 'info'], arrived: ['Arrivé', 'Arrived', 'ok'], done: ['Vu', 'Seen', 'ok'], no_show: ['Absent', 'No-show', 'bad'], cancelled: ['Annulé', 'Cancelled', ''] };
export const apptPill = (s) => { const x = APPT[s] || [s, s, '']; return `<span class="pill ${x[2]}">${esc(L(x[0], x[1]))}</span>`; };
const METHODS = { cash: ['Espèces', 'Cash'], mtn_momo: ['MTN MoMo', 'MTN MoMo'], orange_money: ['Orange Money', 'Orange Money'], bank: ['Virement', 'Bank transfer'], cheque: ['Chèque', 'Cheque'] };
export const methodName = (m) => L(...(METHODS[m] || [m, m]));
export const prOpts = (all = true) => [...(all ? [['', L('Tous les praticiens', 'All practitioners')]] : []), ...(S()?.practitioners || []).filter((p) => p.active).map((p) => [p.id, `${p.title || 'Dr'} ${p.name}${p.specialty ? ` · ${p.specialty}` : ''}`])];
export const icdName = (c) => { const x = S()?.icd?.find((i) => i.code === c); return x ? L(x.fr, x.en) : c; };

/** Small SVG line chart for vital trends. */
export function spark(values, { w = 220, h = 46, color = 'var(--blue)', lo, hi } = {}) {
  const v = values.filter((x) => x != null && !Number.isNaN(Number(x))).map(Number);
  if (v.length < 2) return `<div class="muted sm">${v.length ? v[0] : '—'}</div>`;
  const min = Math.min(...v, lo ?? Infinity), max = Math.max(...v, hi ?? -Infinity), span = max - min || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * (w - 6) + 3},${h - 4 - ((x - min) / span) * (h - 8)}`).join(' ');
  const band = lo != null && hi != null ? `<rect x="0" y="${h - 4 - ((hi - min) / span) * (h - 8)}" width="${w}" height="${((hi - lo) / span) * (h - 8)}" fill="var(--ok-bg)"/>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" class="cl-spark">${band}<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${v.map((x, i) => (i === v.length - 1 ? `<circle cx="${(i / (v.length - 1)) * (w - 6) + 3}" cy="${h - 4 - ((x - min) / span) * (h - 8)}" r="3" fill="${color}"/>` : '')).join('')}</svg>`;
}

// ---------- NEWS2 in the browser (same rules as the server) ----------
export function news2(v) {
  const n = (k) => (v[k] === '' || v[k] == null ? null : Number(String(v[k]).replace(',', '.')));
  const rr = n('resp'), sp = n('spo2'), sys = n('bp_sys'), hr = n('pulse'), t = n('temp');
  if ([rr, sp, sys, hr, t].filter((x) => x != null && !Number.isNaN(x)).length < 3) return null;
  let s = 0;
  if (rr != null) s += rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
  if (sp != null) s += sp <= 91 ? 3 : sp <= 93 ? 2 : sp <= 95 ? 1 : 0;
  if (v.o2) s += 2;
  if (sys != null) s += sys <= 90 ? 3 : sys <= 100 ? 2 : sys <= 110 ? 1 : sys <= 219 ? 0 : 3;
  if (hr != null) s += hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
  if (v.avpu && v.avpu !== 'A') s += 3;
  if (t != null) s += t <= 35 ? 3 : t <= 36 ? 1 : t <= 38 ? 0 : t <= 39 ? 1 : 2;
  return s;
}
export const VITALS = [['bp_sys', 'TA syst.', 'SBP', 'mmHg'], ['bp_dia', 'TA diast.', 'DBP', 'mmHg'], ['pulse', 'Pouls', 'Pulse', '/min'], ['temp', 'Temp.', 'Temp.', '°C'], ['resp', 'FR', 'RR', '/min'], ['spo2', 'SpO₂', 'SpO₂', '%'], ['weight', 'Poids', 'Weight', 'kg'], ['height', 'Taille', 'Height', 'cm'], ['glucose', 'Glycémie', 'Glucose', 'g/L'], ['pain', 'Douleur', 'Pain', '/10']];
export function vitalsForm(v = {}) {
  return `<div class="cl-vitals">${VITALS.map(([k, fr, en, u]) => `<label><span>${esc(L(fr, en))}</span><input class="in num" name="v_${k}" inputmode="decimal" value="${v[k] ?? ''}" placeholder="${u}"></label>`).join('')}
    <label><span>${L('Conscience', 'AVPU')}</span><select class="in" name="v_avpu">${['A', 'V', 'P', 'U'].map((x) => `<option ${v.avpu === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="check" style="align-self:end"><input type="checkbox" name="v_o2" ${v.o2 ? 'checked' : ''}> O₂</label>
    <div class="cl-news" data-news>${newsPill(news2(v))}</div></div>`;
}
export function readVitals(form) {
  const out = {};
  for (const [k] of VITALS) { const x = form.querySelector(`[name=v_${k}]`)?.value; if (x !== '' && x != null) out[k] = x.replace(',', '.'); }
  out.avpu = form.querySelector('[name=v_avpu]')?.value || 'A';
  if (form.querySelector('[name=v_o2]')?.checked) out.o2 = 1;
  return out;
}
export function liveNews(root) {
  const upd = () => { const el = root.querySelector('[data-news]'); if (el) { const s = news2(readVitals(root)); el.innerHTML = s == null ? `<span class="muted sm">NEWS2 —</span>` : newsPill(s) + (s >= 7 ? ` <b style="color:var(--bad)">${L('Appel médecin immédiat', 'Call doctor now')}</b>` : s >= 5 ? ` <b style="color:var(--warn)">${L('Surveillance rapprochée', 'Urgent review')}</b>` : ''); } };
  root.addEventListener('input', (e) => { if (e.target.name?.startsWith('v_')) upd(); });
  root.addEventListener('change', (e) => { if (e.target.name?.startsWith('v_')) upd(); });
  upd();
}

// ===================== Navigation =====================
export function nav(item) {
  const unread = S()?.unread ? ` <b class="cl-dot">${S().unread}</b>` : '';
  return `<h6>${L('Accueil des patients', 'Front desk')}</h6>
  ${item('/clinic/desk', 'concierge', "Accueil et file d'attente", 'Desk & queue', canAny('reception', 'care', 'prescribe'))}
  ${item('/clinic/agenda', 'calendar', 'Agenda et rendez-vous', 'Agenda & bookings')}
  ${item('/clinic/patients', 'users', 'Patients', 'Patients')}
  ${canAny('care', 'prescribe', 'reception') ? `<a href="#/clinic/messages" data-nav="/clinic/messages">${icon('bell')}<span>${L('Messages patients', 'Patient messages')}${unread}</span></a>` : ''}
  <h6>${L('Soins', 'Care')}</h6>
  ${item('/clinic/consult', 'clipboard', 'Consultations', 'Consultations', clinical())}
  ${item('/clinic/lab', 'scan', 'Laboratoire et imagerie', 'Lab & imaging', canAny('lab', 'care', 'prescribe'))}
  ${item('/clinic/wards', 'bed', 'Hospitalisation', 'Wards & beds', canAny('ward', 'care', 'reception'))}
  ${item('/clinic/pharmacy', 'box', 'Pharmacie', 'Pharmacy', canAny('pharmacy', 'settings'))}
  <h6>${L('Gestion', 'Management')}</h6>
  ${item('/clinic/cashier', 'cash', 'Caisse et facturation', 'Cashier & billing', canAny('treasury', 'sales', 'reception'))}
  ${item('/clinic/insurers', 'shield', 'Assureurs et tiers payant', 'Insurers & claims', canAny('accounting', 'settings', 'reception'))}
  ${item('/clinic/reports', 'chart', 'Activité et rapports', 'Activity & reports', can('reports'))}
  ${item('/clinic/surveillance', 'globe', 'Surveillance épidémiologique', 'Disease surveillance', canAny('reports', 'care', 'prescribe'))}
  ${item('/clinic/settings', 'gear', "Réglages de l'établissement", 'Clinic settings', can('settings'))}`;
}
export function bottomNav() {
  const r = role();
  const a = (h, ic, fr, en) => `<a href="#${h}" data-nav="${h}">${icon(ic)}${L(fr, en)}</a>`;
  if (r === 'doctor') return a('/', 'home', 'Ma journée', 'My day') + a('/clinic/consult', 'clipboard', 'Patients', 'Patients') + a('/clinic/lab', 'scan', 'Résultats', 'Results') + a('/clinic/wards', 'bed', 'Lits', 'Beds');
  if (r === 'labtech') return a('/clinic/lab', 'scan', 'Paillasse', 'Worklist') + a('/clinic/patients', 'users', 'Patients', 'Patients') + a('/alerts', 'bell', 'Alertes', 'Alerts');
  if (r === 'pharmacist') return a('/clinic/pharmacy', 'box', 'Pharmacie', 'Pharmacy') + a('/clinic/pharmacy?tab=counter', 'cart', 'Comptoir', 'Counter') + a('/clinic/pharmacy?tab=stock', 'list', 'Stock', 'Stock');
  if (r === 'nurse') return a('/clinic/desk', 'concierge', 'File', 'Queue') + a('/clinic/wards', 'bed', 'Lits', 'Beds') + a('/clinic/patients', 'users', 'Patients', 'Patients');
  return a('/', 'home', 'Accueil', 'Home') + a('/clinic/desk', 'concierge', 'File', 'Queue') + a('/clinic/agenda', 'calendar', 'Agenda', 'Agenda') + a('/clinic/cashier', 'cash', 'Caisse', 'Cashier');
}

// Waiting-room calls also pop up on the staff screens.
window.addEventListener('tk:display', (e) => { const d = e.detail; if (d?.kind === 'clinic_call') toast(`🔔 ${L('Ticket', 'Ticket')} ${d.ticket} → ${d.room || d.practitioner}`, 'ok'); });

// ===================== Dashboards =====================
export async function dashboard(ctx) {
  const r = role();
  if (r === 'doctor' || (me() && !canAny('reports'))) return (await import('./clinic-care.js')).doctorHome(ctx);
  if (r === 'labtech') { location.hash = '#/clinic/lab'; return; }
  if (r === 'pharmacist') { location.hash = '#/clinic/pharmacy'; return; }
  if (r === 'nurse' || r === 'reception') { location.hash = '#/clinic/desk'; return; }
  ctx.title(L('Tableau de bord', 'Dashboard'));
  ctx.actions(`<a class="btn" target="_blank" href="${esc(S().display_url)}">${icon('monitor')}<span class="hide-m">${L('Écran salle d\'attente', 'Waiting-room screen')}</span></a><a class="btn primary" href="#/clinic/desk">${icon('concierge')}<span class="hide-m">${L('Accueillir un patient', 'Check a patient in')}</span></a>`);
  const d = await api.get('/api/clinic/dashboard');
  const v = d.visits, a = d.appointments, m = d.money;
  const maxV = Math.max(1, ...d.trend.map((x) => x.visits));
  const srcTotal = (m?.by_source || []).reduce((s, x) => s + x.v, 0) || 1;
  const SRC = { consult: ['Consultations', 'Consultations'], lab: ['Laboratoire', 'Lab'], imaging: ['Imagerie', 'Imaging'], pharmacy: ['Pharmacie', 'Pharmacy'], bed: ['Hospitalisation', 'Wards'], surgery: ['Chirurgie', 'Surgery'], act: ['Actes', 'Procedures'], care: ['Soins', 'Care'], other: ['Autres', 'Other'] };
  const growth = m && m.last_month ? Math.round(((m.month - m.last_month) / m.last_month) * 100) : null;
  ctx.el.innerHTML = `${offlineNote(d)}
  ${d.signals.filter((s) => s.level === 'danger').map((s) => `<div class="card banner bad"><b>⚠ ${L('Surveillance', 'Surveillance')}</b> · ${esc(L(s.fr, s.en))} · <a href="#/clinic/surveillance">${L('Ouvrir', 'Open')}</a></div>`).join('')}
  ${d.critical.length ? `<div class="card banner bad"><b>${d.critical.length} ${L('résultat(s) critique(s) depuis 48 h', 'critical result(s) in 48 h')}</b> · ${d.critical.map((c) => `${esc(c.test_name)} – ${esc(c.last_name)}`).join(' · ')}</div>` : ''}
  <div class="grid g4">
    ${kpi(L('Patients aujourd\'hui', 'Patients today'), num(v.total || 0), `${v.waiting || 0} ${L('en attente', 'waiting')} · ${v.in_consult || 0} ${L('en consultation', 'in consultation')} · ${v.done || 0} ${L('vus', 'seen')}`, 'accent', '#/clinic/desk')}
    ${kpi(L('Attente moyenne', 'Average wait'), mins(v.avg_wait), v.longest ? `${L('la plus longue', 'longest')} ${mins(v.longest)}` : L('arrivée → consultation', 'arrival → consultation'), v.longest > 60 ? 'warn' : '', '#/clinic/desk')}
    ${kpi(L('Rendez-vous', 'Appointments'), `${a.arrived || 0}<small style="font-size:14px"> / ${a.total || 0}</small>`, `${a.online || 0} ${L('en ligne', 'online')} · ${a.tele || 0} ${L('téléconsult.', 'tele')} · ${d.no_show_rate} % ${L('absents (30 j)', 'no-show (30 d)')}`, '', '#/clinic/agenda')}
    ${m ? kpi(L('Recettes du mois', 'Revenue this month'), money(m.month), `${L('encaissé aujourd\'hui', 'collected today')} ${money(m.today)}${growth != null ? ` · <b style="color:${growth >= 0 ? 'var(--ok)' : 'var(--bad)'}">${growth >= 0 ? '+' : ''}${growth} %</b>` : ''}`, '', '#/clinic/reports') : kpi(L('Lits occupés', 'Beds occupied'), `${d.beds.occupied || 0}/${d.beds.total || 0}`, `${d.beds.rate} %`, '', '#/clinic/wards')}
  </div>
  ${d.insights.length ? `<div class="card" style="margin-top:16px"><div class="row between" style="margin-bottom:10px"><span class="ai-tag">✦ Teknons Insight</span></div><div class="rs-ins">${d.insights.map((i) => `<div class="ins ${i.level}"><b>${esc(i.title)}</b><p>${esc(i.body)}</p></div>`).join('')}</div></div>` : ''}
  <div class="grid g3" style="margin-top:16px">
    <div class="card"><h3>${icon('users')} ${L('Médecins en ce moment', 'Doctors right now')}</h3>
      ${d.doctors.map((x) => `<div class="lrow row between"><span><i class="cl-chip" style="background:${esc(x.color)}"></i>${esc(x.title || 'Dr')} ${esc(x.name)} <span class="muted sm">${esc(x.room || '')}</span></span><span class="row" style="gap:4px">${x.in_consult ? `<span class="pill info">${L('en consultation', 'busy')}</span>` : ''}<span class="pill ${x.waiting >= 5 ? 'bad' : x.waiting ? 'warn' : ''}">${x.waiting || 0} ${L('en attente', 'waiting')}</span><span class="pill ok">${x.done || 0} ${L('vus', 'seen')}</span></span></div>`).join('') || `<p class="muted">${L('Aucun praticien configuré.', 'No practitioner yet.')} <a href="#/clinic/settings?tab=practitioners">${L('Ajouter', 'Add')}</a></p>`}
      <div class="cl-call"><small>${L('Dernier appel', 'Last call')}</small>${d.display.calls[0] ? `<b>${L('Ticket', 'Ticket')} ${d.display.calls[0].ticket}</b> → ${esc(d.display.calls[0].room || d.display.calls[0].practitioner)}` : '—'}</div></div>
    <div class="card"><h3>${L('Fréquentation sur 30 jours', 'Attendance, 30 days')}</h3>
      <div class="hbars small">${d.trend.map((t, i) => `<div class="hb" title="${dt(t.d)} : ${t.visits} · ${money(t.revenue)}"><i style="height:${Math.max(2, (t.visits / maxV) * 100)}%"></i><span>${i % 5 === 0 || i === d.trend.length - 1 ? t.d.slice(8) : ''}</span></div>`).join('')}</div>
      ${m?.by_source?.length ? `<h3 style="margin-top:14px">${L('Recettes du mois par activité', 'Revenue by activity')}</h3><div class="stackbar">${m.by_source.map((s, i) => `<i class="cl-s${i % 6}" style="width:${(s.v / srcTotal) * 100}%"></i>`).join('')}</div>
      <div class="legend" style="flex-wrap:wrap;margin-top:8px">${m.by_source.map((s, i) => `<span><i class="cl-s${i % 6}"></i>${esc(L(...(SRC[s.source] || [s.source, s.source])))} <b class="num">${moneyShort(s.v)}</b></span>`).join('')}</div>` : ''}</div>
    <div class="card"><h3>${L('Diagnostics fréquents (30 j)', 'Top diagnoses (30 d)')}</h3>
      ${d.diagnoses.length ? `<div class="bar-list">${d.diagnoses.slice(0, 8).map((x) => `<div class="it"><span>${esc(L(x.fr, x.en))} <span class="muted sm mono">${esc(x.code)}</span>${x.surveillance ? ` <span class="pill warn">MAPE</span>` : ''}</span><b class="num">${x.n}</b><div class="tr"><i style="width:${(x.n / d.diagnoses[0].n) * 100}%"></i></div></div>`).join('')}</div>` : `<p class="muted">${L('Les diagnostics apparaissent dès les premières consultations.', 'Diagnoses appear after the first consultations.')}</p>`}</div>
  </div>
  <div class="grid g4" style="margin-top:16px">
    <a class="card cl-tile" href="#/clinic/wards"><h3>${icon('bed')} ${L('Hospitalisation', 'Wards')}</h3><div class="cl-ring" style="--p:${d.beds.rate}"><b>${d.beds.rate}%</b></div><div class="muted sm">${d.beds.occupied || 0}/${d.beds.total || 0} ${L('lits occupés', 'beds occupied')} · ${d.beds.cleaning || 0} ${L('à nettoyer', 'to clean')}<br>${d.beds.admissions_month} ${L('entrées ce mois', 'admissions this month')}${d.beds.alos != null ? ` · DMS ${String(d.beds.alos).replace('.', ',')} j` : ''}</div></a>
    <a class="card cl-tile" href="#/clinic/lab"><h3>${icon('scan')} ${L('Laboratoire', 'Laboratory')}</h3><div class="big num">${d.lab.pending || 0}</div><div class="muted sm">${L('examens en cours', 'tests in progress')} · ${d.lab.to_sample || 0} ${L('à prélever', 'to sample')} · ${d.lab.to_validate || 0} ${L('à valider', 'to validate')}<br>${d.lab.late ? `<b style="color:var(--bad)">${d.lab.late} ${L('hors délai', 'late')}</b> · ` : ''}${L('délai moyen', 'avg TAT')} ${d.lab.tat != null ? String(d.lab.tat).replace('.', ',') + ' h' : '—'}</div></a>
    <a class="card cl-tile" href="#/clinic/pharmacy"><h3>${icon('box')} ${L('Pharmacie', 'Pharmacy')}</h3><div class="big num">${d.pharmacy.rx_to_serve}</div><div class="muted sm">${L('ordonnances à servir', 'prescriptions to fill')}<br>${d.pharmacy.out_of_stock ? `<b style="color:var(--bad)">${d.pharmacy.out_of_stock} ${L('en rupture', 'out of stock')}</b> · ` : ''}${d.pharmacy.low || 0} ${L('stock bas', 'low')} · ${d.pharmacy.expiring} ${L('péremption < 90 j', 'expiring < 90 d')}</div></a>
    ${m ? `<a class="card cl-tile" href="#/clinic/insurers"><h3>${icon('shield')} ${L('À encaisser', 'Receivables')}</h3><div class="lrow row between"><span>${L('Patients', 'Patients')}</span><b class="num">${money(m.patients_due)}</b></div><div class="lrow row between"><span>${L('À réclamer aux assureurs', 'To claim from insurers')}</span><b class="num">${money(m.to_claim)}</b></div><div class="lrow row between"><span>${L('Bordereaux non réglés', 'Unpaid claims')}</span><b class="num">${money(m.insurers_due)}</b></div></a>` : ''}
  </div>`;
}

// ===================== Patient picker and dialogs =====================
/** Opens a search dialog and resolves with a patient (or creates one). */
export function pickPatient({ title = L('Choisir le patient', 'Choose the patient') } = {}) {
  return new Promise((resolve) => {
    let picked = null;
    dialog({ title, wide: true, submit: null, cancel: L('Fermer', 'Close'),
      body: `<div class="row" style="gap:8px"><input class="in" style="flex:1" type="search" id="pq" placeholder="${L('Nom, téléphone, n° de dossier, carte…', 'Name, phone, file number, card…')}" autofocus><button type="button" class="btn primary" id="pnew">${icon('plus')} ${L('Nouveau', 'New')}</button></div><div id="pres" style="margin-top:10px;max-height:52vh;overflow:auto"></div>`,
      onOpen: (d) => {
        const res = d.querySelector('#pres'); let t;
        const run = async () => {
          const q = d.querySelector('#pq').value.trim();
          const rows = await api.get('/api/clinic/patients' + qs({ q, recent: q ? '' : 1, limit: 30 }), { cache: false }).catch(() => []);
          res.innerHTML = rows.map((p) => `<button type="button" class="cl-pick" data-id="${p.id}">${avatar(p, 34)}<span>${pname(p)}<small>${esc(p.mrn)} · ${ageTxt(p)} · ${esc(p.phone || '')}${p.insurer_name ? ` · ${esc(p.insurer_name)}` : ''}</small></span></button>`).join('') || `<p class="muted">${L('Aucun patient trouvé.', 'No patient found.')}</p>`;
          res.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { picked = rows.find((x) => x.id === Number(b.dataset.id)); d.querySelector('[data-x]').click(); }));
        };
        d.querySelector('#pq').addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 250); });
        d.querySelector('#pnew').addEventListener('click', async () => { const p = await patientDialog(); if (p) { picked = p; d.querySelector('[data-x]').click(); } });
        run();
      } }).then(() => resolve(picked));
  });
}

export async function patientDialog(p = null) {
  const ins = [['', L('Aucun (patient payant)', 'None (self-pay)')], ...(S().insurers || []).filter((i) => i.active).map((i) => [i.id, `${i.name} (${i.coverage_pct} %)`])];
  const clin = clinical();
  return dialog({ title: p ? L('Modifier le dossier', 'Edit patient') : L('Nouveau patient', 'New patient'), wide: true,
    body: `<div class="form f3">${[
      { name: 'last_name', label: L('Nom', 'Last name'), required: true }, { name: 'first_name', label: L('Prénom(s)', 'First name(s)') },
      { name: 'sex', label: L('Sexe', 'Sex'), type: 'select', options: [['F', L('Féminin', 'Female')], ['M', L('Masculin', 'Male')]] },
      { name: 'birth_date', label: L('Date de naissance', 'Date of birth'), type: 'date' }, { name: 'phone', label: L('Téléphone', 'Phone'), placeholder: '6XX XX XX XX' }, { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'city', label: L('Ville / quartier', 'City / area') }, { name: 'profession', label: L('Profession', 'Occupation') },
      { name: 'blood_group', label: L('Groupe sanguin', 'Blood group'), type: 'select', options: [['', '—'], ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((x) => [x, x])] },
      { name: 'insurer_id', label: L('Assureur / tiers payant', 'Insurer'), type: 'select', options: ins }, { name: 'insurance_no', label: L('N° d\'assuré', 'Member no.') },
      { name: 'coverage_pct', label: L('Taux de prise en charge (%)', 'Cover (%)'), type: 'number', hint: L('Vide = taux du contrat', 'Empty = contract rate') },
      { name: 'emergency_name', label: L('Personne à prévenir', 'Emergency contact') }, { name: 'emergency_phone', label: L('Son téléphone', 'Their phone') },
      ...(clin ? [{ name: 'allergies', label: L('Allergies', 'Allergies'), placeholder: L('ex. pénicilline, sulfamides', 'e.g. penicillin') }, { name: 'chronic', label: L('Antécédents / maladies chroniques', 'History / chronic conditions') }, { name: 'treatments', label: L('Traitements en cours', 'Current treatments'), span: true }] : []),
    ].map((f) => field(f, p || { sex: 'F' })).join('')}${clin ? field({ name: 'pregnant', label: L('Grossesse en cours', 'Currently pregnant'), type: 'checkbox' }, p || {}) : ''}</div>`,
    onSubmit: async (v) => {
      try { return p ? await api.put(`/api/clinic/patients/${p.id}`, v) : await api.post('/api/clinic/patients', v); }
      catch (e) {
        if (e.data?.error === 'duplicate_patient' && confirm(`${e.message}\n\n${L('Créer quand même un nouveau dossier ?', 'Create a new file anyway?')}`)) return api.post('/api/clinic/patients', { ...v, force: true });
        throw e;
      }
    } });
}

/** Arrival of a patient: ticket in the queue and the consultation fee. */
export async function checkInDialog(patient, appt = null) {
  const prs = prOpts(false);
  const r = await dialog({ title: `${L('Accueil', 'Check-in')} · ${patient.last_name} ${patient.first_name || ''}`,
    body: `<div class="form f2">${[
      { name: 'kind', label: L('Type de venue', 'Visit type'), type: 'select', options: Object.entries(KIND).map(([k, v]) => [k, L(v[0], v[1])]), value: appt?.mode === 'tele' ? 'tele' : 'consult' },
      { name: 'practitioner_id', label: L('Praticien', 'Practitioner'), type: 'select', options: [['', L('Premier disponible', 'First available')], ...prs], value: appt?.practitioner_id || '' },
      { name: 'priority', label: L('Priorité (tri)', 'Triage priority'), type: 'select', options: Object.entries(TRIAGE).map(([k, v]) => [k, `${k} · ${L(v[0], v[1])}`]), value: 4 },
      { name: 'fee_amount', label: L('Frais de consultation (vide = tarif)', 'Consultation fee (empty = tariff)'), type: 'number' },
      { name: 'complaint', label: L('Motif de venue', 'Reason for visit'), span: true, value: appt?.reason || '' },
    ].map((f) => field(f)).join('')}</div>${patient.insurer_name ? `<p class="muted sm">${L('Tiers payant', 'Insurer')} : <b>${esc(patient.insurer_name)}</b> ${patient.cover != null ? `(${patient.cover} %)` : ''}</p>` : ''}`,
    submit: L('Mettre en file d\'attente', 'Add to queue'),
    onSubmit: (v) => api.post('/api/clinic/checkin', { ...v, patient_id: patient.id, appointment_id: appt?.id, fee_amount: v.fee_amount === '' ? undefined : v.fee_amount }) });
  if (r) toast(`${L('Ticket', 'Ticket')} ${r.ticket} · ${r.number}`, 'ok');
  return r;
}

export async function triageDialog(v) {
  return dialog({ title: `${L('Tri et constantes', 'Triage & vitals')} · ${v.last_name} ${v.first_name || ''}`, wide: true,
    body: `${vitalsForm(v.vitals || {})}<div class="form f2" style="margin-top:12px">${field({ name: 'priority', label: L('Priorité', 'Priority'), type: 'select', options: Object.entries(TRIAGE).map(([k, x]) => [k, `${k} · ${L(x[0], x[1])}`]), value: v.priority })}${field({ name: 'complaint', label: L('Motif', 'Complaint'), value: v.complaint })}</div>`,
    onOpen: (d) => liveNews(d),
    onSubmit: (x, form) => api.put(`/api/clinic/visits/${v.id}`, { vitals: readVitals(form), priority: x.priority, complaint: x.complaint }) });
}

export async function bookDialog({ patient = null, practitioner_id = '', date = today(), time: tm = '' } = {}) {
  patient = patient || await pickPatient({ title: L('Rendez-vous pour…', 'Appointment for…') });
  if (!patient) return null;
  return dialog({ title: `${L('Rendez-vous', 'Appointment')} · ${patient.last_name} ${patient.first_name || ''}`, wide: true,
    body: `<div class="form f3">${field({ name: 'practitioner_id', label: L('Praticien', 'Practitioner'), type: 'select', options: prOpts(false), value: practitioner_id, required: true })}${field({ name: 'date', label: 'Date', type: 'date', value: date, required: true })}
      ${field({ name: 'mode', label: L('Mode', 'Mode'), type: 'select', options: [['clinic', L('Au cabinet', 'In person')], ['tele', L('Téléconsultation (vidéo)', 'Video consultation')]] })}</div>
      <label class="fld">${L('Créneau', 'Time')} *<div class="cl-slots" id="slots"></div><input type="hidden" name="time" value="${esc(tm)}"></label>
      ${field({ name: 'reason', label: L('Motif', 'Reason') })}`,
    onOpen: (d) => {
      const load = async () => {
        const pr = d.querySelector('[name=practitioner_id]').value, dd = d.querySelector('[name=date]').value; const box = d.querySelector('#slots');
        if (!pr || !dd) { box.innerHTML = ''; return; }
        const s = await api.get(`/api/clinic/slots?practitioner_id=${pr}&date=${dd}`, { cache: false }).catch(() => []);
        const cur = d.querySelector('[name=time]').value;
        box.innerHTML = s.map((x) => `<button type="button" class="${x === cur ? 'on' : ''}" data-t="${x}">${x}</button>`).join('') || `<span class="muted sm">${L('Aucun créneau libre ce jour.', 'No free slot that day.')}</span>`;
        box.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { d.querySelector('[name=time]').value = b.dataset.t; box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
      };
      d.querySelector('[name=practitioner_id]').addEventListener('change', load); d.querySelector('[name=date]').addEventListener('change', load); load();
    },
    onSubmit: (v) => { if (!v.time) throw new Error(L('Choisissez un créneau', 'Pick a time')); return api.post('/api/clinic/appointments', { ...v, patient_id: patient.id }); } });
}

// ===================== Desk and queue =====================
R('/clinic/desk', async (ctx) => {
  ctx.title(L("Accueil et file d'attente", 'Desk & waiting queue'));
  ctx.actions(`<a class="btn" target="_blank" href="${esc(S().display_url)}">${icon('monitor')}<span class="hide-m">${L('Écran salle d\'attente', 'Waiting-room screen')}</span></a>${canAny('reception', 'care') ? `<button class="btn primary" id="arrive">${icon('plus')}<span class="hide-m">${L('Patient arrivé', 'Patient arrived')}</span></button>` : ''}`);
  const [q, appts] = await Promise.all([api.get('/api/clinic/queue'), api.get('/api/clinic/appointments?date=' + today())]);
  const waiting = q.filter((x) => x.status === 'waiting'), inc = q.filter((x) => x.status === 'in_consult'), done = q.filter((x) => x.status === 'done');
  const expected = appts.filter((a) => ['booked', 'confirmed'].includes(a.status));
  document.getElementById('arrive')?.addEventListener('click', async () => { const p = await pickPatient(); if (p && await checkInDialog(p)) ctx.rerender(); });
  const row = (v) => `<div class="cl-q ${v.status}" style="--c:${TRIAGE[v.priority]?.[2]}"><div class="cl-tk">${v.queue_no}</div>
    <div class="grow"><a href="#/clinic/patient/${v.patient_id}">${pname(v)}</a> <span class="muted sm">${ageTxt(v)} · ${esc(kindName(v.kind))}</span>${v.allergies && clinical() ? ` <span class="pill bad" title="${esc(v.allergies)}">${L('allergie', 'allergy')}</span>` : ''}
      <div class="muted sm">${triage(v.priority)} ${v.practitioner_name ? `${esc(v.title || 'Dr')} ${esc(v.practitioner_name)}` : L('premier disponible', 'first available')} · ${L('arrivé', 'arrived')} ${time(v.arrived_at)} · <b>${mins(v.wait_min)}</b>${v.complaint ? ` · ${esc(v.complaint)}` : ''}</div>
      ${Object.keys(v.vitals || {}).length ? `<div class="muted sm">${['bp_sys', 'pulse', 'temp', 'spo2'].filter((k) => v.vitals[k] != null).map((k) => `${{ bp_sys: 'TA', pulse: 'P', temp: 'T°', spo2: 'SpO₂' }[k]} ${k === 'bp_sys' ? `${v.vitals.bp_sys}/${v.vitals.bp_dia ?? '?'}` : v.vitals[k]}`).join(' · ')} ${newsPill(v.news)}</div>` : ''}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${v.unpaid ? `<a class="pill warn" href="#/clinic/cashier?patient=${v.patient_id}">${L('à payer', 'to pay')} ${money(v.unpaid)}</a>` : `<span class="pill ok">${L('réglé', 'paid')}</span>`}
      ${v.status !== 'done' && canAny('care', 'reception') ? `<button class="btn sm" data-tri="${v.id}">${icon('edit')} ${L('Constantes', 'Vitals')}</button>` : ''}
      ${v.status === 'waiting' && canAny('care', 'prescribe', 'reception') ? `<button class="btn sm" data-call="${v.id}">${icon('bell')} ${L('Appeler', 'Call')}</button>` : ''}
      ${v.status !== 'done' && clinical() && can('prescribe') ? `<a class="btn sm primary" href="#/clinic/visit/${v.id}">${L('Consulter', 'Open')}</a>` : ''}
      ${v.status === 'done' ? `<span class="pill">${L('vu à', 'seen')} ${time(v.ended_at)}</span>` : ''}</div></div>`;
  ctx.el.innerHTML = `<div class="grid g4" style="margin-bottom:14px">${kpi(L('En attente', 'Waiting'), waiting.length, waiting.length ? `${L('le plus long', 'longest')} ${mins(Math.max(...waiting.map((x) => x.wait_min)))}` : '', waiting.length > 8 ? 'warn' : 'accent')}${kpi(L('En consultation', 'In consultation'), inc.length)}${kpi(L('Vus aujourd\'hui', 'Seen today'), done.length)}${kpi(L('Rendez-vous attendus', 'Expected appointments'), expected.length, `${appts.filter((a) => a.status === 'arrived' || a.status === 'done').length} ${L('arrivés', 'arrived')}`)}</div>
  <div class="grid cl-desk"><div><h3 style="margin:0 0 8px">${L('File d\'attente', 'Queue')}</h3>${[...inc, ...waiting].map(row).join('') || `<div class="card empty"><b>${L('Personne en attente', 'Nobody waiting')}</b></div>`}
    ${done.length ? `<details style="margin-top:12px"><summary class="muted">${done.length} ${L('patient(s) vu(s) aujourd\'hui', 'patient(s) seen today')}</summary>${done.map(row).join('')}</details>` : ''}</div>
    <div class="card"><div class="row between"><h3>${icon('calendar')} ${L('Rendez-vous du jour', "Today's appointments")}</h3><a class="btn sm" href="#/clinic/agenda">${L('Agenda', 'Agenda')}</a></div>
      ${appts.filter((a) => a.status !== 'cancelled').map((a) => `<div class="lrow row between"><span><b>${esc(a.time)}</b> ${pname(a)} ${a.mode === 'tele' ? '<span class="pill info">vidéo</span>' : ''}<div class="muted sm">${esc(a.title || 'Dr')} ${esc(a.practitioner_name || '')}${a.reason ? ` · ${esc(a.reason)}` : ''}${a.source !== 'staff' ? ` · <span class="pill">${L('en ligne', 'online')}</span>` : ''}</div></span>
        <span class="row" style="gap:6px">${['booked', 'confirmed'].includes(a.status) && canAny('reception', 'care') ? `<button class="btn sm primary" data-arr="${a.id}">${L('Arrivé', 'Arrived')}</button>` : apptPill(a.status)}</span></div>`).join('') || `<p class="muted">${L('Aucun rendez-vous aujourd\'hui.', 'No appointment today.')}</p>`}</div></div>`;
  ctx.el.querySelectorAll('[data-arr]').forEach((b) => b.addEventListener('click', async () => {
    const a = appts.find((x) => x.id === Number(b.dataset.arr));
    if (await checkInDialog({ id: a.patient_id, last_name: a.last_name, first_name: a.first_name }, a)) ctx.rerender();
  }));
  ctx.el.querySelectorAll('[data-tri]').forEach((b) => b.addEventListener('click', async () => { if (await triageDialog(q.find((x) => x.id === Number(b.dataset.tri)))) ctx.rerender(); }));
  ctx.el.querySelectorAll('[data-call]').forEach((b) => b.addEventListener('click', async () => { try { const v = await api.post('/api/clinic/call', { visit_id: Number(b.dataset.call) }); toast(`${L('Ticket', 'Ticket')} ${v.queue_no} ${L('appelé', 'called')}`, 'ok'); } catch (e) { fail(e); } }));
}, true);

// ===================== Agenda =====================
R('/clinic/agenda', async (ctx) => {
  const date = ctx.query.date || today();
  ctx.title(L('Agenda', 'Agenda'));
  ctx.actions(`${canAny('reception', 'settings') ? `<button class="btn" id="rem">${icon('bell')}<span class="hide-m">${L('Rappels de demain', "Tomorrow's reminders")}</span></button>` : ''}<a class="btn" href="/api/clinic/appointments?date=${date}&format=xlsx">${icon('download')}<span class="hide-m">Excel</span></a><button class="btn primary" id="book">${icon('plus')}<span class="hide-m">${L('Rendez-vous', 'Appointment')}</span></button>`);
  const appts = await api.get(`/api/clinic/appointments?date=${date}`);
  const prs = (S().practitioners || []).filter((p) => p.active && (!ctx.query.pr || String(p.id) === ctx.query.pr));
  const dow = new Date(date + 'T12:00:00Z').getUTCDay();
  const step = S().settings.slot_minutes || 20;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const start = Math.min(...prs.map((p) => toMin(p.start)), 8 * 60), end = Math.max(...prs.map((p) => toMin(p.end)), 17 * 60);
  const shift = (n) => new Date(Date.parse(date) + n * 864e5).toISOString().slice(0, 10);
  document.getElementById('book').addEventListener('click', async () => { if (await bookDialog({ date })) ctx.rerender(); });
  document.getElementById('rem')?.addEventListener('click', () => reminders());
  const rows = []; for (let m = start; m < end; m += step) rows.push(m);
  ctx.el.innerHTML = `<div class="filters"><a class="btn" href="#/clinic/agenda${qs({ ...ctx.query, date: shift(-1) })}">‹</a><input class="in" type="date" id="d" value="${date}"><a class="btn" href="#/clinic/agenda${qs({ ...ctx.query, date: shift(1) })}">›</a>
    <a class="btn ${date === today() ? 'primary' : ''}" href="#/clinic/agenda${qs({ ...ctx.query, date: today() })}">${L("Aujourd'hui", 'Today')}</a>
    <select class="in" id="pr">${prOpts().map(([v, l]) => `<option value="${v}" ${String(v) === String(ctx.query.pr || '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <span class="muted sm">${appts.filter((a) => a.status !== 'cancelled').length} ${L('rendez-vous', 'appointments')} · ${appts.filter((a) => a.mode === 'tele').length} ${L('en vidéo', 'video')}</span></div>
  <div class="cl-agenda" style="--cols:${prs.length || 1}"><div class="cl-ag-h"><div></div>${prs.map((p) => `<div style="border-color:${esc(p.color)}"><b>${esc(p.title || 'Dr')} ${esc(p.name)}</b><small>${esc(p.specialty || '')}${p.room ? ` · ${esc(p.room)}` : ''}</small></div>`).join('')}</div>
    ${rows.map((m) => `<div class="cl-ag-r"><div class="cl-ag-t">${fmt(m)}</div>${prs.map((p) => {
    const works = p.days.split(',').map(Number).includes(dow) && m >= toMin(p.start) && m + step <= toMin(p.end);
    const here = appts.filter((a) => a.practitioner_id === p.id && a.status !== 'cancelled' && toMin(a.time) >= m && toMin(a.time) < m + step);
    return `<div class="cl-ag-c ${works ? '' : 'off'}" ${works && !here.length ? `data-free="${p.id}|${fmt(m)}"` : ''}>${here.map((a) => `<button class="cl-ap s-${a.status}" data-ap="${a.id}" style="--c:${esc(p.color)}"><b>${esc(a.time)} ${esc(a.last_name)} ${esc((a.first_name || '').split(' ')[0])}</b><small>${a.mode === 'tele' ? '🎥 ' : ''}${esc(a.reason || '')}</small></button>`).join('')}</div>`;
  }).join('')}</div>`).join('')}</div>`;
  document.getElementById('d').addEventListener('change', (e) => { location.hash = '#/clinic/agenda' + qs({ ...ctx.query, date: e.target.value }); });
  document.getElementById('pr').addEventListener('change', (e) => { location.hash = '#/clinic/agenda' + qs({ ...ctx.query, pr: e.target.value }); });
  ctx.el.querySelectorAll('[data-free]').forEach((c) => c.addEventListener('click', async () => { const [pr, tm] = c.dataset.free.split('|'); if (await bookDialog({ practitioner_id: pr, date, time: tm })) ctx.rerender(); }));
  ctx.el.querySelectorAll('[data-ap]').forEach((b) => b.addEventListener('click', async () => {
    const a = appts.find((x) => x.id === Number(b.dataset.ap));
    let choice = null;
    await dialog({ title: `${a.time} · ${a.last_name} ${a.first_name}`, submit: null, cancel: L('Fermer', 'Close'),
      body: `<p>${apptPill(a.status)} ${a.mode === 'tele' ? `<span class="pill info">${L('Téléconsultation', 'Video')}</span>` : ''} ${esc(a.title || 'Dr')} ${esc(a.practitioner_name)}${a.reason ? ` · ${esc(a.reason)}` : ''}</p><p class="muted sm">${L('Réservé par', 'Booked by')} ${esc({ staff: L('l\'accueil', 'the desk'), online: L('le patient (en ligne)', 'the patient (online)'), portal: L('le patient (portail)', 'the patient (portal)') }[a.source] || a.source)} · ${esc(a.phone || '')} · code <span class="mono">${esc(a.code)}</span></p>
        <div class="menu-grid">${['booked', 'confirmed'].includes(a.status) && canAny('reception', 'care') ? `<button type="button" data-a="arrive">${icon('check')}<b>${L('Patient arrivé', 'Patient arrived')}</b></button>` : ''}
        <button type="button" data-a="file">${icon('user')}<b>${L('Dossier', 'File')}</b></button>
        ${a.phone ? `<a target="_blank" href="${wa(a.phone, `Bonjour ${a.first_name}, ${state.me.company.name} vous rappelle votre rendez-vous du ${dt(a.date)} à ${a.time}. ${S().public_url}/rdv/${a.code}`)}">${icon('phone')}<b>WhatsApp</b></a>` : ''}
        ${['booked', 'confirmed'].includes(a.status) ? `<button type="button" data-a="no_show">${icon('x')}<b>${L('Absent', 'No-show')}</b></button><button type="button" class="danger" data-a="cancelled">${icon('trash')}<b>${L('Annuler', 'Cancel')}</b></button>` : ''}</div>`,
      onOpen: (d) => d.querySelectorAll('[data-a]').forEach((x) => x.addEventListener('click', () => { choice = x.dataset.a; d.querySelector('[data-x]').click(); })) });
    try {
      if (choice === 'arrive') { if (await checkInDialog({ id: a.patient_id, last_name: a.last_name, first_name: a.first_name }, a)) ctx.rerender(); }
      else if (choice === 'file') location.hash = `#/clinic/patient/${a.patient_id}`;
      else if (choice) { await api.put(`/api/clinic/appointments/${a.id}`, { status: choice }); ctx.rerender(); }
    } catch (e) { fail(e); }
  }));
}, true);

async function reminders() {
  const d = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const rows = await api.get(`/api/clinic/reminders?date=${d}`, { cache: false });
  dialog({ title: `${L('Rappels pour le', 'Reminders for')} ${dt(d)}`, wide: true, submit: null, cancel: L('Fermer', 'Close'),
    body: rows.length ? `<p class="muted sm">${L('Un clic ouvre WhatsApp avec le message prêt. Les patients rappelés viennent nettement plus.', 'Each click opens WhatsApp with the message ready.')}</p>${rows.map((a) => `<div class="lrow row between"><span><b>${esc(a.time)}</b> ${pname(a)}<div class="muted sm">${esc(a.title || 'Dr')} ${esc(a.practitioner_name)} · ${esc(a.phone)}</div></span><a class="btn sm primary" target="_blank" href="${wa(a.phone, a.text)}">WhatsApp</a></div>`).join('')}` : `<p class="muted">${L('Aucun rendez-vous demain.', 'No appointment tomorrow.')}</p>` });
}

// ===================== Patients =====================
R('/clinic/patients', async (ctx) => {
  const q = ctx.query;
  if (q.card) { const r = await api.get(`/api/clinic/patients?card=${encodeURIComponent(q.card)}`, { cache: false }); if (r[0]) { location.replace(`#/clinic/patient/${r[0].id}`); return; } toast(L('Carte inconnue', 'Unknown card'), 'err'); }
  ctx.title(L('Patients', 'Patients'));
  ctx.actions(`<a class="btn" href="/api/clinic/patients${qs({ q: q.q, format: 'xlsx' })}">${icon('download')}<span class="hide-m">Excel</span></a>${canAny('reception', 'care', 'settings') ? `<button class="btn primary" id="add">${icon('plus')}<span class="hide-m">${L('Nouveau patient', 'New patient')}</span></button>` : ''}`);
  const rows = await api.get('/api/clinic/patients' + qs({ q: q.q, all: q.all, insurer_id: q.insurer_id, recent: q.q ? '' : 1, limit: 300 }));
  document.getElementById('add')?.addEventListener('click', async () => { const p = await patientDialog(); if (p) location.hash = `#/clinic/patient/${p.id}`; });
  ctx.el.innerHTML = `${offlineNote(rows)}<form class="filters" id="f"><input class="in" type="search" name="q" placeholder="${L('Nom, téléphone, n° de dossier, n° d\'assuré…', 'Name, phone, file no., member no.…')}" value="${esc(q.q || '')}">
    <select class="in" name="insurer_id"><option value="">${L('Tous les assureurs', 'All insurers')}</option>${(S().insurers || []).map((i) => `<option value="${i.id}" ${String(i.id) === String(q.insurer_id || '') ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select>
    <label class="check"><input type="checkbox" name="all" ${q.all ? 'checked' : ''}> ${L('Inclure archivés et décédés', 'Include archived')}</label></form>
    <p class="muted sm">${rows.length} ${L('patient(s)', 'patient(s)')}${q.q ? '' : ` · ${L('les plus récents', 'most recent')}`}</p>
    ${table({ rows, href: (r) => `#/clinic/patient/${r.id}`, columns: [
      { label: '', render: (r) => avatar(r, 32) },
      { label: L('Patient', 'Patient'), render: (r) => `${pname(r)}${r.status !== 'active' ? ` <span class="pill">${esc(r.status)}</span>` : ''}<div class="muted sm mono">${esc(r.mrn)}</div>` },
      { label: L('Âge', 'Age'), render: (r) => `${ageTxt(r)} · ${r.sex}` },
      { label: L('Téléphone', 'Phone'), key: 'phone', hideM: true },
      { label: L('Tiers payant', 'Insurer'), render: (r) => (r.insurer_name ? `${esc(r.insurer_name)} <span class="muted sm">${r.cover} %</span>` : '<span class="dim">—</span>'), hideM: true },
      { label: L('Dernière visite', 'Last visit'), render: (r) => dt(r.last_visit), hideM: true }] })}`;
  const f = document.getElementById('f'); let t;
  f.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { location.hash = '#/clinic/patients' + qs({ q: f.q.value, insurer_id: f.insurer_id.value, all: f.all.checked ? 1 : '' }); }, 350); });
});

R('/clinic/patient/:id', async (ctx) => {
  const p = await api.get(`/api/clinic/patients/${ctx.params.id}`);
  ctx.title(`${p.last_name} ${p.first_name || ''}`);
  const tab = ctx.query.tab || (p.clinical ? 'overview' : 'admin');
  const clin = p.clinical;
  ctx.actions(`${canAny('reception', 'care', 'settings') ? `<button class="btn" id="edit">${icon('edit')}<span class="hide-m">${L('Modifier', 'Edit')}</span></button>` : ''}
    ${!p.open_visit && canAny('reception', 'care') ? `<button class="btn" id="ci">${icon('concierge')}<span class="hide-m">${L('Accueillir', 'Check in')}</span></button>` : ''}
    <button class="btn" id="bk">${icon('calendar')}<span class="hide-m">${L('Rendez-vous', 'Book')}</span></button>
    ${p.account ? `<a class="btn primary" href="#/clinic/cashier?patient=${p.id}">${icon('cash')}<span class="hide-m">${L('Caisse', 'Cashier')}</span></a>` : ''}`);
  const banner = `${p.status === 'deceased' ? `<div class="card banner bad"><b>${L('Patient décédé', 'Deceased')}</b></div>` : ''}
    ${p.allergies ? `<div class="card banner bad">⚠ <b>${L('Allergies', 'Allergies')} : ${esc(p.allergies)}</b></div>` : ''}
    ${p.open_visit ? `<div class="card banner info">${L('En file d\'attente aujourd\'hui', 'In the queue today')} · ${L('ticket', 'ticket')} ${p.open_visit.queue_no} · ${esc(p.open_visit.number)} ${can('prescribe') ? `· <a href="#/clinic/visit/${p.open_visit.id}">${L('Ouvrir la consultation', 'Open consultation')}</a>` : ''}</div>` : ''}
    ${p.admission ? `<div class="card banner warn">${L('Hospitalisé', 'Inpatient')} · ${esc(p.admission.ward || '')} ${L('lit', 'bed')} ${esc(p.admission.bed_label || '')} · <a href="#/clinic/admission/${p.admission.id}">${esc(p.admission.number)}</a></div>` : ''}`;
  const head = `<div class="card cl-head">${avatar(p, 64)}<div class="grow"><h2 style="margin:0">${esc(p.last_name)} ${esc(p.first_name || '')}</h2>
    <div class="muted">${p.sex === 'F' ? L('Femme', 'Female') : L('Homme', 'Male')} · ${ageTxt(p)}${p.birth_date ? ` (${dt(p.birth_date)})` : ''} · <span class="mono">${esc(p.mrn)}</span>${p.blood_group ? ` · <b style="color:var(--bad)">${esc(p.blood_group)}</b>` : ''}</div>
    <div class="muted sm">${esc(p.phone || '')}${p.city ? ` · ${esc(p.city)}` : ''}${p.profession ? ` · ${esc(p.profession)}` : ''}${p.insurer_name ? ` · ${icon('shield')} ${esc(p.insurer_name)} ${p.cover} %${p.insurance_no ? ` · n° ${esc(p.insurance_no)}` : ''}` : ` · ${L('patient payant', 'self-pay')}`}</div>
    ${clin && (p.chronic || p.pregnant) ? `<div class="sc-tags" style="margin-top:6px">${p.pregnant ? `<i class="late">${L('Enceinte', 'Pregnant')}</i>` : ''}${String(p.chronic || '').split(/[,;]/).filter(Boolean).map((x) => `<i>${esc(x.trim())}</i>`).join('')}</div>` : ''}</div>
    ${p.account ? `<div class="r"><div class="muted sm">${L('Reste à payer', 'Balance due')}</div><div class="big num" style="color:${p.account.due ? 'var(--bad)' : 'var(--ok)'}">${money(p.account.due)}</div></div>` : ''}</div>`;
  const tabs = [...(clin ? [['overview', L('Synthèse', 'Summary')], ['timeline', L('Historique médical', 'Medical history')], ['vaccines', L('Vaccins', 'Vaccines')]] : [['admin', L('Dossier', 'File')]]),
    ['appointments', L('Rendez-vous', 'Appointments')], ...(p.account ? [['account', L('Compte', 'Account')]] : []), ...(p.messages ? [['messages', L('Messages', 'Messages')]] : [])];
  const v = p.vitals || [];
  const portal = p.portal_url ? `<h3 style="margin-top:14px">${L('Portail patient', 'Patient portal')}</h3><p class="muted sm">${L('Rendez-vous en ligne, téléconsultation, ordonnances, résultats, factures payables par MoMo, messages.', 'Online booking, video consultations, prescriptions, results, MoMo bills, messages.')}</p>
    <div class="row" style="flex-wrap:wrap;gap:6px"><a class="btn sm" target="_blank" href="${esc(p.portal_url)}">${icon('globe')} ${L('Ouvrir', 'Open')}</a>${p.phone ? `<a class="btn sm primary" target="_blank" href="${wa(p.phone, `Bonjour ${p.first_name}, voici votre espace santé ${state.me.company.name} : rendez-vous, résultats, ordonnances et paiement MoMo. ${p.portal_url}`)}">${L('Envoyer par WhatsApp', 'Send via WhatsApp')}</a>` : ''}
    <a class="btn sm" target="_blank" href="/api/clinic/cards?patient_id=${p.id}">${icon('card')} ${L('Carte de santé', 'Health card')}</a>${clin ? `<a class="btn sm" href="/api/clinic/patients/${p.id}/fhir">${icon('download')} FHIR</a>` : ''}</div>` : '';
  const identity = `<div class="card"><h3>${L('Identité et contacts', 'Identity & contacts')}</h3>${[[L('Dossier', 'File'), `<span class="mono">${esc(p.mrn)}</span>`], [L('Téléphone', 'Phone'), esc(p.phone || '—')], ['E-mail', esc(p.email || '—')], [L('Adresse', 'Address'), esc([p.address, p.city].filter(Boolean).join(', ') || '—')],
    [L('Personne à prévenir', 'Emergency contact'), p.emergency_name ? `${esc(p.emergency_name)} · ${esc(p.emergency_phone || '')}` : '—'], [L('Tiers payant', 'Insurer'), p.insurer_name ? `${esc(p.insurer_name)} · ${p.cover} %${p.insurance_no ? ` · n° ${esc(p.insurance_no)}` : ''}` : L('Aucun', 'None')]]
    .map(([k, x]) => `<div class="lrow row between"><span class="muted">${k}</span><span>${x}</span></div>`).join('')}${portal}</div>`;
  const body = {
    admin: () => `<div class="grid g2">${identity}<div class="card"><h3>${L('Secret médical', 'Medical secrecy')}</h3><p class="muted">${L('Le dossier médical (consultations, résultats, ordonnances) est réservé aux soignants.', 'The medical record is restricted to clinical staff.')}</p>
      ${p.prescriptions ? `<h3>${L('Ordonnances', 'Prescriptions')}</h3>${p.prescriptions.map((r) => `<div class="lrow row between"><span>${dt(r.created_at)} · ${esc(r.lines.map((l) => l.name).join(', '))}</span><span class="pill">${esc(r.status)}</span></div>`).join('') || '—'}` : ''}
      ${p.orders ? `<h3>${L('Examens', 'Tests')}</h3>${p.orders.map((o) => `<div class="lrow row between"><span>${dt(o.ordered_at)} · ${esc(o.test_name)}</span><span class="pill">${esc(o.status)}</span></div>`).join('') || '—'}` : ''}</div></div>`,
    overview: () => `<div class="grid g2"><div>${identity}</div><div class="card"><h3>${L('Constantes', 'Vital signs')}</h3>
      ${v.length ? `<div class="cl-trends">${[['bp_sys', L('TA systolique', 'Systolic BP'), 90, 140], ['weight', L('Poids', 'Weight')], ['glucose', L('Glycémie', 'Glucose'), 0.7, 1.1], ['temp', L('Température', 'Temperature'), 36, 38]].map(([k, l, lo, hi]) => { const vals = v.map((x) => x[k]); const last = [...vals].reverse().find((x) => x != null); return last == null ? '' : `<div><div class="row between"><span class="muted sm">${l}</span><b class="num">${String(last).replace('.', ',')}${k === 'bp_sys' ? `/${[...v].reverse().find((x) => x.bp_dia != null)?.bp_dia ?? ''}` : ''}</b></div>${spark(vals, { lo, hi })}</div>`; }).join('')}</div>` : `<p class="muted">${L('Aucune constante enregistrée.', 'No vitals yet.')}</p>`}
      <h3 style="margin-top:14px">${L('Traitements des 30 derniers jours', 'Treatments, last 30 days')}</h3>${(p.active_rx || []).map((x) => `<div class="lrow"><b>${esc(x.name)}</b> <span class="muted sm">${esc([x.dose, x.frequency, x.duration].filter(Boolean).join(' · '))} · ${dt(x.created_at)}</span></div>`).join('') || `<p class="muted">—</p>`}
      ${p.treatments ? `<p class="muted sm">${L('Traitement de fond déclaré', 'Declared treatment')} : ${esc(p.treatments)}</p>` : ''}
      <h3 style="margin-top:14px">${L('Derniers événements', 'Latest events')}</h3>${(p.timeline || []).slice(0, 6).map(evRow).join('') || `<p class="muted">—</p>`}</div></div>`,
    timeline: () => `<div class="card"><div class="cl-tl">${(p.timeline || []).map(evRow).join('') || `<p class="muted">${L('Aucun événement.', 'Nothing yet.')}</p>`}</div></div>`,
    vaccines: () => `<div class="card"><div class="row between"><h3>${L('Carnet de vaccination', 'Immunisation record')}</h3>${can('care') ? `<button class="btn sm primary" id="vac">${icon('plus')} ${L('Vaccin', 'Vaccine')}</button>` : ''}</div>${table({ rows: p.vaccines, columns: [{ label: 'Date', render: (x) => dt(x.date) }, { label: L('Vaccin', 'Vaccine'), render: (x) => `<b>${esc(x.vaccine)}</b> ${esc(x.dose || '')}` }, { label: L('Lot', 'Lot'), key: 'lot' }, { label: L('Rappel', 'Next dose'), render: (x) => (x.next_due ? `<span class="pill ${x.next_due < today() ? 'bad' : 'info'}">${dt(x.next_due)}</span>` : '—') }] })}</div>`,
    appointments: () => table({ rows: p.appointments, columns: [{ label: 'Date', render: (a) => `${dt(a.date)} ${esc(a.time)}` }, { label: L('Praticien', 'Practitioner'), render: (a) => `${esc(a.title || 'Dr')} ${esc(a.practitioner_name || '')}` }, { label: L('Mode', 'Mode'), render: (a) => (a.mode === 'tele' ? `<span class="pill info">${L('vidéo', 'video')}</span>` : L('cabinet', 'in person')) }, { label: L('Motif', 'Reason'), key: 'reason', hideM: true }, { label: L('Statut', 'Status'), render: (a) => apptPill(a.status) }] }),
    account: () => { const a = p.account; return `<div class="grid g4" style="margin-bottom:14px">${kpi(L('Reste à payer', 'Balance due'), money(a.due), '', a.due ? 'warn' : 'accent')}${kpi(L('À facturer (part patient)', 'To bill (patient)'), money(a.pending_patient))}${kpi(L('Part assureur en attente', 'Insurer share pending'), money(a.pending_insurer))}${kpi(L('Pris en charge cette année', 'Covered this year'), money(a.insurer_year))}</div>
      <div class="grid g2"><div class="card"><h3>${L('Factures', 'Invoices')}</h3>${table({ rows: a.invoices, href: (d) => `#/doc/${d.id}`, columns: [{ label: 'N°', render: (d) => `<span class="mono">${esc(d.number)}</span>` }, { label: 'Date', render: (d) => dt(d.date) }, { label: L('Total', 'Total'), cls: 'r', render: (d) => money(d.total) }, { label: L('Reste', 'Due'), cls: 'r', render: (d) => (d.balance ? `<b>${money(d.balance)}</b>` : `<span class="pill ok">${L('payée', 'paid')}</span>`) }] })}</div>
      <div class="card"><h3>${L('Reçus', 'Receipts')}</h3>${table({ rows: a.receipts, columns: [{ label: 'N°', render: (r) => `<a target="_blank" class="mono" href="/api/clinic/receipts/${r.id}">${esc(r.number)}</a>` }, { label: 'Date', render: (r) => dt(r.created_at) }, { label: L('Mode', 'Method'), render: (r) => esc(methodName(r.method)) }, { label: L('Montant', 'Amount'), cls: 'r', render: (r) => `<b>${money(r.amount)}</b>` }] })}</div></div>`; },
    messages: () => `<div class="card cl-chat">${(p.messages || []).map((m) => `<div class="cl-msg ${m.direction}"><p>${esc(m.body)}</p><small>${m.direction === 'out' ? esc(m.user_name || '') : esc(p.first_name)} · ${dtm(m.created_at)}</small></div>`).join('') || `<p class="muted">${L('Aucun message.', 'No message yet.')}</p>`}
      <form id="msg" class="row" style="gap:8px;margin-top:12px"><input class="in" style="flex:1" name="body" placeholder="${L('Répondre au patient (visible sur son portail)…', 'Reply (shown on the patient portal)…')}" required><button class="btn primary">${L('Envoyer', 'Send')}</button></form></div>`,
  };
  ctx.el.innerHTML = `${banner}${head}<div class="tabs" style="margin:14px 0">${tabs.map(([k, l]) => `<a href="#/clinic/patient/${p.id}?tab=${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div>${(body[tab] || body[tabs[0][0]])()}`;
  document.getElementById('edit')?.addEventListener('click', async () => { if (await patientDialog(p)) ctx.rerender(); });
  document.getElementById('ci')?.addEventListener('click', async () => { if (await checkInDialog(p)) ctx.rerender(); });
  document.getElementById('bk').addEventListener('click', async () => { if (await bookDialog({ patient: p })) ctx.rerender(); });
  document.getElementById('vac')?.addEventListener('click', async () => {
    if (await dialog({ title: L('Vaccination', 'Vaccination'), body: `<div class="form f2">${field({ name: 'vaccine', label: L('Vaccin', 'Vaccine'), required: true, list: 'vaclist' })}<datalist id="vaclist">${S().vaccines.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>${field({ name: 'dose', label: L('Dose', 'Dose'), placeholder: 'D1, D2, rappel…' })}${field({ name: 'date', label: 'Date', type: 'date', value: today() })}${field({ name: 'lot', label: L('N° de lot', 'Lot no.') })}${field({ name: 'next_due', label: L('Prochain rappel', 'Next dose'), type: 'date' })}</div>`,
      onSubmit: (x) => api.post(`/api/clinic/patients/${p.id}/vaccines`, x) })) ctx.rerender();
  });
  document.getElementById('msg')?.addEventListener('submit', async (e) => { e.preventDefault(); try { await api.post(`/api/clinic/patients/${p.id}/messages`, { body: e.target.body.value }); ctx.rerender(); } catch (er) { fail(er); } });
});

function evRow(e) {
  const EV = { visit: ['clipboard', 'Consultation', 'Consultation'], lab: ['scan', 'Analyse', 'Lab test'], imaging: ['monitor', 'Imagerie', 'Imaging'], rx: ['edit', 'Ordonnance', 'Prescription'], admission: ['bed', 'Hospitalisation', 'Admission'], vaccine: ['shield', 'Vaccin', 'Vaccine'], certificate: ['invoice', 'Certificat', 'Certificate'] };
  const x = EV[e.type] || ['list', e.type, e.type];
  const link = e.type === 'visit' && can('prescribe') ? `#/clinic/visit/${e.id}` : e.type === 'admission' ? `#/clinic/admission/${e.id}` : e.type === 'rx' ? `/api/clinic/prescriptions/${e.id}/print` : (e.type === 'lab' || e.type === 'imaging') && e.status === 'validated' ? `/api/clinic/orders/${e.id}/print` : e.type === 'certificate' ? `/api/clinic/certificates/${e.id}/print` : '';
  const ext = link.startsWith('/api');
  return `<div class="cl-ev t-${e.type}">${icon(x[0])}<div class="grow"><div class="row between"><b>${esc(L(x[1], x[2]))}${e.type === 'visit' ? ` · ${esc(kindName(e.kind))}` : ''}</b><span class="muted sm">${dtm(e.at)}</span></div>
    <div>${link ? `<a href="${link}" ${ext ? 'target="_blank"' : ''}>${esc(e.title || '')}</a>` : esc(e.title || '')} ${e.critical ? `<span class="pill bad">${L('critique', 'critical')}</span>` : e.abnormal ? `<span class="pill warn">${L('anormal', 'abnormal')}</span>` : ''}${e.status && !['done', 'validated'].includes(e.status) ? ` <span class="pill">${esc(e.status)}</span>` : ''}</div>
    ${e.icd?.length ? `<div class="sc-tags">${e.icd.map((c) => `<i>${esc(c)} · ${esc(icdName(c))}</i>`).join('')}</div>` : ''}
    ${e.results?.length ? `<div class="muted sm">${e.results.filter((r) => r.value !== '').slice(0, 5).map((r) => `${esc(r.label)} <b class="${r.flag ? 'bad-t' : ''}">${esc(String(r.value).replace('.', ','))}</b> ${esc(r.unit || '')}`).join(' · ')}</div>` : ''}
    ${e.conclusion ? `<div class="muted sm">${esc(e.conclusion.slice(0, 200))}</div>` : ''}
    <div class="muted sm">${esc(e.sub || '')}${e.news != null ? ` ${newsPill(e.news)}` : ''}${e.next_due ? ` · ${L('rappel', 'next')} ${dt(e.next_due)}` : ''}</div></div></div>`;
}
