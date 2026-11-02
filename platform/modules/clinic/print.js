// Printable pages (A4 / A5, "save as PDF" from the browser) for Teknons Santé:
// secure prescription with QR verification, lab and imaging report, medical
// certificate and sick note, payment receipt, patient health card, discharge
// summary and insurer claim (bordereau). Each QR code points to /v/… so a
// pharmacy, an employer or an insurer can check the document is genuine.
import { fcfa, amountInWords } from '../../core/format.js';
import { ageLabel } from './schema.js';

const NAVY = '#1E1A4D', ACC = '#6D3BEB', MINT = '#0FA594';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dfr = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const tfr = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' }) : '');
const QR = `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>document.querySelectorAll('.q').forEach(function(e){try{new QRCode(e,{text:e.dataset.url,width:+e.dataset.size||84,height:+e.dataset.size||84,colorDark:'${NAVY}',correctLevel:QRCode.CorrectLevel.M})}catch(x){e.textContent=e.dataset.url}})</script>`;
const METHOD = { cash: 'Espèces', bank: 'Virement', cheque: 'Chèque', mtn_momo: 'MTN MoMo', orange_money: 'Orange Money' };
const OUTCOME = { healed: 'Guérison', improved: 'Amélioration', transferred: 'Transfert', against_advice: 'Sortie contre avis médical', deceased: 'Décès' };

const CSS = `*{box-sizing:border-box}body{margin:0;background:#ECEBF3;font:11.5px/1.45 "Hanken Grotesk",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#15122E}
.bar{position:sticky;top:0;background:${NAVY};color:#fff;padding:10px;display:flex;gap:12px;justify-content:center;z-index:3}.bar button{background:${ACC};color:#fff;border:0;border-radius:10px;padding:9px 18px;font:600 14px system-ui;cursor:pointer}
.page{width:210mm;min-height:297mm;margin:14px auto;background:#fff;padding:12mm 13mm;position:relative;box-shadow:0 4px 24px rgba(0,0,0,.1);page-break-after:always;overflow:hidden}.page.a5{width:148mm;min-height:210mm;padding:9mm 10mm}
.page:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;border-bottom:2px solid ${NAVY};padding-bottom:8px}
.hd .org{display:flex;gap:10px;align-items:center}.hd img{max-height:52px;max-width:110px}.hd h1{margin:0;font:800 16px/1.15 system-ui;color:${NAVY}}.hd small{display:block;color:#615C80;font-size:10px}
.hd .cr{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,${ACC},${MINT});display:grid;place-items:center;color:#fff;font:800 22px system-ui;flex:none}
.hd .r{text-align:right;font-size:10px;color:#615C80}
.doc{margin:12px 0 8px;display:flex;justify-content:space-between;align-items:flex-end}.doc h2{margin:0;font:800 18px system-ui;letter-spacing:.04em;color:${NAVY};text-transform:uppercase}.doc span{color:#615C80}
.pt{display:grid;grid-template-columns:1fr auto;gap:8px;border:1px solid #DCD9EA;border-radius:12px;padding:8px 11px;background:#FAF9FE}.pt b{font-size:13px}.pt small{color:#615C80}
.alg{margin-top:6px;background:#FDECEC;color:#B42318;border-radius:8px;padding:4px 8px;font-weight:700;font-size:10.5px}
table{width:100%;border-collapse:collapse}.t{margin-top:10px}.t th{background:${NAVY};color:#fff;font-weight:600;font-size:9.5px;padding:5px 6px;text-align:left}.t td{border-bottom:1px solid #E7E5F0;padding:6px;vertical-align:top}.t td.r,.t th.r{text-align:right}.t tr.tot td{font-weight:800;border-top:2px solid ${NAVY}}
.rx{margin-top:12px;counter-reset:rx}.rx li{list-style:none;padding:8px 0 8px 30px;border-bottom:1px dashed #DCD9EA;position:relative}.rx li:before{counter-increment:rx;content:counter(rx);position:absolute;left:0;top:8px;width:20px;height:20px;border-radius:50%;background:${ACC};color:#fff;display:grid;place-items:center;font-weight:800;font-size:10px}
.rx b{font-size:13px}.rx em{color:#615C80;font-style:normal;display:block}
.flag{font-weight:800}.flag.H,.flag.L{color:#B54708}.flag.HH,.flag.LL,.flag.A{color:#B42318}.crit{background:#FDECEC}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}.sig div{border-top:1px dashed #B9B5CF;padding-top:4px;min-height:60px;font-size:10px;color:#615C80}
.ver{display:flex;gap:10px;align-items:center;margin-top:14px;font-size:9.5px;color:#615C80;border-top:1px solid #E7E5F0;padding-top:8px}.ver .q{width:84px;height:84px;flex:none}.ver b{color:${NAVY};font-family:"IBM Plex Mono",monospace}
.box{border:1px solid #DCD9EA;border-radius:10px;padding:8px 10px;margin-top:8px}.box h4{margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#615C80}.box p{margin:0;white-space:pre-wrap}
.big{font:800 22px system-ui;color:${NAVY}}.kv{display:flex;justify-content:space-between;gap:6px;padding:2px 0}.kv span{color:#615C80}
.cert{font-size:13.5px;line-height:1.8;margin-top:16px}.cert p{margin:0 0 10px}
.cards{display:grid;grid-template-columns:repeat(2,85.6mm);gap:6mm;justify-content:center}.card{width:85.6mm;height:54mm;border-radius:12px;overflow:hidden;position:relative;background:radial-gradient(120% 140% at 100% 0,${ACC} 0,${NAVY} 60%);color:#fff;padding:10px 12px;break-inside:avoid}
.card .t{font:800 10px system-ui;letter-spacing:.1em;text-transform:uppercase;opacity:.85}.card .o{font:800 12.5px system-ui}.card .bd{display:grid;grid-template-columns:1fr 22mm;gap:8px;margin-top:8px;align-items:center}
.card b{font-size:14px;display:block;line-height:1.15}.card small{display:block;font-size:9px;opacity:.85}.card .q{background:#fff;padding:3px;border-radius:7px;width:22mm;height:22mm}.card .q img,.card .q canvas{width:100%!important;height:100%!important}
.card .bl{display:inline-block;background:#fff;color:#B42318;border-radius:6px;padding:1px 6px;font-weight:800;font-size:10px;margin-top:4px}.card .ft{position:absolute;bottom:7px;left:12px;right:12px;font-size:8.5px;opacity:.8;display:flex;justify-content:space-between}
@media print{body{background:#fff}.bar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}@page{size:A4;margin:10mm}}
@media (max-width:820px){.page,.page.a5{width:auto;margin:0;padding:14px}.sig{grid-template-columns:1fr}}`;

