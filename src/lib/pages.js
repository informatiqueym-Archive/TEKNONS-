// Builds each page's body HTML and SEO data on the server.
import home from '../views/home.html?raw';
import solutions from '../views/solutions.html?raw';
import solution from '../views/solution.html?raw';
import services from '../views/services.html?raw';
import work from '../views/work.html?raw';
import about from '../views/about.html?raw';
import blog from '../views/blog.html?raw';
import post from '../views/post.html?raw';
import contact from '../views/contact.html?raw';
import project from '../views/project.html?raw';
import admin from '../views/admin.html?raw';
import demo from '../views/demo.html?raw';
import addons from '../views/addons.html?raw';
import support from '../views/support.html?raw';
import * as C from './core.js';
import { content, origin, crumbs } from './site.js';

const { withLang, fillIds, tt, t, L, LL, esc, R, CATS, POSTS, catName, catOf, money } = C;
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const cut = (s, n = 158) => { s = strip(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

// Each builder returns {view, title, desc, route, body, ...} or null for "not found".
const B = {
  home(){
    const slides = C.visibleSlides(), testis = C.testisHtml();
    let body = home;
    body = testis ? body.replace(/<!--\/?TESTI-->/g, '') : body.replace(/<!--TESTI-->[\s\S]*?<!--\/TESTI-->\s*/, '');
    return {view: 'home', route: 'home',
      title: tt('Teknons and Partners Digital Corporation · Premium websites, web apps and software', 'Teknons and Partners Digital Corporation · Sites web, applications et logiciels haut de gamme'),
      desc: tt('Teknons designs and builds premium websites, custom web applications, mobile apps and business software for every industry. Ready-to-launch solutions or fully custom.', 'Teknons conçoit et développe des sites web haut de gamme, des applications web et mobiles et des logiciels métier pour tous les secteurs. Solutions prêtes à lancer ou sur mesure.'),
      body: fillIds(body, {...(testis ? {testis} : {}), promises: C.promisesHtml(), faqs: C.faqHtml(), scramble: t('scramble')[0], popular: C.popularHtml(), marquee: C.marqueeHtml(), rsStage: C.slidesHtml(slides), rsThumbs: C.thumbsHtml(slides), rsTot: '/ ' + String(slides.length).padStart(2, '0'),
        catGrid: C.catGridHtml(), stats: C.statsHtml(), homeTabs: C.homeTabsHtml('all'), homeProducts: C.homeProductsHtml('all'), indIcons: C.indIconsHtml(),
        homeWork: C.homeShowcaseHtml(), homeBlog: POSTS.slice(0, 3).map(C.postCard).join('')}),
      jsonld: [{'@context': 'https://schema.org', '@type': 'WebSite', name: 'Teknons and Partners Digital Corporation', url: '{base}' + R('home'), inLanguage: C.getLang(),
        potentialAction: {'@type': 'SearchAction', target: '{base}' + R('solutions') + '?q={search_term_string}', 'query-input': 'required name=search_term_string'}}, C.faqLd()]};
  },
  solutions(q, cat = 'all'){
    if (cat !== 'all' && !catOf(cat)) return null;
    const hub = {q: String(q.get('q') || '').slice(0, 80), type: C.TYPES.includes(q.get('type')) ? q.get('type') : 'all', cat, sort: ['featured', 'low', 'high', 'fast'].includes(q.get('sort')) ? q.get('sort') : 'featured'};
    const h = C.hubParts(hub), c = catOf(cat);
    let body = fillIds(solutions, {typeOpts: h.typeOpts, catOpts: h.catOpts, count: h.count, sort: h.sort, hubGrid: h.grid}).replace('value=""', `value="${esc(hub.q)}"`);
    if (c) body = body.replace(/<h1>[\s\S]*?<\/h1>\s*<p>[\s\S]*?<\/p>/, `<h1>${L(c.name)}.</h1><p>${L(c.d)} ${tt('Ready-to-launch solutions, customised to your brand and delivered with full source code.', 'Des solutions prêtes à lancer, personnalisées à votre marque et livrées avec leur code source complet.')}</p>`)
      .replace('/ Solutions</div>', `/ <a href="#solutions">Solutions</a> / ${L(c.name)}</div>`);
    const list = C.hubList(hub);
    return {view: 'solutions', route: c ? 'cat-' + cat : 'solutions', noindex: !!(hub.q || hub.type !== 'all' || hub.sort !== 'featured'),
      title: c ? tt(`${L(c.name)} solutions`, `Solutions ${L(c.name)}`) : tt('Solutions hub: websites, web apps and software', 'Hub de solutions : sites, applications et logiciels'),
      desc: c ? cut(`${L(c.d)} ${tt(`${list.length} ready-to-launch solutions by Teknons, in very affordable packs.`, `${list.length} solutions prêtes à lancer par Teknons, en packs très abordables.`)}`)
        : tt('Browse ready-to-launch websites, web apps, mobile apps and business software by industry. Customised to your brand, delivered with full source code.', 'Parcourez des sites, applications web et mobiles et logiciels métier prêts à lancer, par secteur. Personnalisés à votre marque, livrés avec le code source.'),
      body, hub,
      jsonld: [{'@context': 'https://schema.org', '@type': 'ItemList', itemListElement: list.slice(0, 30).map((s, i) => ({'@type': 'ListItem', position: i + 1, url: '{base}' + R('s-' + s.id), name: s.name}))}]};
  },
  solution(q, id){
    const p = C.state().SOL.find(s => s.id === id); if (!p) return null;
    return {view: 'solution', route: 's-' + p.id, title: `${p.name} · ${L(C.UI.types[p.type])} ${tt('for', 'pour')} ${catName(p.cat)}`, desc: cut(`${LL(p.t)} ${tt('Very affordable, delivered in', 'Très abordable, livré en')} ${p.weeks} ${t('weeks')}.`),
      image: p.cover || undefined, body: fillIds(solution, {detail: C.detailHtml(p)}),
      jsonld: [{'@context': 'https://schema.org', '@type': 'Product', name: p.name, description: LL(p.t), image: p.cover ? ['{base}' + p.cover.replace(/^(?!\/|https?:)/, '/')] : undefined, category: catName(p.cat), brand: {'@type': 'Brand', name: 'Teknons'}},
        crumbsOf([[t('home'), R('home')], ['Solutions', R('solutions')], [catName(p.cat), R('cat-' + p.cat)], [p.name, R('s-' + p.id)]])]};
  },
  services(){
    return {view: 'services', route: 'services', title: tt('Services: design, development, apps, AI and cloud', 'Services : design, développement, applications, IA et cloud'),
      desc: tt('Strategy, UI/UX design, websites, custom web apps, mobile apps, business software, AI automation, hosting and support. One team from first sketch to millions of users.', 'Stratégie, design UI/UX, sites web, applications web et mobiles, logiciels métier, IA, hébergement et support. Une seule équipe, du croquis aux millions d’utilisateurs.'),
      body: fillIds(services, {svcList: C.svcListHtml()})};
  },
  work(){
    return {view: 'work', route: 'work', title: tt('Portfolio: websites and apps we have shipped', 'Réalisations : sites et applications livrés'),
      desc: tt('A selection of the websites, web applications and software Teknons has designed, built and launched.', 'Une sélection des sites, applications web et logiciels conçus, développés et lancés par Teknons.'),
      body: fillIds(work, {workTabs: C.workTabsHtml('all'), workGrid: C.workGridHtml('all')})};
  },
  project(q, id){
    const p = C.state().PROJECTS.find(x => x.id === id); if (!p) return null;
    const h = C.projectHtml(p);
    return {view: 'project', route: 'p-' + p.id, title: `${LL(p.title)} · ${tt('Portfolio', 'Réalisations')}`, desc: cut(LL(p.summary) || LL(p.body) || LL(p.title)), image: p.cover || undefined,
      body: fillIds(project, {pjHero: h.hero, pjBody: h.body}),
      jsonld: [{'@context': 'https://schema.org', '@type': 'CreativeWork', name: LL(p.title), description: LL(p.summary), url: '{base}' + R('p-' + p.id), image: p.cover ? '{base}' + p.cover : undefined, creator: {'@type': 'Organization', name: 'Teknons and Partners Digital Corporation'}},
        crumbsOf([[t('home'), R('home')], [tt('Portfolio', 'Réalisations'), R('work')], [LL(p.title), R('p-' + p.id)]])]};
  },
  about(){
    return {view: 'about', route: 'about', title: tt('Who we are', 'Qui sommes-nous'),
      desc: tt('Teknons and Partners Digital Corporation is a digital engineering company building the websites, web applications and software that companies run on. Our mission, vision and values.', 'Teknons and Partners Digital Corporation est une entreprise d’ingénierie numérique qui construit les sites, applications et logiciels des entreprises. Notre mission, notre vision et nos valeurs.'),
      body: about};
  },
  blog(q){
    const cat = C.postCats().includes(q.get('cat')) ? q.get('cat') : 'all', b = C.blogParts(cat);
    return {view: 'blog', route: 'blog', noindex: cat !== 'all', title: tt('Blog: insights and engineering notes', 'Blog : idées et notes d’ingénierie'),
      desc: tt('Practical guides on websites, web apps, AI and software for business leaders who want results.', 'Des guides pratiques sur les sites, applications web, l’IA et les logiciels pour les dirigeants qui veulent des résultats.'),
      body: fillIds(blog, {blogCats: b.cats, blogFeatured: b.featured, blogGrid: b.grid}), blogCat: cat};
  },
  post(q, id){
    const p = POSTS.find(x => x.id === id); if (!p) return null;
    return {view: 'post', route: 'post-' + p.id, title: L(p.title), desc: cut(L(p.ex)), image: `/img/post-${p.id}.jpg`, body: fillIds(post, {article: C.postHtml(p)}),
      jsonld: [{'@context': 'https://schema.org', '@type': 'BlogPosting', headline: L(p.title), description: L(p.ex), image: '{base}' + `/img/post-${p.id}.jpg`, inLanguage: C.getLang(), url: '{base}' + R('post-' + p.id),
        author: {'@type': 'Organization', name: 'Teknons and Partners Digital Corporation'}, publisher: {'@type': 'Organization', name: 'Teknons and Partners Digital Corporation', logo: {'@type': 'ImageObject', url: '{base}/teknons-logo.svg'}}},
        crumbsOf([[t('home'), R('home')], ['Blog', R('blog')], [L(p.title), R('post-' + p.id)]])]};
  },
  demo(q, id){
    const p = C.state().SOL.find(s => s.id === id); if (!p || !C.demoLink(p) || C.demoLink(p).ext) return null;
    return {view: 'demo', route: 'demo-' + p.id, noindex: true, bare: true, image: p.cover || undefined,
      title: tt(`${p.name} live demo`, `Démo en direct de ${p.name}`), desc: cut(`${tt('Try', 'Essayez')} ${p.name}: ${LL(p.t)}`),
      body: fillIds(demo, {demoWrap: C.demoHtml(p)})};
  },
  addons(q){
    const cat = Object.keys(C.ADDON_CATS).includes(q.get('cat')) ? q.get('cat') : 'all', a = C.addonsParts(cat), list = C.visibleAddons();
    return {view: 'addons', route: 'addons', addonCat: cat, title: tt('Add-ons: payments, WhatsApp, AI, mobile app and more', 'Options : paiements, WhatsApp, IA, application mobile et plus'),
      desc: tt('Priced add-ons for every Teknons solution: online and mobile money payments, WhatsApp and SMS, AI assistant, mobile app, extra languages, hosting and care plans.', 'Des options tarifées pour chaque solution Teknons : paiements en ligne et mobile money, WhatsApp et SMS, assistant IA, application mobile, langues, hébergement et suivi.'),
      body: fillIds(addons, {addonTabs: a.tabs, addonGrid: a.grid, promises: C.promisesHtml()}),
      jsonld: [{'@context': 'https://schema.org', '@type': 'OfferCatalog', name: tt('Teknons add-ons', 'Options Teknons'), itemListElement: list.map(x => ({'@type': 'Offer', name: LL(x.name), description: LL(x.desc)}))},
        crumbsOf([[t('home'), R('home')], [tt('Add-ons', 'Options'), R('addons')]])]};
  },
  support(){
    return {view: 'support', route: 'support', title: tt('Support: tickets, WhatsApp and guides', 'Support : tickets, WhatsApp et guides'),
      desc: tt('Help for Teknons clients: open a support ticket, message us on WhatsApp or email, and read quick guides on content, payments, hosting and accounts.', 'Aide pour les clients Teknons : ouvrez un ticket, écrivez-nous sur WhatsApp ou par email, et lisez les guides sur contenus, paiements, hébergement et comptes.'),
      body: fillIds(support, {chans: C.supportChannelsHtml(), guides: C.guidesHtml(), tPrio: C.prioOptsHtml()})};
  },
  contact(q){
    const want = String(q.get('solution') || ''), addon = C.visibleAddons().find(a => a.id === q.get('addon'));
    return {view: 'contact', route: 'contact', title: tt('Contact and project estimator', 'Contact et estimateur de projet'),
      desc: tt('Tell us about your project. Get an instant indicative budget, then a fixed quote from the Teknons team within 48 hours.', 'Parlez-nous de votre projet. Obtenez un budget indicatif immédiat, puis un devis fixe de l’équipe Teknons sous 48 heures.'),
      body: fillIds(contact, {eType: C.optionsHtml('estTypes', 0), cSolution: C.solutionOptsHtml(want), cBudget: C.optionsHtml('budgets', 0), cWhen: C.optionsHtml('whens', 0), ...(addon ? {cMsg: esc(tt('I would like to add: ', 'Je souhaite ajouter : ') + LL(addon.name) + '.\n')} : {})})};
  },
  admin(){
    return {view: 'admin', route: 'admin', noindex: true, title: tt('Admin', 'Administration'), desc: 'Teknons admin', body: admin};
  },
};
let crumbBase = '';
const crumbsOf = items => crumbs(crumbBase, items);

// Renders a page for Astro. Returns null when the address does not exist.
export function build(Astro, name, ...args){
  const { lang } = Astro.params;
  if (lang !== 'en' && lang !== 'fr') return null;
  const base = origin(Astro); crumbBase = base;
  const page = withLang(lang, content().state, () => B[name](Astro.url.searchParams, ...args));
  if (!page) return null;
  const fill = v => typeof v === 'string' ? v.replace(/\{base\}/g, base) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
  page.jsonld = fill(page.jsonld || []);
  return {lang, ...page};
}
