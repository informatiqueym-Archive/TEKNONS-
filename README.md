# Teknons Digital Corporation website

Bilingual (English and French) website built with [Astro](https://astro.build), rendered on the server so every page has its own address for Google and content saved in the admin appears straight away.

## Pages

| Page | English | French |
|---|---|---|
| Home | `/en/` | `/fr/` |
| Solutions hub | `/en/solutions/` | `/fr/solutions/` |
| Industry | `/en/solutions/saas/` | `/fr/solutions/saas/` |
| Solution | `/en/solution/pulse-crm/` | `/fr/solution/pulse-crm/` |
| Live demo | `/en/demo/pulse-crm/` | `/fr/demo/pulse-crm/` |
| Add-ons, support | `/en/addons/`, `/en/support/` | `/fr/addons/`, `/fr/support/` |
| Services, portfolio, about, blog, contact | `/en/services/` … | `/fr/services/` … |
| Admin | `/en/admin/` | `/fr/admin/` |

`/` sends visitors to their browser's language. `sitemap.xml` and `robots.txt` are generated automatically.

## Run locally

```bash
npm install
npm run build
ADMIN_PASSWORD=change-me npm start   # http://localhost:3000
```

`npm run dev` starts Astro's dev server for design work (the admin API needs `npm start`).

## Deploy on Coolify

1. New resource, pick this GitHub repository, build pack **Dockerfile**.
2. Port: **3000**.
3. Environment variables:
   - `ADMIN_PASSWORD`: the admin password (required).
   - `SITE_URL`: your public address, e.g. `https://teknons.com` (used in canonical links, the sitemap and social cards).
   - `MAX_VIDEO_MB` (optional): largest video upload, default 500.
4. Persistent storage: mount a volume at **/data**. It holds `content.json` (projects, solutions, slider and settings), `messages.json` (contact requests and newsletter sign-ups) and `uploads/` (images and videos). Without it, content is lost on redeploy.
5. If you upload large videos, raise the proxy body size limit in Coolify (Traefik) to match `MAX_VIDEO_MB`.

## Admin

Open `/en/admin/` and sign in with `ADMIN_PASSWORD`. You can:

- publish finished sites (texts in both languages, screenshots, a video up to 5 minutes or a YouTube/Vimeo link);
- edit, hide or reset every solution, including the samples;
- edit the video slider (videos, texts, buttons, order);
- edit add-ons and their prices, and publish client testimonials (the home page section appears once one is published);
- set the WhatsApp number and support email shown on the Support page (Settings);
- change category images;
- read contact requests, support tickets and newsletter sign-ups in **Messages**.

## Project layout

- `src/lib/core.js`: content, translations and HTML renderers shared by the server and the browser.
- `src/lib/pages.js`: builds each page (title, description, structured data, body).
- `src/views/`: page markup.
- `src/scripts/app.js`: animations, filters, forms, slider and the admin panel.
- `src/styles/site.css`: the design.
- `server.mjs`: production server (admin API, uploads, static files, then Astro).
