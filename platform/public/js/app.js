// App shell: sign-in, navigation, routing, live updates and offline status.
import { api, net, flush, clearCache, clearFailed } from './api.js';
import { state, L, esc, icon, can, canAny, toast, showError } from './ui.js';
import * as core from './core-pages.js';
import * as acc from './accounting.js';

const root = document.getElementById('root');

const routes = [
  ['/', acc.dashboard, true],
  ['/documents/:kind', acc.documentList, true],
  ['/doc/new/:kind', acc.documentEditor],
  ['/doc/:id/edit', acc.documentEditor],
  ['/doc/:id', acc.documentView, true],
  ['/partners/:kind', core.partnerList],
  ['/partner/:id', acc.partnerDetail, true],
  ['/products', core.productList],
  ['/payments', acc.paymentList, true],
  ['/expenses', acc.expenseList, true],
  ['/treasury', acc.treasury, true],
  ['/entries', acc.entryList, true],
  ['/entry/new', acc.entryEditor],
  ['/accounts', acc.accountList],
  ['/reports', acc.reportsHub],
  ['/report/:name', acc.reportView],
  ['/alerts', core.alertList, true],
  ['/settings', core.settings],
  ['/users', core.userList],
  ['/audit', core.auditList],
  ['/sync', core.syncPage],
  ['/me', core.profile],
];

function nav() {
  const item = (href, ic, fr, en, show = true) => (show ? `<a href="#${href}" data-nav="${href}">${icon(ic)}<span>${esc(L(fr, en))}</span></a>` : '');
  const sales = canAny('sales', 'accounting', 'read');
  const buy = canAny('purchases', 'accounting', 'read');
  return `
  <div class="brand"><img src="/icon.svg" alt=""><div>TEKNONS<small>${esc(state.me.company.name)}</small></div></div>
  ${item('/', 'home', 'Tableau de bord', 'Dashboard')}
  <h6>${L('Ventes', 'Sales')}</h6>
  ${item('/documents/quote', 'quote', 'Devis', 'Quotes', sales)}
  ${item('/documents/invoice', 'invoice', 'Factures', 'Invoices', sales)}
  ${item('/documents/credit_note', 'credit', 'Avoirs', 'Credit notes', sales)}
  ${item('/partners/client', 'users', 'Clients', 'Customers', sales)}
  ${item('/products', 'box', 'Articles et services', 'Products & services')}
  <h6>${L('Achats', 'Purchases')}</h6>
  ${item('/documents/bill', 'bill', 'Factures fournisseurs', 'Supplier bills', buy)}
  ${item('/expenses', 'receipt', 'Dépenses', 'Expenses')}
  ${item('/partners/supplier', 'truck', 'Fournisseurs', 'Suppliers', buy)}
  <h6>${L('Trésorerie', 'Cash')}</h6>
  ${item('/payments', 'cash', 'Paiements', 'Payments')}
  ${item('/treasury', 'wallet', 'Caisse, banque, Mobile Money', 'Cash, bank, Mobile Money')}
  <h6>${L('Comptabilité', 'Accounting')}</h6>
  ${item('/reports', 'chart', 'États financiers', 'Financial reports', canAny('reports', 'accounting'))}
  ${item('/entries', 'book', 'Journaux et écritures', 'Journals & entries', canAny('reports', 'accounting'))}
  ${item('/accounts', 'list', 'Plan comptable', 'Chart of accounts')}
  <h6>${L('Administration', 'Admin')}</h6>
  ${item('/alerts', 'bell', 'Alertes', 'Alerts')}
  ${item('/settings', 'gear', 'Entreprise', 'Company', can('settings'))}
  ${item('/users', 'users', 'Utilisateurs et rôles', 'Users & roles', can('users'))}
  ${item('/audit', 'shield', "Journal d'activité", 'Activity log', can('settings'))}
  <div class="grow"></div>
  ${item('/me', 'gear', state.me.user.name, state.me.user.name)}
  <a href="#" data-act="lang">${icon('globe')}<span>${state.lang === 'fr' ? 'English' : 'Français'}</span></a>
  <a href="#" data-act="logout">${icon('logout')}<span>${L('Se déconnecter', 'Sign out')}</span></a>`;
}

function shell() {
  root.innerHTML = `<div class="app">
    <aside class="side" id="side">${nav()}</aside>
    <div class="main">
      <div class="top"><button class="iconbtn menu-btn" data-act="menu" aria-label="Menu">${icon('menu')}</button><h1 id="title"></h1>
        <div class="row" id="actions"></div>
        <a class="iconbtn" href="#/alerts" aria-label="${L('Alertes', 'Alerts')}">${icon('bell')}<span class="badge" id="badge" hidden></span></a></div>
      <div class="netbar" id="netbar" hidden></div>
      <main class="content" id="view"></main>
    </div>
    <nav class="bottom-nav">
      <a href="#/" data-nav="/">${icon('home')}${L('Accueil', 'Home')}</a>
      <a href="#/documents/invoice" data-nav="/documents/invoice">${icon('invoice')}${L('Factures', 'Invoices')}</a>
      <a href="#/payments" data-nav="/payments">${icon('cash')}${L('Paiements', 'Payments')}</a>
      <a href="#/expenses" data-nav="/expenses">${icon('receipt')}${L('Dépenses', 'Expenses')}</a>
      <a href="#" data-act="menu">${icon('more')}${L('Plus', 'More')}</a>
    </nav></div>`;
  root.addEventListener('click', onClick);
  updateNet();
}

