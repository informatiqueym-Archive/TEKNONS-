// Server-only helpers: content loading, addresses and SEO data.
import fs from 'node:fs';
import path from 'node:path';
import { buildState, withLang, R, tt, t, L, LL, esc, money, CATS, catName, UI } from './core.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
const FILE = path.join(DATA_DIR, 'content.json');
let cache = {mtime: -2, data: null, state: null};

// Reads content.json (written by the admin API) and rebuilds the state only when the file changed.
export function content(){
  let mtime = -1;
  try { mtime = fs.statSync(FILE).mtimeMs; } catch (e) {}
  if (mtime !== cache.mtime){
    let j = {};
    try { j = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
    const data = {projects: j.projects || [], solutions: j.solutions || [], settings: j.settings || {}};
    cache = {mtime, data, state: buildState(data)};
  }
  return cache;
}

export const LANGS = ['en', 'fr'];
export const isLang = l => LANGS.includes(l);

// Public origin used in canonical links, sitemap and social cards. Set SITE_URL in production.
export function origin(Astro){
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const h = Astro.request.headers, proto = (h.get('x-forwarded-proto') || Astro.url.protocol.replace(':', '')).split(',')[0];
  return `${proto}://${h.get('x-forwarded-host') || Astro.url.host}`;
}

export const ORG = (base) => ({
  '@context': 'https://schema.org', '@type': 'Organization', name: 'Teknons and Partners Digital Corporation', alternateName: 'Teknons',
  url: base + '/', logo: base + '/teknons-logo.svg', email: 'contact@teknons.com',
  description: 'Premium websites, web applications and business software for every industry.',
});
export const crumbs = (base, items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({'@type': 'ListItem', position: i + 1, name, item: base + url})),
});
