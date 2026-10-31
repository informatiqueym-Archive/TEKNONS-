// Teknons production server: the admin content API, uploaded files, static assets, then the Astro pages.
// No extra dependencies, Node 20+.
//
// Environment:
//   ADMIN_PASSWORD  required to sign in to /en/admin/
//   SITE_URL        public address, e.g. https://teknons.com (canonical links, sitemap, social cards)
//   DATA_DIR        where content.json, messages.json and uploads/ live (default ./data); mount it as a volume
//   MAX_VIDEO_MB    largest video upload in MB (default 500)
//   PORT            default 3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 3000;
const CLIENT = path.join(ROOT, 'dist', 'client');
const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
process.env.DATA_DIR = DATA_DIR; // the page renderer reads the same folder
const UPLOADS = path.join(DATA_DIR, 'uploads');
const CONTENT = path.join(DATA_DIR, 'content.json');
const INBOX = path.join(DATA_DIR, 'messages.json');
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const MAX_UPLOAD = 15 * 1024 * 1024;
const MAX_VIDEO = (+process.env.MAX_VIDEO_MB || 500) * 1024 * 1024;
const MAX_JSON = 1024 * 1024;

fs.mkdirSync(UPLOADS, { recursive: true });
if (!PASSWORD) console.warn('ADMIN_PASSWORD is not set: the admin panel is locked.');

const { handler } = await import('./dist/server/entry.mjs');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.txt': 'text/plain', '.json': 'application/json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const IMG_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
const VID_EXT = { 'video/mp4': '.mp4', 'video/webm': '.webm' };
const COLLECTIONS = new Set(['projects', 'solutions']);