function page(title, body, autoPrint, { a5 = false } = {}) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}${a5 ? '@media print{@page{size:A5;margin:8mm}}' : ''}</style></head><body>
<div class="bar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>${body}${QR}
${autoPrint ? '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),600))</script>' : ''}</body></html>`;
}

const header = (c, s, right = '') => `<div class="hd"><div class="org">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : '<div class="cr">+</div>'}<div><h1>${esc(c.name)}</h1>
  <small>${esc([c.address, c.city].filter(Boolean).join(', '))}${c.phone ? ` · Tél. ${esc(c.phone)}` : ''}</small>${s?.approval_no ? `<small>Autorisation MINSANTE n° ${esc(s.approval_no)}</small>` : ''}${s?.emergency_phone ? `<small>Urgences 24 h/24 : ${esc(s.emergency_phone)}</small>` : ''}</div></div><div class="r">${right}</div></div>`;
const patientBox = (p, extra = '') => `<div class="pt"><div><b>${esc(p.last_name)} ${esc(p.first_name || '')}</b> <small>· ${p.sex === 'F' ? 'F' : 'M'}${p.birth_date ? ` · né(e) le ${dfr(p.birth_date)} (${esc(ageLabel(p.birth_date))})` : ''}</small><br><small>Dossier ${esc(p.mrn || '')}${p.insurer_name ? ` · ${esc(p.insurer_name)}${p.insurance_no ? ` n° ${esc(p.insurance_no)}` : ''}` : ''}</small>${extra}</div></div>`;
const verify = (url, code, label) => `<div class="ver"><div class="q" data-url="${esc(url)}"></div><div>${esc(label)}<br>Code : <b>${esc(code)}</b><br>${esc(url)}</div></div>`;
const doctorLine = (x) => (x?.practitioner_name ? `${esc(x.title || 'Dr')} ${esc(x.practitioner_name)}${x.specialty ? ` · ${esc(x.specialty)}` : ''}${x.order_no ? ` · Ordre n° ${esc(x.order_no)}` : ''}` : '');

export function renderPrescription(c, s, rx, base, { autoPrint } = {}) {
  const body = `<div class="page a5">${header(c, s, `${dfr(rx.created_at)}<br>${doctorLine(rx)}`)}
  <div class="doc"><h2>Ordonnance</h2><span>N° ${esc(rx.code)}</span></div>
  ${patientBox(rx, rx.allergies ? `<div class="alg">Allergies : ${esc(rx.allergies)}</div>` : '')}
  <ul class="rx">${rx.lines.map((l) => `<li><b>${esc(l.name)}</b>${l.qty ? ` <span style="color:#615C80">× ${esc(l.qty)}</span>` : ''}<em>${esc([l.dose, l.frequency, l.duration && `pendant ${l.duration}`, l.route].filter(Boolean).join(' · '))}</em>${l.instructions ? `<em>${esc(l.instructions)}</em>` : ''}</li>`).join('')}</ul>
  ${rx.notes ? `<div class="box"><h4>Conseils</h4><p>${esc(rx.notes)}</p></div>` : ''}
  <div class="sig"><div>Fait à ${esc(c.city || '')}, le ${dfr(rx.created_at)}</div><div>Signature et cachet du médecin<br>${doctorLine(rx)}</div></div>
  ${verify(`${base}/v/rx/${rx.code}`, rx.code, 'Ordonnance sécurisée. Le pharmacien vérifie son authenticité en scannant ce code.')}</div>`;
  return page(`Ordonnance ${rx.code}`, body, autoPrint, { a5: true });
}

export function renderLabReport(c, s, o, base, { autoPrint } = {}) {
  const rows = o.results.filter((r) => r.value !== '' && r.value != null);
  const body = `<div class="page">${header(c, s, `${o.kind === 'lab' ? 'Laboratoire d\'analyses' : 'Imagerie médicale'}<br>N° ${esc(o.number)}`)}
  <div class="doc"><h2>${o.kind === 'lab' ? 'Résultats d\'analyses' : 'Compte rendu d\'imagerie'}</h2><span>${esc(o.test_name)}</span></div>
  ${patientBox(o)}
  <table class="t" style="margin-top:8px"><tr><td>Prescripteur : <b>${o.practitioner_name ? `${esc(o.title || 'Dr')} ${esc(o.practitioner_name)}` : '—'}</b></td><td>Demandé le ${dfr(o.ordered_at)} ${tfr(o.ordered_at)}</td><td>Prélevé le ${dfr(o.sampled_at)} ${tfr(o.sampled_at)}</td><td>Validé le ${dfr(o.validated_at)} ${tfr(o.validated_at)}</td></tr></table>
  ${o.clinical_info ? `<div class="box"><h4>Renseignements cliniques</h4><p>${esc(o.clinical_info)}</p></div>` : ''}
  ${rows.length ? `<table class="t"><tr><th>Paramètre</th><th class="r">Résultat</th><th>Unité</th><th>Valeurs de référence</th><th></th></tr>
    ${rows.map((r) => `<tr class="${['LL', 'HH'].includes(r.flag) ? 'crit' : ''}"><td>${esc(r.label)}</td><td class="r"><b class="flag ${esc(r.flag)}">${esc(String(r.value).replace('.', ','))}</b></td><td>${esc(r.unit || '')}</td>
      <td>${r.lo != null && r.hi != null ? `${String(r.lo).replace('.', ',')} – ${String(r.hi).replace('.', ',')}` : r.choices ? esc((r.choices.filter((x) => !(r.abnormal || []).includes(x))[0]) || '') : ''}</td>
      <td class="flag ${esc(r.flag)}">${{ H: '↑', L: '↓', HH: '↑↑ critique', LL: '↓↓ critique', A: 'anormal' }[r.flag] || ''}</td></tr>`).join('')}</table>` : ''}
  ${o.conclusion ? `<div class="box"><h4>${o.kind === 'lab' ? 'Commentaire' : 'Compte rendu et conclusion'}</h4><p>${esc(o.conclusion)}</p></div>` : ''}
  <div class="sig"><div>Validé par ${esc(o.validated_name || '')}</div><div>Signature du biologiste / radiologue</div></div>
  ${verify(`${base}/v/lab/${o.code}`, o.code, 'Résultat vérifiable : scannez pour confirmer qu\'il a bien été émis par le laboratoire.')}</div>`;
  return page(`${o.test_name} – ${o.number}`, body, autoPrint);
}

const CERT = { rest: 'Arrêt de travail', fitness: "Certificat d'aptitude", medical: 'Certificat médical' };
export function renderCertificate(c, s, x, base, { autoPrint } = {}) {
  const to = x.rest_days ? new Date(Date.parse(x.from_date) + (x.rest_days - 1) * 864e5).toISOString().slice(0, 10) : '';
  const txt = x.kind === 'rest'
    ? `<p>Je soussigné(e), ${doctorLine(x) || 'médecin'}, certifie avoir examiné ce jour <b>${esc(x.last_name)} ${esc(x.first_name)}</b>${x.birth_date ? `, né(e) le ${dfr(x.birth_date)}` : ''},</p><p>et déclare que son état de santé nécessite un <b>arrêt de travail de ${x.rest_days} jour${x.rest_days > 1 ? 's' : ''}</b>, du <b>${dfr(x.from_date)}</b> au <b>${dfr(to)}</b> inclus, sauf complication.</p>`
    : x.kind === 'fitness'
      ? `<p>Je soussigné(e), ${doctorLine(x) || 'médecin'}, certifie avoir examiné ce jour <b>${esc(x.last_name)} ${esc(x.first_name)}</b>${x.birth_date ? `, né(e) le ${dfr(x.birth_date)}` : ''},</p><p>et n'avoir constaté à l'examen clinique aucune contre-indication${x.body ? ` ${esc(x.body)}` : ' à l\'activité déclarée'}.</p>`
      : `<p>Je soussigné(e), ${doctorLine(x) || 'médecin'}, certifie avoir examiné ce jour <b>${esc(x.last_name)} ${esc(x.first_name)}</b>${x.birth_date ? `, né(e) le ${dfr(x.birth_date)}` : ''}.</p>`;
  const body = `<div class="page">${header(c, s, dfr(x.created_at))}<div class="doc"><h2>${CERT[x.kind]}</h2><span>N° ${esc(x.code)}</span></div>
  <div class="cert">${txt}${x.body && x.kind !== 'fitness' ? `<p>${esc(x.body)}</p>` : ''}<p>Certificat établi à la demande de l'intéressé(e) et remis en main propre pour servir et valoir ce que de droit.</p></div>
  <div class="sig"><div>Fait à ${esc(c.city || '')}, le ${dfr(x.created_at)}</div><div>Signature et cachet<br>${doctorLine(x)}</div></div>
  ${verify(`${base}/v/cert/${x.code}`, x.code, "Document vérifiable par l'employeur ou l'assureur, sans révéler de donnée médicale.")}</div>`;
  return page(`${CERT[x.kind]} ${x.code}`, body, autoPrint);
}

export function renderReceipt(c, s, rc, p, acc, { autoPrint } = {}) {
  const al = JSON.parse(rc.allocations || '[]');
  const body = `<div class="page a5">${header(c, s, `Reçu ${esc(rc.number)}<br>${dfr(rc.created_at)} ${tfr(rc.created_at)}`)}
  <div class="doc"><h2>Reçu de paiement</h2><span>${esc(METHOD[rc.method] || rc.method)}${rc.reference ? ` · réf. ${esc(rc.reference)}` : ''}</span></div>${patientBox(p)}
  <table class="t"><tr><th>Facture</th><th class="r">Montant réglé</th></tr>${al.map((a) => `<tr><td>${esc(a.number)}</td><td class="r">${fcfa(a.amount)}</td></tr>`).join('')}
  <tr class="tot"><td>Total reçu</td><td class="r">${fcfa(rc.amount)}</td></tr></table>
  <p style="margin-top:8px"><i>Arrêté le présent reçu à la somme de ${esc(amountInWords(rc.amount))}.</i></p>
  <div class="kv" style="margin-top:6px"><span>Reste à payer après ce règlement</span><b>${fcfa(acc?.due || 0)}</b></div>
  ${rc.payer ? `<div class="kv"><span>Versé par</span><b>${esc(rc.payer)}</b></div>` : ''}
  <div class="sig"><div>Le caissier</div><div>Le patient</div></div></div>`;
  return page(`Reçu ${rc.number}`, body, autoPrint, { a5: true });
}

export function renderCards(c, s, list, base, { autoPrint } = {}) {
  const body = `<div class="page"><div class="cards">${list.map((p) => `<div class="card"><div class="t">Carte de santé</div><div class="o">${esc(c.name)}</div>
    <div class="bd"><div><b>${esc(p.last_name)}</b><b>${esc(p.first_name || '')}</b><small>Dossier ${esc(p.mrn)} · ${p.sex === 'F' ? 'F' : 'M'}${p.birth_date ? ` · ${dfr(p.birth_date)}` : ''}</small>
    ${p.insurer_name ? `<small>${esc(p.insurer_name)}${p.insurance_no ? ` · ${esc(p.insurance_no)}` : ''}</small>` : ''}${p.blood_group ? `<span class="bl">Groupe ${esc(p.blood_group)}</span>` : ''}${p.allergies ? `<small style="margin-top:3px">⚠ Allergies : ${esc(p.allergies.slice(0, 50))}</small>` : ''}</div>
    <div class="q" data-url="${esc(`${base}/c/${p.card_code}`)}" data-size="80"></div></div>
    <div class="ft"><span>${esc(c.phone || '')}</span><span>${s?.emergency_phone ? 'Urgences ' + esc(s.emergency_phone) : ''}</span></div></div>`).join('')}</div></div>`;
  return page('Cartes de santé', body, autoPrint);
}

export function renderDischarge(c, s, a, base, { autoPrint } = {}) {
  const body = `<div class="page">${header(c, s, `Hospitalisation ${esc(a.number)}`)}
  <div class="doc"><h2>Compte rendu d'hospitalisation</h2><span>${esc(a.ward || '')} · lit ${esc(a.bed_label || '')}</span></div>${patientBox({ ...a.patient })}
  <table class="t"><tr><td>Entrée : <b>${dfr(a.admitted_at)} ${tfr(a.admitted_at)}</b></td><td>Sortie : <b>${dfr(a.discharged_at)} ${tfr(a.discharged_at)}</b></td><td>Durée : <b>${a.nights} nuit${a.nights > 1 ? 's' : ''}</b></td><td>Issue : <b>${esc(OUTCOME[a.outcome] || a.outcome || '')}</b></td></tr></table>
  <div class="box"><h4>Motif d'hospitalisation</h4><p>${esc(a.reason || '—')}</p></div>
  <div class="box"><h4>Diagnostic</h4><p>${esc(a.diagnosis || '—')}${a.icd?.length ? `\nCIM-10 : ${a.icd.map((x) => `${x.code} ${x.fr}`).join(' ; ')}` : ''}</p></div>
  ${a.orders?.filter((o) => o.status === 'validated').length ? `<div class="box"><h4>Examens réalisés</h4><p>${a.orders.filter((o) => o.status === 'validated').map((o) => `${o.test_name}${o.abnormal ? ' (anormal)' : ''}${o.conclusion ? ' : ' + o.conclusion : ''}`).map(esc).join('\n')}</p></div>` : ''}
  <div class="box"><h4>Évolution et traitement de sortie</h4><p>${esc(a.summary || '')}</p></div>
  <div class="sig"><div>Fait le ${dfr(a.discharged_at)}</div><div>${a.practitioner_name ? `${esc(a.title || 'Dr')} ${esc(a.practitioner_name)}` : 'Le médecin'}</div></div></div>`;
  return page(`Compte rendu ${a.number}`, body, autoPrint);
}

export function renderClaim(c, s, cl, { autoPrint } = {}) {
  const byP = new Map();
  for (const l of cl.lines) { const k = l.patient_id; if (!byP.has(k)) byP.set(k, { p: l, rows: [] }); byP.get(k).rows.push(l); }
  const body = `<div class="page">${header(c, s, `Bordereau ${esc(cl.number)}<br>${dfr(cl.created_at)}`)}
  <div class="doc"><h2>Bordereau de tiers payant</h2><span>${esc(cl.insurer_name)}${cl.contract_no ? ` · contrat ${esc(cl.contract_no)}` : ''}</span></div>
  <p>Prestations du <b>${dfr(cl.period_from)}</b> au <b>${dfr(cl.period_to)}</b> · ${byP.size} assuré(s) · ${cl.count} prestation(s).</p>
  <table class="t"><tr><th>Date</th><th>Assuré</th><th>Prestation</th><th class="r">Montant</th><th class="r">Part assureur</th></tr>
  ${[...byP.values()].map(({ p, rows }) => rows.map((l, i) => `<tr><td>${dfr(l.date)}</td><td>${i ? '' : `<b>${esc(p.last_name)} ${esc(p.first_name)}</b><br><small>${esc(p.mrn)}${p.insurance_no ? ` · n° ${esc(p.insurance_no)}` : ''}</small>`}</td><td>${esc(l.description)}</td><td class="r">${fcfa(l.amount)}</td><td class="r">${fcfa(l.insurer_amount)}</td></tr>`).join('')
    + `<tr><td></td><td></td><td style="color:#615C80">Sous-total ${esc(p.last_name)}</td><td></td><td class="r"><b>${fcfa(rows.reduce((x, r) => x + r.insurer_amount, 0))}</b></td></tr>`).join('')}
  <tr class="tot"><td colspan="4">Total à régler par ${esc(cl.insurer_name)}</td><td class="r">${fcfa(cl.total)}</td></tr></table>
  <p style="margin-top:8px"><i>Arrêté le présent bordereau à la somme de ${esc(amountInWords(cl.total))}.</i></p>
  <div class="sig"><div>Le directeur</div><div>Visa de l'assureur</div></div></div>`;
  return page(`Bordereau ${cl.number}`, body, autoPrint);
}