function onClick(e) {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'menu') { e.preventDefault(); document.getElementById('side').classList.toggle('open'); return; }
  if (act === 'lang') { e.preventDefault(); setLang(state.lang === 'fr' ? 'en' : 'fr'); return; }
  if (act === 'logout') { e.preventDefault(); logout(); return; }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a,button,input,select')) { location.hash = row.dataset.href; }
  if (e.target.closest('.side a')) document.getElementById('side').classList.remove('open');
}

async function setLang(lang) {
  state.lang = lang;
  try { localStorage.setItem('tk:lang', lang); } catch {}
  document.documentElement.lang = lang;
  api.put('/api/me', { lang }).catch(() => {});
  document.getElementById('side').innerHTML = nav();
  shell(); render();
}

async function logout() {
  await api.post('/api/auth/logout').catch(() => {});
  clearCache();
  state.me = null;
  location.hash = '#/';
  boot();
}

function updateNet() {
  const bar = document.getElementById('netbar');
  if (!bar) return;
  const n = net.outbox().length, f = net.failed().length;
  const parts = [];
  if (!net.online) parts.push(`<b>${L('Hors ligne.', 'Offline.')}</b> ${L('Vous pouvez continuer à travailler : les saisies seront envoyées au retour du réseau.', 'Keep working: entries will be sent when the network is back.')}`);
  if (n) parts.push(`${n} ${L('saisie(s) en attente de synchronisation', 'entry(ies) waiting to sync')} · <a href="#/sync">${L('voir', 'view')}</a>`);
  if (f) parts.push(`${f} ${L('saisie(s) refusée(s) par le serveur', 'entry(ies) rejected by the server')} · <a href="#/sync">${L('voir', 'view')}</a>`);
  bar.innerHTML = parts.join(' &nbsp;·&nbsp; ');
  bar.hidden = !parts.length;
}
net.on(updateNet);
window.addEventListener('tk:synced', () => { toast(L('Synchronisation terminée', 'Sync complete'), 'ok'); render(); });

// ---- Router ----
let current = null;
function match(path) {
  for (const [pattern, fn, live] of routes) {
    const keys = [];
    const rx = new RegExp('^' + pattern.replace(/:([a-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    const m = rx.exec(path);
    if (m) return { fn, live, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export async function render() {
  if (!state.me) return;
  const [path, search] = (location.hash.slice(1) || '/').split('?');
  const query = Object.fromEntries(new URLSearchParams(search || ''));
  const r = match(path) || match('/');
  current = { ...r, path, query };
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === path || (a.dataset.nav !== '/' && path.startsWith(a.dataset.nav))));
  const view = document.getElementById('view');
  const ctx = {
    el: view, params: r.params, query, path,
    title: (t) => { document.getElementById('title').textContent = t; document.title = `${t} · Teknons`; },
    actions: (html) => { document.getElementById('actions').innerHTML = html || ''; },
    rerender: () => render(),
  };
  ctx.actions('');
  try { await r.fn(ctx); }
  catch (e) {
    if (e.status === 401) return boot();
    view.innerHTML = `<div class="card empty"><b>${esc(e.message)}</b></div>`;
  }
  window.scrollTo?.(0, 0);
}

// ---- Live updates (Server-Sent Events) ----
let es = null, liveTimer = null;
function connectLive() {
  es?.close();
  if (!window.EventSource) return;
  es = new EventSource('/api/events');
  const refresh = () => {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { if (current?.live && !document.querySelector('dialog[open]')) render(); refreshBadge(); }, 400);
  };
  es.addEventListener('change', refresh);
  es.addEventListener('alert', (e) => { try { const a = JSON.parse(e.data); toast(a.title, a.level === 'success' ? 'ok' : a.level === 'danger' ? 'err' : ''); } catch {} refresh(); });
  es.onerror = () => {};
}
export async function refreshBadge() {
  try {
    const a = await api.get('/api/alerts');
    const b = document.getElementById('badge');
    if (b) { b.textContent = a.unread > 99 ? '99+' : a.unread; b.hidden = !a.unread; }
  } catch {}
}

// ---- Boot ----
async function boot() {
  try { state.lang = localStorage.getItem('tk:lang') || 'fr'; } catch {}
  document.documentElement.lang = state.lang;
  let me = null;
  try { me = await api.get('/api/me'); }
  catch (e) {
    if (e.status === 401 || e.status === 0) {
      if (e.status === 0) { root.innerHTML = `<div class="auth"><div class="card"><h2>${L('Pas de connexion', 'No connection')}</h2><p class="muted">${L('Connectez-vous une première fois avec internet pour utiliser l\'application hors ligne.', 'Sign in once with internet to use the app offline.')}</p></div></div>`; return; }
      return core.authPage(root, (m) => { state.me = m; start(); });
    }
    root.innerHTML = `<div class="auth"><div class="card"><p>${esc(e.message)}</p></div></div>`;
    return;
  }
  state.me = me;
  start();
}

async function start() {
  if (state.me.user.lang && !localStorage.getItem('tk:lang')) state.lang = state.me.user.lang;
  try { state.meta = await api.get('/api/accounting/meta'); } catch (e) { showError(e); }
  shell();
  await render();
  refreshBadge();
  connectLive();
  flush();
}

window.addEventListener('hashchange', render);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
boot();
