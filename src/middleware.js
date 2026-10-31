// Every HTML page keeps only its own language, gets real addresses for "#route" links,
// and has its input placeholders filled in.
import { defineMiddleware } from 'astro:middleware';
import { stripLang, fixLinks, withLang, t, esc } from './lib/core.js';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const res = await next();
  const m = /^\/(en|fr)(\/|$)/.exec(ctx.url.pathname);
  if (!m || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const lang = m[1];
  let html = await res.text();
  html = withLang(lang, null, () => fixLinks(stripLang(html, lang), lang).replace(/data-ph="(\w+)"/g, (s, k) => `data-ph="${k}" placeholder="${esc(t(k))}"`));
  const headers = new Headers(res.headers); headers.delete('content-length');
  return new Response(html, {status: res.status, statusText: res.statusText, headers});
});
