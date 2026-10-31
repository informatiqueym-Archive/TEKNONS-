import { origin } from '../lib/site.js';
export function GET(ctx){
  return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /en/admin/\nDisallow: /fr/admin/\n\nSitemap: ${origin(ctx)}/sitemap.xml\n`, {headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}