const readJson = (file, empty) => { try { return { ...empty, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { return empty; } };
function writeJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
let content = readJson(CONTENT, { projects: [], solutions: [], settings: {} });
let inbox = readJson(INBOX, { messages: [], subscribers: [] });
const save = () => writeJson(CONTENT, content);
const saveInbox = () => writeJson(INBOX, inbox);

const token = () => crypto.createHmac('sha256', PASSWORD).update('teknons-admin-v1').digest('hex');
function authed(req) {
  if (!PASSWORD) return false;
  const got = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
  const want = Buffer.from(token());
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// Public forms: a few posts per address every 10 minutes.
const hits = new Map();
function limited(req, max = 5) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 600000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

function send(res, code, body, type = 'application/json', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJsonBody = async (req, limit) => JSON.parse((await readBody(req, limit)).toString() || '{}');
const validId = id => /^[A-Za-z0-9_-]{1,80}$/.test(id);
const validEmail = e => typeof e === 'string' && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const str = (v, n) => String(v ?? '').trim().slice(0, n);

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  if (req.method === 'GET' && parts[1] === 'content') return send(res, 200, content, 'application/json', { 'Cache-Control': 'no-store' });

  if (req.method === 'POST' && parts[1] === 'login') {
    const body = await readJsonBody(req, 10000);
    const ok = PASSWORD && typeof body.password === 'string' && body.password.length === PASSWORD.length &&
      crypto.timingSafeEqual(Buffer.from(body.password), Buffer.from(PASSWORD));
    if (!ok) { await new Promise(r => setTimeout(r, 800)); return send(res, 401, { error: 'wrong_password' }); }
    return send(res, 200, { token: token() });
  }

  if (req.method === 'POST' && parts[1] === 'contact') {
    if (limited(req)) return send(res, 429, { error: 'slow_down' });
    const b = await readJsonBody(req, 20000);
    if (b.website) return send(res, 200, { ok: true }); // filled by bots only
    if (!str(b.name, 120) || !validEmail(b.email)) return send(res, 400, { error: 'invalid' });
    inbox.messages.unshift({ id: crypto.randomBytes(8).toString('hex'), at: Date.now(), lang: b.lang === 'fr' ? 'fr' : 'en',
      name: str(b.name, 120), company: str(b.company, 120), email: str(b.email, 200), phone: str(b.phone, 40), solution: str(b.solution, 120),
      budget: str(b.budget, 60), when: str(b.when, 60), estimate: str(b.estimate, 60), message: str(b.message, 5000) });
    inbox.messages = inbox.messages.slice(0, 2000);
    saveInbox(); return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && parts[1] === 'support') {
    if (limited(req)) return send(res, 429, { error: 'slow_down' });
    const b = await readJsonBody(req, 20000);
    if (b.website) return send(res, 200, { ok: true }); // filled by bots only
    if (!str(b.name, 120) || !validEmail(b.email) || !str(b.subject, 200) || !str(b.message, 5000)) return send(res, 400, { error: 'invalid' });
    inbox.messages.unshift({ id: crypto.randomBytes(8).toString('hex'), kind: 'support', at: Date.now(), lang: b.lang === 'fr' ? 'fr' : 'en',
      name: str(b.name, 120), email: str(b.email, 200), site: str(b.site, 300), priority: ['low', 'normal', 'urgent'].includes(b.priority) ? b.priority : 'normal',
      subject: str(b.subject, 200), message: str(b.message, 5000) });
    inbox.messages = inbox.messages.slice(0, 2000);
    saveInbox(); return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && parts[1] === 'subscribe') {
    if (limited(req)) return send(res, 429, { error: 'slow_down' });
    const b = await readJsonBody(req, 2000), email = str(b.email, 200).toLowerCase();
    if (!validEmail(email)) return send(res, 400, { error: 'invalid' });
    if (!inbox.subscribers.some(s => s.email === email)) { inbox.subscribers.push({ email, lang: b.lang === 'fr' ? 'fr' : 'en', at: Date.now() }); saveInbox(); }
    return send(res, 200, { ok: true });
  }

  if (!authed(req)) return send(res, 401, { error: 'auth' });

  if (parts[1] === 'messages') {
    if (req.method === 'GET') return send(res, 200, inbox, 'application/json', { 'Cache-Control': 'no-store' });
    if (req.method === 'DELETE' && parts[2] && validId(parts[2])) { inbox.messages = inbox.messages.filter(m => m.id !== parts[2]); saveInbox(); return send(res, 200, { ok: true }); }
  }
  if (req.method === 'POST' && parts[1] === 'upload') {
    const type = (req.headers['content-type'] || '').split(';')[0].trim();
    if (VID_EXT[type]) {
      // Videos are streamed straight to disk so large files never sit in memory.
      const name = crypto.randomBytes(12).toString('hex') + VID_EXT[type], dest = path.join(UPLOADS, name);
      if (+req.headers['content-length'] > MAX_VIDEO) return send(res, 413, { error: 'too_large' });
      await new Promise((resolve, reject) => {
        let size = 0; const out = fs.createWriteStream(dest);
        req.on('data', c => { size += c.length; if (size > MAX_VIDEO) { req.destroy(); out.destroy(); fs.rm(dest, () => {}); reject(new Error('too_large')); } });
        req.pipe(out); out.on('finish', resolve); out.on('error', reject); req.on('error', reject);
      });
      return send(res, 200, { url: '/uploads/' + name });
    }
    if (!IMG_EXT[type]) return send(res, 415, { error: 'unsupported_type' });
    const buf = await readBody(req, MAX_UPLOAD);
    const name = crypto.randomBytes(12).toString('hex') + IMG_EXT[type];
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return send(res, 200, { url: '/uploads/' + name });
  }
  if (req.method === 'PUT' && parts[1] === 'settings') {
    content.settings = await readJsonBody(req, MAX_JSON);
    save(); return send(res, 200, { ok: true });
  }
  if (COLLECTIONS.has(parts[1]) && parts[2] && validId(parts[2])) {
    const col = parts[1], id = parts[2];
    if (req.method === 'PUT') {
      const obj = await readJsonBody(req, MAX_JSON);
      obj.id = id;
      const i = content[col].findIndex(x => x.id === id);
      if (i < 0) content[col].push(obj); else content[col][i] = obj;
      save(); return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      content[col] = content[col].filter(x => x.id !== id);
      save(); return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { error: 'not_found' });
}

// Sends a file with Range support (videos need it to seek). Calls next() when the file does not exist.
function serveFile(req, res, file, cache, next) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return next ? next() : send(res, 404, 'Not found', 'text/plain');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      const start = range[1] ? +range[1] : Math.max(0, st.size - +range[2]), end = range[1] && range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...head, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${st.size}` });
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    req.method === 'HEAD' ? res.end() : fs.createReadStream(file).pipe(res);
  });
}

const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };

http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://x'); } catch (e) { return send(res, 400, 'Bad request', 'text/plain'); }
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname.startsWith('/uploads/')) return serveFile(req, res, path.join(UPLOADS, path.basename(url.pathname)), 'public, max-age=31536000, immutable');
    const pages = () => { for (const [k, v] of Object.entries(SECURITY)) res.setHeader(k, v); handler(req, res); };
    if ((req.method === 'GET' || req.method === 'HEAD') && /\.[a-z0-9]{2,5}$/i.test(url.pathname) && !url.pathname.endsWith('.xml') && !url.pathname.endsWith('robots.txt')) {
      let rel; try { rel = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, 'Bad request', 'text/plain'); }
      const file = path.join(CLIENT, path.normalize(rel));
      if (!file.startsWith(CLIENT + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
      const cache = url.pathname.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400';
      return serveFile(req, res, file, cache, pages);
    }
    pages();
  } catch (e) {
    if (res.headersSent) return res.end();
    send(res, e.message === 'too_large' ? 413 : 400, { error: e.message === 'too_large' ? 'too_large' : 'bad_request' });
  }
}).listen(PORT, () => console.log(`Teknons running on http://localhost:${PORT}`));
