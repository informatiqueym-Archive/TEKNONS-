// Lists every public page in both languages for search engines.
import { content, origin } from '../lib/site.js';
import { R, CATS, POSTS } from '../lib/core.js';

export function GET(ctx){
  const base = origin(ctx), { state } = content();
  const keys = ['home', 'solutions', 'services', 'work', 'about', 'blog', 'contact', 'addons', 'support',
    ...CATS.map(c => 'cat-' + c.id), ...state.SOL.map(s => 's-' + s.id), ...state.PROJECTS.map(p => 'p-' + p.id), ...POSTS.map(p => 'post-' + p.id)];
  const urls = keys.map(k => ['en', 'fr'].map(l => `  <url><loc>${base}${R(k, l)}</loc>${['en', 'fr'].map(a => `<xhtml:link rel="alternate" hreflang="${a}" href="${base}${R(k, a)}"/>`).join('')}</url>`).join('\n')).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
    {headers: {'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}});
}
