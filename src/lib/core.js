// Teknons shared core: content, translations and HTML renderers.
// Used by the server (to render every page for Google) and by the browser
// (to update lists interactively and to run the admin panel).

// ---------- Language ----------
export let lang = 'en';
export const getLang = () => lang;
export const setLang = l => { lang = l === 'fr' ? 'fr' : 'en'; };
// Run fn with a language and content state. Rendering is synchronous, so concurrent
// server requests never see each other's language.
export function withLang(l, st, fn){
  const pl = lang, ps = S; setLang(l); if (st) S = st;
  try { return fn(); } finally { lang = pl; S = ps; }
}
export const L = o => (o && typeof o === 'object' && !Array.isArray(o)) ? (o[lang] ?? o.en) : o;
export const UI = {
  heroQ:{en:'What do you want to build? e.g. booking app, online store, CRM', fr:'Que voulez-vous créer ? ex. réservation, boutique, CRM'},
  hubQ:{en:'Search solutions', fr:'Rechercher une solution'},
  cMsg:{en:'Your goals, your users, and anything you already have', fr:'Vos objectifs, vos utilisateurs et ce que vous avez déjà'},
  news:{en:'Your email for our newsletter', fr:'Votre email pour la newsletter'},
  popular:{en:'Popular:', fr:'Populaire :'},
  pop:{en:['Online store','Booking app','CRM','School platform','AI assistant'], fr:['Boutique en ligne','Réservation','CRM','Plateforme scolaire','Assistant IA']},
  scramble:{en:['websites','web apps','business software','mobile apps','AI automation','online stores'], fr:['sites web','applications web','logiciels métier','apps mobiles','automatisation IA','boutiques en ligne']},
  all:{en:'All', fr:'Tout'}, allWork:{en:'All work', fr:'Tous les projets'},
  types:{'Website':{en:'Website',fr:'Site web'},'Web App':{en:'Web app',fr:'Application web'},'Software':{en:'Software',fr:'Logiciel'},'Mobile App':{en:'Mobile app',fr:'App mobile'}},
  typesPl:{'Website':{en:'Websites',fr:'Sites web'},'Web App':{en:'Web apps',fr:'Applications web'},'Software':{en:'Software',fr:'Logiciels'},'Mobile App':{en:'Mobile apps',fr:'Apps mobiles'}},
  allTypes:{en:'All types',fr:'Tous les types'}, allInd:{en:'All industries',fr:'Tous les secteurs'},
  from:{en:'Starting at',fr:'À partir de'}, delivery:{en:'Delivery',fr:'Livraison'}, weeks:{en:'weeks',fr:'semaines'},
  view:{en:'View details →',fr:'Voir le détail →'}, add:{en:'Add your project',fr:'Ajoutez votre projet'},
  count:{en:n=>`<b>${n}</b> solution${n===1?'':'s'}`, fr:n=>`<b>${n}</b> solution${n===1?'':'s'}`}, inCat:{en:' in ',fr:' en '},
  sort:{en:[['featured','Featured'],['fast','Fastest delivery']], fr:[['featured','En vedette'],['fast','Livraison la plus rapide']]},
  empty:{en:'Nothing matches yet.',fr:'Aucun résultat pour le moment.'}, emptyP:{en:'We build custom solutions too.',fr:'Nous créons aussi des solutions sur mesure.'}, describe:{en:'Describe your project →',fr:'Décrivez votre projet →'},
  feats:{en:'Key features',fr:'Fonctionnalités clés'}, incl:{en:'What’s included',fr:'Ce qui est inclus'}, tech:{en:'Technology',fr:'Technologies'},
  inclList:{en:['Customisation to your brand','Full source code and ownership','Setup on your domain and hosting','Training for your team','Documentation','30 days of free support'], fr:['Personnalisation à votre marque','Code source complet et propriété','Installation sur votre domaine et hébergement','Formation de votre équipe','Documentation','30 jours de support offerts']},
  type:{en:'Type',fr:'Type'}, industry:{en:'Industry',fr:'Secteur'}, own:{en:'Ownership',fr:'Propriété'}, ownV:{en:'100% yours',fr:'100 % à vous'},
  req:{en:'Request this solution →',fr:'Demander cette solution →'}, demo:{en:'Book a free demo call',fr:'Réserver une démo gratuite'},
  fine:{en:'Final price depends on your customisations. You receive a fixed quote before any work starts.',fr:'Le prix final dépend de vos personnalisations. Vous recevez un devis fixe avant tout démarrage.'},
  also:{en:'You may also like',fr:'Vous aimerez aussi'}, home:{en:'Home',fr:'Accueil'},
  read:{en:'Read article →',fr:'Lire l’article →'}, readT:{en:'read',fr:'de lecture'}, keep:{en:'Keep reading',fr:'À lire aussi'},
  ctaH:{en:'Have a project in mind?',fr:'Un projet en tête ?'}, ctaP:{en:'Get a fixed quote from the Teknons team within 48 hours.',fr:'Recevez un devis fixe de l’équipe Teknons sous 48 heures.'}, ctaB:{en:'Start a project →',fr:'Lancer un projet →'},
  estTypes:{en:[[2500,'Business website'],[6000,'E-commerce store'],[12000,'Custom web app'],[15000,'Mobile app'],[25000,'Enterprise software (ERP, CRM)']], fr:[[2500,'Site vitrine d’entreprise'],[6000,'Boutique en ligne'],[12000,'Application web sur mesure'],[15000,'Application mobile'],[25000,'Logiciel d’entreprise (ERP, CRM)']]},
  sizes:{en:['Small','Medium','Large'],fr:['Petit','Moyen','Grand']},
  notSure:{en:'Not sure yet, advise me',fr:'Je ne sais pas encore, conseillez-moi'},
  budgets:{en:['Not sure yet, advise me','Small business','Growing business, several branches','Large company or group'],fr:['Je ne sais pas encore, conseillez-moi','Petite entreprise','Entreprise en croissance, plusieurs agences','Grande entreprise ou groupe']},
  whens:{en:['As soon as possible','Within 3 months','Within 6 months','Just exploring'],fr:['Dès que possible','Sous 3 mois','Sous 6 mois','Je me renseigne']},
  sent:{en:'Preview mode: this form will be connected to the Teknons inbox before launch.',fr:'Mode aperçu : ce formulaire sera relié à la boîte Teknons avant le lancement.'},
  invalid:{en:'Please add your name and a valid email so we can reply.',fr:'Ajoutez votre nom et un email valide pour que nous puissions répondre.'},
  newsOk:{en:'Preview mode: newsletter sign-up connects at launch.',fr:'Mode aperçu : l’inscription sera active au lancement.'}, newsBad:{en:'Enter a valid email address.',fr:'Saisissez une adresse email valide.'},
  megaH:{en:'Browse by industry',fr:'Par secteur'}, megaF:{en:'Featured',fr:'À la une'}, megaP:{en:'Launch your own subscription software with accounts, billing and analytics.',fr:'Lancez votre propre logiciel par abonnement avec comptes, facturation et statistiques.'}, discover:{en:'Discover →',fr:'Découvrir →'},
  solN:{en:'solutions →',fr:'solutions →'},
};
export const t = k => L(UI[k]);

// ---------- Icons ----------
export const I = {
  corporate:'<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01M8 13.5h.01M12 13.5h.01M16 13.5h.01"/>',
  ecommerce:'<path d="M4 5h2l2.2 10.2a1 1 0 0 0 1 .8H18l2-8H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  saas:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M8 21h8"/>',
  erp:'<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M16.5 13v7M13 16.5h7"/>',
  booking:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3v3H8z"/>',
  health:'<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11z"/><path d="M9 11h6M12 8v6"/>',
  education:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
  realestate:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
  hospitality:'<path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M17 3c-2 2-2 6 0 8v10"/>',
  fintech:'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
  logistics:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  ai:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4z"/>',
  web:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
  code:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  mobile:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  shield:'<path d="M12 3l8 4v5c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/>',
  pen:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.7-4.3L4 8M4 4v4h4M4 13a8 8 0 0 0 14.7 4.3L20 16M20 20v-4h-4"/>',
  headset:'<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20a3 3 0 0 1-3 3h-3"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  cloud:'<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
};
export const icon = (k, s=22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

// ---------- Data (edit freely) ----------
export const CATS = [
  {id:'corporate', hue:40, name:{en:'Corporate Websites',fr:'Sites corporate'}, d:{en:'Company sites that build trust and generate leads.',fr:'Des sites qui inspirent confiance et génèrent des contacts.'}},
  {id:'ecommerce', hue:20, name:{en:'E-commerce',fr:'E-commerce'}, d:{en:'Online stores, marketplaces and payment flows.',fr:'Boutiques en ligne, marketplaces et paiements.'}},
  {id:'saas', hue:225, name:{en:'SaaS Platforms',fr:'Plateformes SaaS'}, d:{en:'Subscription software with accounts and billing.',fr:'Logiciels par abonnement avec comptes et facturation.'}},
  {id:'erp', hue:160, name:{en:'ERP & CRM',fr:'ERP et CRM'}, d:{en:'Run sales, stock, HR and finance in one system.',fr:'Ventes, stocks, RH et finances dans un seul système.'}},
  {id:'booking', hue:195, name:{en:'Booking & Scheduling',fr:'Réservation et planning'}, d:{en:'Appointments, reservations and calendars.',fr:'Rendez-vous, réservations et agendas.'}},
  {id:'health', hue:172, name:{en:'Healthcare',fr:'Santé'}, d:{en:'Clinic management, telehealth and patient portals.',fr:'Gestion de clinique, téléconsultation et portails patients.'}},
  {id:'education', hue:255, name:{en:'Education & LMS',fr:'Éducation et LMS'}, d:{en:'Online courses, schools and training platforms.',fr:'Cours en ligne, écoles et plateformes de formation.'}},
  {id:'realestate', hue:145, name:{en:'Real Estate',fr:'Immobilier'}, d:{en:'Property listings, agencies and rental management.',fr:'Annonces, agences et gestion locative.'}},
  {id:'hospitality', hue:8, name:{en:'Restaurants & Hotels',fr:'Restaurants et hôtels'}, d:{en:'Menus, ordering, reservations and delivery.',fr:'Menus, commandes, réservations et livraison.'}},
  {id:'fintech', hue:45, name:{en:'Fintech & Payments',fr:'Fintech et paiements'}, d:{en:'Wallets, invoicing and financial dashboards.',fr:'Portefeuilles, facturation et tableaux financiers.'}},
  {id:'logistics', hue:28, name:{en:'Logistics & Delivery',fr:'Logistique et livraison'}, d:{en:'Fleet tracking, dispatch and delivery apps.',fr:'Suivi de flotte, dispatch et apps de livraison.'}},
  {id:'ai', hue:280, name:{en:'AI & Automation',fr:'IA et automatisation'}, d:{en:'Chatbots, document AI and workflow automation.',fr:'Chatbots, IA documentaire et automatisation.'}},
];
export const SAMPLE_SOL = [
  {id:'aurum-corporate', name:'Aurum Corporate Suite', cat:'corporate', type:'Website', price:2500, weeks:'3–4', layout:'site', hue:40, badge:'Featured',
   t:{en:'A prestige multi-page corporate website with CMS, blog, careers and lead capture.',fr:'Un site corporate de prestige multi-pages avec CMS, blog, carrières et capture de contacts.'},
   f:{en:['Multi-page CMS you edit yourself','Careers and job applications','Lead forms connected to email or CRM','SEO, analytics and cookie consent','French and English ready','Blazing fast hosting'],fr:['CMS multi-pages modifiable par vous','Carrières et candidatures','Formulaires reliés à l’email ou au CRM','SEO, statistiques et consentement cookies','Prêt en français et anglais','Hébergement ultra rapide']}, s:['Next.js','Headless CMS','Coolify']},
  {id:'vault-commerce', name:'Vault Commerce', cat:'ecommerce', type:'Website', price:5900, weeks:'4–6', layout:'shop', hue:28, badge:'Featured',
   t:{en:'A high-converting online store with secure checkout, stock and order management.',fr:'Une boutique en ligne qui convertit, avec paiement sécurisé, stocks et commandes.'},
   f:{en:['Product catalogue with variants','Card, mobile money and PayPal payments','Stock and order management','Discount codes and gift cards','Customer accounts','Shipping rules and invoices'],fr:['Catalogue produits avec variantes','Paiement carte, mobile money et PayPal','Gestion des stocks et commandes','Codes promo et cartes cadeaux','Comptes clients','Règles de livraison et factures']}, s:['Next.js','Stripe','PostgreSQL']},
  {id:'orbit-saas', name:'Orbit SaaS Starter', cat:'saas', type:'Web App', price:14900, weeks:'8–10', layout:'dash', hue:220, badge:'Featured',
   t:{en:'A complete SaaS foundation: sign-up, teams, subscriptions, admin and analytics.',fr:'Une base SaaS complète : inscription, équipes, abonnements, administration et statistiques.'},
   f:{en:['Sign-up, login, SSO and 2FA','Teams, roles and permissions','Subscription billing','Admin console','Usage analytics dashboards','Email notifications'],fr:['Inscription, connexion, SSO et 2FA','Équipes, rôles et permissions','Facturation par abonnement','Console d’administration','Tableaux de bord d’usage','Notifications email']}, s:['React','Node.js','PostgreSQL','Stripe']},
  {id:'titan-erp', name:'Titan ERP', cat:'erp', type:'Software', price:24900, weeks:'10–14', layout:'dash', hue:160, badge:'Enterprise',
   t:{en:'Sales, purchasing, inventory, HR and accounting in one secure business system.',fr:'Ventes, achats, stocks, RH et comptabilité dans un seul système sécurisé.'},
   f:{en:['Sales and purchase orders','Multi-warehouse inventory','HR, payroll and leave','Accounting and reports','Role-based access','Data import from Excel'],fr:['Commandes clients et fournisseurs','Stocks multi-entrepôts','RH, paie et congés','Comptabilité et rapports','Accès par rôles','Import de données Excel']}, s:['TypeScript','NestJS','PostgreSQL','Docker']},
  {id:'pulse-crm', name:'Pulse CRM', cat:'erp', type:'Web App', price:11900, weeks:'6–8', layout:'dash', hue:265,
   t:{en:'Track leads, deals and customers with pipelines your sales team will actually use.',fr:'Suivez prospects, affaires et clients avec des pipelines que vos commerciaux utiliseront vraiment.'},
   f:{en:['Visual sales pipeline','Contacts and companies','Email and call logging','Quotes and invoices','Team performance reports','Mobile friendly'],fr:['Pipeline commercial visuel','Contacts et entreprises','Suivi des emails et appels','Devis et factures','Rapports de performance','Adapté au mobile']}, s:['React','Node.js','PostgreSQL']},
  {id:'chrono-booking', name:'Chrono Booking', cat:'booking', type:'Web App', price:6900, weeks:'4–6', layout:'calendar', hue:195, badge:'Featured',
   t:{en:'Online appointments with deposits, reminders and staff calendars for any service business.',fr:'Prise de rendez-vous en ligne avec acomptes, rappels et agendas du personnel.'},
   f:{en:['Online booking 24/7','Deposits and online payment','SMS and email reminders','Staff and room calendars','Client history','Google Calendar sync'],fr:['Réservation en ligne 24h/24','Acomptes et paiement en ligne','Rappels SMS et email','Agendas du personnel et des salles','Historique client','Synchronisation Google Agenda']}, s:['Next.js','Node.js','Twilio']},
  {id:'medix-clinic', name:'Medix Clinic', cat:'health', type:'Software', price:18900, weeks:'8–12', layout:'dash', hue:175,
   t:{en:'Clinic management with patient records, appointments, billing and telehealth.',fr:'Gestion de clinique : dossiers patients, rendez-vous, facturation et téléconsultation.'},
   f:{en:['Patient records','Appointments and queues','Prescriptions','Billing and insurance','Video consultations','Encryption and audit log'],fr:['Dossiers patients','Rendez-vous et files d’attente','Ordonnances','Facturation et assurances','Consultations vidéo','Chiffrement et journal d’audit']}, s:['React','Node.js','PostgreSQL','WebRTC']},
  {id:'scholar-lms', name:'Scholar LMS', cat:'education', type:'Web App', price:9900, weeks:'6–8', layout:'lms', hue:250,
   t:{en:'Sell and deliver online courses with video lessons, quizzes and certificates.',fr:'Vendez et diffusez des cours en ligne avec vidéos, quiz et certificats.'},
   f:{en:['Video courses and lessons','Quizzes and assignments','Certificates','Course sales and subscriptions','Student progress tracking','Live classes'],fr:['Cours et leçons vidéo','Quiz et devoirs','Certificats','Vente de cours et abonnements','Suivi de progression','Classes en direct']}, s:['Next.js','Mux','Stripe']},
  {id:'estate-prime', name:'Estate Prime', cat:'realestate', type:'Website', price:7400, weeks:'5–7', layout:'map', hue:150,
   t:{en:'Property portal with map search, agent pages and lead routing.',fr:'Portail immobilier avec recherche sur carte, pages agents et routage des contacts.'},
   f:{en:['Map and filter search','Listing management','Agent profiles','Virtual tour embeds','Lead routing to agents','Favourites and alerts'],fr:['Recherche sur carte et filtres','Gestion des annonces','Profils d’agents','Visites virtuelles','Routage des contacts','Favoris et alertes']}, s:['Next.js','Mapbox','PostgreSQL']},
  {id:'savor-dining', name:'Savor Dining', cat:'hospitality', type:'Website', price:3900, weeks:'3–4', layout:'shop', hue:12,
   t:{en:'Restaurant website with online menu, ordering, table reservations and delivery.',fr:'Site de restaurant avec menu en ligne, commandes, réservations et livraison.'},
   f:{en:['Online menu with photos','Order for pickup or delivery','Table reservations','Kitchen order screen','Promotions','Reviews integration'],fr:['Menu en ligne avec photos','Commande à emporter ou livrée','Réservation de tables','Écran de commandes cuisine','Promotions','Intégration des avis']}, s:['Next.js','Stripe','Headless CMS']},
  {id:'ledger-pay', name:'Ledger Pay', cat:'fintech', type:'Web App', price:16900, weeks:'8–12', layout:'dash', hue:45, badge:'New',
   t:{en:'Invoicing, payments and a real-time finance dashboard for growing companies.',fr:'Facturation, paiements et tableau financier en temps réel pour les entreprises en croissance.'},
   f:{en:['Invoices and quotes','Online payments and payouts','Expense tracking','Cash-flow dashboard','Multi-currency','Accountant access'],fr:['Factures et devis','Paiements et versements en ligne','Suivi des dépenses','Tableau de trésorerie','Multi-devises','Accès comptable']}, s:['React','Node.js','Stripe','PostgreSQL']},
  {id:'route-fleet', name:'Route Fleet', cat:'logistics', type:'Software', price:15900, weeks:'8–10', layout:'map', hue:30,
   t:{en:'Dispatch, live vehicle tracking and proof of delivery for logistics teams.',fr:'Dispatch, suivi des véhicules en direct et preuve de livraison pour la logistique.'},
   f:{en:['Live GPS tracking','Route planning','Driver mobile app','Proof of delivery photos','Customer tracking links','Performance reports'],fr:['Suivi GPS en direct','Planification des tournées','App mobile chauffeur','Photos de preuve de livraison','Liens de suivi client','Rapports de performance']}, s:['React','React Native','Node.js','Mapbox']},
  {id:'nova-ai', name:'Nova AI Assistant', cat:'ai', type:'Software', price:8900, weeks:'4–6', layout:'chat', hue:280, badge:'New',
   t:{en:'An AI assistant trained on your documents that answers customers and staff 24/7.',fr:'Un assistant IA formé sur vos documents qui répond à vos clients et équipes 24h/24.'},
   f:{en:['Answers from your own documents','Website chat widget','WhatsApp and email channels','Hand-off to a human agent','Conversation analytics','Private and secure'],fr:['Réponses tirées de vos documents','Widget de chat pour votre site','Canaux WhatsApp et email','Relais vers un conseiller','Analyse des conversations','Privé et sécurisé']}, s:['Python','Vector DB','LLM API']},
  {id:'flow-automate', name:'Flow Automate', cat:'ai', type:'Web App', price:5900, weeks:'3–5', layout:'flow', hue:190,
   t:{en:'Automate repetitive work: forms, approvals, reports and data sync between your tools.',fr:'Automatisez les tâches répétitives : formulaires, validations, rapports et synchronisation.'},
   f:{en:['Visual workflow builder','Approval flows','Scheduled reports','Google and Microsoft connectors','Audit trail','Error alerts'],fr:['Éditeur visuel de workflows','Circuits de validation','Rapports planifiés','Connecteurs Google et Microsoft','Piste d’audit','Alertes d’erreur']}, s:['Node.js','Queues','REST APIs']},
  {id:'go-mobile', name:'Go Mobile Commerce', cat:'ecommerce', type:'Mobile App', price:15900, weeks:'8–12', layout:'mobile', hue:20,
   t:{en:'iOS and Android shopping app with push notifications and loyalty rewards.',fr:'Application d’achat iOS et Android avec notifications et programme de fidélité.'},
   f:{en:['iOS and Android, one codebase','Push notifications','Loyalty points','In-app payments','Order tracking','App Store publishing'],fr:['iOS et Android, un seul code','Notifications push','Points de fidélité','Paiements intégrés','Suivi de commande','Publication sur les stores']}, s:['React Native','Node.js','Firebase']},
  {id:'care-mobile', name:'CareLink Mobile', cat:'health', type:'Mobile App', price:13900, weeks:'8–10', layout:'mobile', hue:170,
   t:{en:'Patient app for bookings, reminders, results and secure messaging.',fr:'Application patient : rendez-vous, rappels, résultats et messagerie sécurisée.'},
   f:{en:['Appointment booking','Medication reminders','Lab results','Secure chat with doctors','Health records','Push notifications'],fr:['Prise de rendez-vous','Rappels de traitement','Résultats d’analyses','Messagerie sécurisée avec les médecins','Dossier de santé','Notifications push']}, s:['React Native','Node.js','PostgreSQL']},
  {id:'stay-hotel', name:'StayHub Hotel', cat:'hospitality', type:'Software', price:12900, weeks:'6–9', layout:'calendar', hue:35,
   t:{en:'Hotel booking engine and property management with channel sync.',fr:'Moteur de réservation hôtelier et gestion d’établissement avec synchronisation des canaux.'},
   f:{en:['Direct booking engine','Room and rate management','Front desk check-in','Housekeeping board','Channel manager sync','Revenue reports'],fr:['Moteur de réservation directe','Gestion des chambres et tarifs','Check-in à la réception','Tableau du ménage','Synchronisation channel manager','Rapports de revenus']}, s:['React','Node.js','PostgreSQL']},
  {id:'launch-landing', name:'Launch Landing Pro', cat:'corporate', type:'Website', price:1490, weeks:'1–2', layout:'site', hue:210,
   t:{en:'A single high-impact landing page for a product, event or campaign.',fr:'Une page d’atterrissage à fort impact pour un produit, un événement ou une campagne.'},
   f:{en:['Conversion-focused design','Lead capture form','Analytics and pixels','A/B test ready','Fast global hosting','Copywriting support'],fr:['Design orienté conversion','Formulaire de contact','Statistiques et pixels','Prêt pour l’A/B test','Hébergement mondial rapide','Aide à la rédaction']}, s:['Astro','Tailwind','Coolify']},
];
SAMPLE_SOL.forEach(s => { s.cover = `/img/sol-${s.id}.jpg`; s.shots = [...[1,2,3].map(k => `/img/shot-${s.id}-${k}.jpg`)]; });
export const BADGE = {Featured:{en:'Featured',fr:'Vedette'},Enterprise:{en:'Enterprise',fr:'Entreprise'},New:{en:'New',fr:'Nouveau'}};
// Portfolio: REPLACE with your real projects
export const WORK = [
  {name:{en:'Your flagship platform',fr:'Votre plateforme phare'}, url:'your-platform.com', type:'Web App', layout:'dash', hue:40, t:{en:'Placeholder. Add the biggest web app you have built and the result it delivered.',fr:'Exemple. Ajoutez votre plus grande application web et les résultats obtenus.'}},
  {name:{en:'Client corporate website',fr:'Site corporate client'}, url:'client-site.com', type:'Website', layout:'site', hue:210, t:{en:'Placeholder. Add a company website you designed and launched.',fr:'Exemple. Ajoutez un site d’entreprise que vous avez conçu et lancé.'}},
  {name:{en:'E-commerce store',fr:'Boutique en ligne'}, url:'client-store.com', type:'Website', layout:'shop', hue:20, t:{en:'Placeholder. Add an online store you built.',fr:'Exemple. Ajoutez une boutique en ligne que vous avez créée.'}},
  {name:{en:'Management software',fr:'Logiciel de gestion'}, url:'app.client.com', type:'Software', layout:'dash', hue:160, t:{en:'Placeholder. Add business software you delivered.',fr:'Exemple. Ajoutez un logiciel métier que vous avez livré.'}},
  {name:{en:'Booking application',fr:'Application de réservation'}, url:'book.client.com', type:'Web App', layout:'calendar', hue:195, t:{en:'Placeholder. Add a booking or scheduling app you built.',fr:'Exemple. Ajoutez une application de réservation.'}},
  {name:{en:'Learning platform',fr:'Plateforme de formation'}, url:'learn.client.com', type:'Web App', layout:'lms', hue:255, t:{en:'Placeholder. Add another project here.',fr:'Exemple. Ajoutez un autre projet ici.'}},
];
export const POSTS = [
  {id:'website-cost-2026', layout:'site', hue:40, cat:{en:'Business',fr:'Business'}, date:{en:'Oct 8, 2026',fr:'8 oct. 2026'}, read:'7 min',
   title:{en:'How much does a professional website cost in 2026?',fr:'Combien coûte un site web professionnel en 2026 ?'},
   ex:{en:'A clear breakdown of what you pay for, from a simple landing page to an enterprise platform, and how to avoid paying twice.',fr:'Ce que vous payez vraiment, de la simple landing page à la plateforme d’entreprise, et comment éviter de payer deux fois.'},
   body:{en:[['p','The price of a website depends on three things: how many unique page types it has, what it must do beyond showing information, and who maintains it after launch. Templates look cheap but often cost more once you add the features your business actually needs.'],['h','The four common budget levels'],['ul',['Landing page: one focused page for a product or campaign.','Business website: five to fifteen pages with a CMS, blog and lead forms.','E-commerce: catalogue, checkout, payments, stock and orders.','Web application: user accounts, dashboards and custom business logic.']],['h','How to get a reliable quote'],['p','Ask for a written scope with a fixed price, a list of deliverables and a timeline with milestones. If a provider cannot give you that after a discovery call, keep looking.']],
         fr:[['p','Le prix d’un site dépend de trois choses : le nombre de types de pages, ce qu’il doit faire au-delà d’informer, et qui l’entretient après le lancement. Les modèles semblent bon marché mais coûtent souvent plus cher une fois ajoutées les fonctions dont votre entreprise a besoin.'],['h','Les quatre niveaux de budget'],['ul',['Landing page : une page ciblée pour un produit ou une campagne.','Site d’entreprise : cinq à quinze pages avec CMS, blog et formulaires.','E-commerce : catalogue, paiement, stocks et commandes.','Application web : comptes utilisateurs, tableaux de bord et logique métier.']],['h','Obtenir un devis fiable'],['p','Demandez un périmètre écrit avec un prix fixe, la liste des livrables et un calendrier avec jalons. Si un prestataire ne peut pas vous le fournir après un appel découverte, cherchez ailleurs.']]}},
  {id:'web-app-vs-website', layout:'dash', hue:220, cat:{en:'Strategy',fr:'Stratégie'}, date:{en:'Sep 29, 2026',fr:'29 sept. 2026'}, read:'6 min',
   title:{en:'Website or web app? How to choose what your company needs',fr:'Site web ou application web ? Comment choisir'},
   ex:{en:'If your users log in, save data or complete tasks, you need a web app. Here is how to tell.',fr:'Si vos utilisateurs se connectent, enregistrent des données ou réalisent des tâches, il vous faut une application web.'},
   body:{en:[['p','A website informs. A web application lets people do something: book, buy, manage, track or collaborate. Many companies need both, connected.'],['h','Signs you need a web app'],['ul',['Customers or staff need their own accounts.','You repeat the same manual task every day in spreadsheets.','You need real-time data, dashboards or reports.','You want to charge a subscription for a digital service.']],['h','Start small, grow fast'],['p','The best web apps start with one core workflow done extremely well. Launch it, measure, then add features in short cycles.']],
         fr:[['p','Un site informe. Une application web permet d’agir : réserver, acheter, gérer, suivre ou collaborer. Beaucoup d’entreprises ont besoin des deux, connectés.'],['h','Les signes qu’il vous faut une application'],['ul',['Vos clients ou employés ont besoin de leur propre compte.','Vous répétez chaque jour la même tâche dans des tableurs.','Vous avez besoin de données en temps réel et de rapports.','Vous voulez vendre un service numérique par abonnement.']],['h','Commencer petit, grandir vite'],['p','Les meilleures applications commencent par un seul processus parfaitement maîtrisé. Lancez, mesurez, puis ajoutez des fonctions par cycles courts.']]}},
  {id:'speed-revenue', layout:'flow', hue:150, cat:{en:'Performance',fr:'Performance'}, date:{en:'Sep 17, 2026',fr:'17 sept. 2026'}, read:'5 min',
   title:{en:'Why page speed is a revenue metric',fr:'Pourquoi la vitesse d’un site est un indicateur de revenus'},
   ex:{en:'Slow pages lose visitors before they see your offer. What to measure and the fixes that matter most.',fr:'Les pages lentes perdent les visiteurs avant qu’ils voient votre offre. Quoi mesurer et quoi corriger.'},
   body:{en:[['p','Visitors decide in seconds whether to stay. Every extra second of loading on a phone gives them a reason to leave.'],['h','What to measure'],['ul',['Largest Contentful Paint: when the main content appears.','Interaction to Next Paint: how fast the page reacts to taps.','Cumulative Layout Shift: whether things jump around while loading.']],['h','The fixes that matter most'],['p','Modern image formats, less third-party script, server-side rendering and a global CDN fix most slow sites.']],
         fr:[['p','Les visiteurs décident en quelques secondes s’ils restent. Chaque seconde de chargement en plus sur mobile leur donne une raison de partir.'],['h','Quoi mesurer'],['ul',['Largest Contentful Paint : quand le contenu principal apparaît.','Interaction to Next Paint : la réactivité aux interactions.','Cumulative Layout Shift : la stabilité de la page au chargement.']],['h','Les corrections qui comptent'],['p','Formats d’image modernes, moins de scripts tiers, rendu côté serveur et CDN mondial corrigent la plupart des sites lents.']]}},
  {id:'ai-for-smes', layout:'chat', hue:280, cat:{en:'AI',fr:'IA'}, date:{en:'Sep 3, 2026',fr:'3 sept. 2026'}, read:'6 min',
   title:{en:'Five practical ways small companies can use AI today',fr:'Cinq usages concrets de l’IA pour les PME dès aujourd’hui'},
   ex:{en:'No hype: five automations that save hours every week, from customer support to invoice processing.',fr:'Sans effet de mode : cinq automatisations qui font gagner des heures chaque semaine.'},
   body:{en:[['p','AI is most useful when it removes repetitive work your team already does. Start there.'],['ul',['A support assistant that answers from your own documents.','Automatic extraction of data from invoices and forms.','Drafting quotes, emails and product descriptions.','Summarising meetings into action items.','Routing incoming requests to the right person.']],['h','Keep a human in the loop'],['p','Let AI draft and sort, and let people approve. You get the speed without the risk.']],
         fr:[['p','L’IA est la plus utile quand elle supprime le travail répétitif que votre équipe fait déjà. Commencez par là.'],['ul',['Un assistant qui répond à partir de vos documents.','L’extraction automatique des données de factures et formulaires.','La rédaction de devis, emails et fiches produits.','Le résumé des réunions en actions.','Le routage des demandes vers la bonne personne.']],['h','Garder un humain dans la boucle'],['p','Laissez l’IA rédiger et trier, et les personnes valider. Vous gagnez la vitesse sans le risque.']]}},
  {id:'secure-by-default', layout:'dash', hue:175, cat:{en:'Security',fr:'Sécurité'}, date:{en:'Aug 21, 2026',fr:'21 août 2026'}, read:'8 min',
   title:{en:'Secure by default: the checklist we apply to every project',fr:'Sécurisé par défaut : notre check-list pour chaque projet'},
   ex:{en:'HTTPS is only the start. The security baseline every business website and app should meet.',fr:'Le HTTPS n’est qu’un début. Le socle de sécurité que tout site et application devrait respecter.'},
   body:{en:[['p','Most attacks on companies exploit missing basics. Getting the basics right blocks the vast majority of them.'],['ul',['HTTPS everywhere and secure headers.','Strong authentication with optional two-factor login.','Role-based access.','Encrypted backups, tested regularly.','Dependency updates on a schedule.','Logging and alerts for suspicious activity.']],['h','Security is a process'],['p','A site that was secure at launch is not secure forever. Ongoing care keeps it that way.']],
         fr:[['p','La plupart des attaques exploitent des bases manquantes. Les maîtriser bloque l’immense majorité d’entre elles.'],['ul',['HTTPS partout et en-têtes sécurisés.','Authentification forte avec double facteur.','Accès par rôles.','Sauvegardes chiffrées et testées.','Mises à jour planifiées des dépendances.','Journaux et alertes en cas d’activité suspecte.']],['h','La sécurité est un processus'],['p','Un site sûr au lancement ne l’est pas pour toujours. C’est le suivi continu qui le garde sûr.']]}},
  {id:'ecommerce-launch', layout:'shop', hue:28, cat:{en:'E-commerce',fr:'E-commerce'}, date:{en:'Aug 6, 2026',fr:'6 août 2026'}, read:'7 min',
   title:{en:'Launching an online store: the 30-day plan',fr:'Lancer une boutique en ligne : le plan en 30 jours'},
   ex:{en:'From product photos to first sale: a week-by-week plan to launch your store properly.',fr:'Des photos produits à la première vente : un plan semaine par semaine.'},
   body:{en:[['h','Week 1: foundations'],['p','Choose your platform, payment methods and shipping rules. Prepare product data and photos.'],['h','Week 2: design and catalogue'],['p','Build your brand pages and product templates, then import your catalogue.'],['h','Week 3: checkout and testing'],['p','Test payments, emails, taxes and stock end to end on phones and desktops.'],['h','Week 4: launch and promote'],['p','Go live, connect analytics and run your first campaign.']],
         fr:[['h','Semaine 1 : les fondations'],['p','Choisissez la plateforme, les moyens de paiement et la livraison. Préparez les fiches et photos produits.'],['h','Semaine 2 : design et catalogue'],['p','Créez les pages de marque et les modèles produits, puis importez le catalogue.'],['h','Semaine 3 : paiement et tests'],['p','Testez paiements, emails, taxes et stocks de bout en bout sur mobile et ordinateur.'],['h','Semaine 4 : lancement'],['p','Mettez en ligne, connectez les statistiques et lancez votre première campagne.']]}},
];
export const SERVICES = [
  ['pen',300,{en:'UI/UX & Brand Design',fr:'Design UI/UX et identité'},{en:'Interfaces people love to use, built on research and your brand. From logo and identity to complete design systems.',fr:'Des interfaces que l’on aime utiliser, fondées sur la recherche et votre marque. Du logo au design system complet.'},{en:['User research','Wireframes and prototypes','Design systems','Logo and brand identity'],fr:['Recherche utilisateur','Maquettes et prototypes','Design systems','Logo et identité de marque']}],
  ['web',40,{en:'Website Development',fr:'Création de sites web'},{en:'Corporate websites, landing pages and portals that load fast, rank well and turn visitors into customers.',fr:'Sites corporate, landing pages et portails rapides, bien référencés, qui transforment les visiteurs en clients.'},{en:['Corporate and business sites','Landing pages','CMS you can edit','SEO and analytics'],fr:['Sites corporate et vitrines','Landing pages','CMS modifiable','SEO et statistiques']}],
  ['code',220,{en:'Custom Web Applications',fr:'Applications web sur mesure'},{en:'Platforms built around your business: dashboards, portals, marketplaces and SaaS products.',fr:'Des plateformes pensées pour votre activité : tableaux de bord, portails, marketplaces et SaaS.'},{en:['SaaS products','Client and partner portals','Marketplaces','APIs and integrations'],fr:['Produits SaaS','Portails clients et partenaires','Marketplaces','API et intégrations']}],
  ['erp',160,{en:'Business Software',fr:'Logiciels métier'},{en:'ERP, CRM, inventory, HR and accounting systems that replace spreadsheets and connect your teams.',fr:'ERP, CRM, stocks, RH et comptabilité qui remplacent les tableurs et relient vos équipes.'},{en:['ERP and CRM','Inventory and stock','HR and payroll','Reporting and BI'],fr:['ERP et CRM','Stocks et inventaire','RH et paie','Reporting et BI']}],
  ['mobile',20,{en:'Mobile Apps',fr:'Applications mobiles'},{en:'iOS and Android apps from one codebase, published on the stores and connected to your platform.',fr:'Des applications iOS et Android avec un seul code, publiées sur les stores et reliées à votre plateforme.'},{en:['iOS and Android','Push notifications','Offline mode','Store publishing'],fr:['iOS et Android','Notifications push','Mode hors ligne','Publication sur les stores']}],
  ['ai',280,{en:'AI & Automation',fr:'IA et automatisation'},{en:'AI assistants, document processing and workflow automation that save your team hours every week.',fr:'Assistants IA, traitement de documents et automatisation qui font gagner des heures chaque semaine.'},{en:['AI chat assistants','Document AI','Workflow automation','Data pipelines'],fr:['Assistants conversationnels','IA documentaire','Automatisation des processus','Pipelines de données']}],
  ['cloud',195,{en:'Cloud, Hosting & DevOps',fr:'Cloud, hébergement et DevOps'},{en:'Secure, scalable infrastructure with monitoring, backups and automated deployments.',fr:'Une infrastructure sûre et évolutive avec supervision, sauvegardes et déploiements automatisés.'},{en:['Managed hosting','CI/CD pipelines','Monitoring and backups','Cloud migration'],fr:['Hébergement géré','Pipelines CI/CD','Supervision et sauvegardes','Migration cloud']}],
  ['shield',145,{en:'Maintenance & Security',fr:'Maintenance et sécurité'},{en:'Care plans that keep your platforms fast, safe and up to date, with a team on call.',fr:'Des formules qui gardent vos plateformes rapides, sûres et à jour, avec une équipe disponible.'},{en:['Security updates','Performance tuning','Uptime monitoring','Monthly improvements'],fr:['Mises à jour de sécurité','Optimisation des performances','Surveillance de disponibilité','Améliorations mensuelles']}],
];
export const TYPES = ['all','Website','Web App','Software','Mobile App'];

// ---------- Helpers ----------
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const LL = o => (o && (o[lang] || o.en || o.fr)) || '';
export const tt = (en, fr) => lang === 'fr' ? fr : en;
export const safeUrl = u => { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch(e) { return ''; } };
export const safeImg = u => { u = String(u || '').replace(/^img\//, '/img/'); return /^(\/_blob\/[A-Za-z0-9_-]+|\/?uploads\/[A-Za-z0-9._-]+|\/?img\/[a-z0-9-]+\.(jpg|png|webp)|data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|https:\/\/[^"'\s<>()]+)$/.test(u) ? u : ''; };
export const host = u => { try { return new URL(safeUrl(u)).host.replace(/^www\./, ''); } catch(e) { return ''; } };
export const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const paras = s => String(s || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
export const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);

export const safeVid = u => { u = String(u || ''); return /^(\/_blob\/[A-Za-z0-9_-]+|\/?uploads\/[A-Za-z0-9._-]+\.(mp4|webm))$/.test(u) ? u : ''; };
export function embedUrl(u){
  u = safeUrl(u); if (!u) return ''; let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/))) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0';
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1];
  return '';
}
export const hasVid = p => !!(p && (p.video || p.embed));
export const fmtDur = s => s ? Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0') : '';
export function playerHtml(p){
  if (p.video) return `<video controls preload="metadata" playsinline${p.cover ? ` poster="${esc(p.cover)}"` : ''} src="${esc(p.video)}"></video>`;
  if (p.embed) return `<iframe src="${esc(p.embed)}" title="${tt('Video presentation', 'Présentation vidéo')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
  return '';
}
export const vBadge = p => hasVid(p) ? `<span class="vbadge">▶ ${tt('Video', 'Vidéo')}${p.videoDur ? ' · ' + fmtDur(p.videoDur) : ''}</span>` : '';
export const money = n => lang==='fr' ? n.toLocaleString('fr-FR').replace(/\s/g,' ') + ' $' : '$' + n.toLocaleString('en-US');
export const catOf = id => CATS.find(c => c.id === id);
export const catName = id => L(catOf(id)?.name) || '';
export const cv = (layout, hue) => `<canvas data-layout="${layout}" data-hue="${hue}" aria-hidden="true"></canvas>`;
export const SAMPLE_IDS = new Set(SAMPLE_SOL.map(s => s.id));
export const sampleDoc = s => ({id: s.id, name: s.name, cat: s.cat, type: s.type, price: s.price, weeks: s.weeks, badge: s.badge || '', t: {...s.t}, f: {en: [...s.f.en], fr: [...s.f.fr]}, s: [...s.s], shots: [...(s.shots || [])], cover: s.cover || '', demo: '', createdAt: 0});
export function normProject(d){
  const shots = (Array.isArray(d.shots) ? d.shots : []).map(safeImg).filter(Boolean);
  return { id: String(d.id), title: {en: d.title?.en || '', fr: d.title?.fr || ''}, client: d.client || '', url: d.url || '', year: d.year || '',
    type: UI.types[d.type] ? d.type : 'Website', cat: catOf(d.cat) ? d.cat : 'corporate',
    summary: {en: d.summary?.en || '', fr: d.summary?.fr || ''}, body: {en: d.body?.en || '', fr: d.body?.fr || ''},
    stack: Array.isArray(d.stack) ? d.stack.map(String) : [], shots, cover: safeImg(d.cover) || shots[0] || '', featured: !!d.featured, createdAt: +d.createdAt || 0,
    video: safeVid(d.video), videoUrl: d.videoUrl || '', embed: embedUrl(d.videoUrl), videoDur: +d.videoDur || 0 };
}
export function normSol(d){
  const c = catOf(d.cat) || CATS[0], shots = (Array.isArray(d.shots) ? d.shots : []).map(safeImg).filter(Boolean), base = SAMPLE_SOL.find(x => x.id === String(d.id));
  return { id: String(d.id), custom: !base, sample: !!base, edited: !!base, video: safeVid(d.video), videoUrl: d.videoUrl || '', embed: embedUrl(d.videoUrl), videoDur: +d.videoDur || 0, name: d.name || 'Untitled', cat: c.id, type: UI.types[d.type] ? d.type : 'Web App', price: Math.max(0, +d.price || 0), weeks: d.weeks || '4–6',
    layout: base ? base.layout : 'dash', hue: base && base.cat === c.id ? base.hue : c.hue, badge: BADGE[d.badge] ? d.badge : '', t: {en: d.t?.en || '', fr: d.t?.fr || ''},
    f: {en: Array.isArray(d.f?.en) ? d.f.en : [], fr: Array.isArray(d.f?.fr) && d.f.fr.length ? d.f.fr : (Array.isArray(d.f?.en) ? d.f.en : [])},
    s: Array.isArray(d.s) ? d.s.map(String) : [], shots, cover: safeImg(d.cover) || shots[0] || '', demo: d.demo || '', createdAt: +d.createdAt || 0 };
}

// ---------- Content state ----------
// DATA is what the admin saves (content.json): {projects, solutions, settings}.
export let S = {SOL: SAMPLE_SOL, PROJECTS: [], settings: {}};
export const state = () => S;
export function buildState(DATA){
  DATA = {projects: [], solutions: [], settings: {}, ...(DATA || {})};
  const ov = new Map(DATA.solutions.map(d => [String(d.id), d])), hidden = new Set(DATA.settings.hiddenSamples || []);
  const samples = DATA.settings.hideSamples ? [] : SAMPLE_SOL.filter(x => !hidden.has(x.id)).map(x => ov.has(x.id) ? normSol({...sampleDoc(x), ...ov.get(x.id)}) : x);
  const SOL = [...DATA.solutions.filter(d => !SAMPLE_IDS.has(String(d.id))).map(normSol).sort((a, b) => b.createdAt - a.createdAt), ...samples];
  const PROJECTS = DATA.projects.map(normProject).sort((a, b) => (b.featured - a.featured) || (b.createdAt - a.createdAt));
  return {SOL, PROJECTS, settings: DATA.settings || {}};
}
export const useState = st => { S = st; };
export const catImg = c => safeImg(S.settings.catImg?.[c.id]) || `/img/${c.id}.jpg`;

// ---------- Addresses ----------
// Pages live at /en/... and /fr/... . Templates write short "#route" links; fixLinks turns them into real addresses.
export function R(k, l = lang){
  const p = `/${l}/`, m = /^(s|cat|p|post|demo)-(.+)$/.exec(k);
  if (m) return p + {s: 'solution/', cat: 'solutions/', p: 'work/', post: 'blog/', demo: 'demo/'}[m[1]] + encodeURIComponent(m[2]) + '/';
  return k === 'home' || !k ? p : p + k + '/';
}
export const fixLinks = (html, l = lang) => String(html)
  .replace(/(href|action)="#(home|solutions|services|work|about|blog|contact|admin|addons|support)"/g, (m, a, k) => `${a}="${R(k, l)}"`)
  .replace(/(href|action)="#(s|cat|p|post|demo)-([A-Za-z0-9_-]+)"/g, (m, a, k, id) => `${a}="${R(k + '-' + id, l)}"`);
// Removes the other language's <span class="en|fr"> blocks so each page holds one language only.
export function stripLang(html, l){
  const open = `<span class="${l === 'fr' ? 'en' : 'fr'}">`;
  let out = '', i = 0;
  for (;;){
    const j = html.indexOf(open, i); if (j < 0){ out += html.slice(i); break; }
    out += html.slice(i, j);
    let depth = 1, k = j + open.length;
    while (depth){
      const o = html.indexOf('<span', k), c = html.indexOf('</span>', k);
      if (c < 0){ k = html.length; break; }
      if (o >= 0 && o < c){ depth++; k = o + 5; } else { depth--; k = c + 7; }
    }
    i = k;
  }
  return out;
}
// Puts server-rendered HTML inside empty containers: <div id="x"></div>.
export function fillIds(html, map){
  for (const [id, inner] of Object.entries(map)){
    const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\sid="${id}"[^>]*>)(</\\2>)`);
    if (!re.test(html)) throw new Error('fillIds: no empty #' + id);
    html = html.replace(re, (m, a, tag, b) => a + inner + b);
  }
  return html;
}


// ---------- Templates ----------
export function prodCard(p){
  const d = demoLink(p);
  return `<article class="prod"><a class="prod-a" href="#s-${p.id}" aria-label="${esc(p.name)}"></a>
    <div class="pv">${shotHtml(p.cover,p.layout,p.hue)}${vBadge(p)}${p.badge?`<span class="badge${p.badge==='New'?' alt':''}">${L(BADGE[p.badge])}</span>`:''}<span class="btn gold sm hover-cta">${t('view')}</span></div>
    <div class="pb"><div class="meta"><span>${L(UI.types[p.type])}</span><span>${catName(p.cat)}</span></div><h3>${esc(p.name)}</h3><p>${esc(LL(p.t))}</p>
    <div class="pf"><div class="price"><small>${tt('Price', 'Prix')}</small>${tt('Very affordable', 'Très abordable')}</div><div class="wk">${t('delivery')}<br>${p.weeks} ${t('weeks')}</div></div>
    ${d ? `<div class="pacts"><a class="btn sm demo-btn" href="${d.href}"${d.ext ? ' target="_blank" rel="noopener"' : ''}>${icon('play', 16)} ${tt('Live demo', 'Démo en direct')}</a><span class="btn sm gold">${tt('Details', 'Détails')} →</span></div>` : ''}</div></article>`;
}
export function workCard(w){
  return `<div class="prod"><div class="pv">${cv(w.layout,w.hue)}<span class="badge alt">${t('add')}</span></div>
    <div class="pb"><div class="meta"><span>${L(UI.types[w.type])}</span><span>${w.url}</span></div><h3>${L(w.name)}</h3><p>${L(w.t)}</p></div></div>`;
}
export function postCard(p){
  return `<a class="post" href="#post-${p.id}"><div class="thumb"><img src="/img/post-${p.id}.jpg" alt="" loading="lazy"></div><div class="pm"><b>${L(p.cat)}</b><span>${L(p.date)}</span><span>${p.read}</span></div><h3>${L(p.title)}</h3><p>${L(p.ex)}</p></a>`;
}
export const opts = arr => arr.map(x => Array.isArray(x) ? `<option value="${x[0]}">${x[1]}</option>` : `<option>${x}</option>`).join('');
export const tabsHtml = (items, cur) => items.map(([k,label]) => `<button role="tab" type="button" data-t="${k}" aria-selected="${k===cur}">${label}</button>`).join('');
export const shotHtml = (img, layout, hue) => img ? `<img src="${esc(img)}" alt="" loading="lazy">` : cv(layout, hue);
export function bframe(url, img, hue, inner, badge){ return `<div class="bframe"><div class="bar"><i></i><i></i><i></i><span>${esc(host(url) || 'teknons.com')}</span></div><div class="scr">${inner || shotHtml(img, 'site', hue)}${badge || ''}</div></div>`; }
export function wkCard(p, lead){
  return `<a class="wk-card${lead ? ' lead' : ''}" href="#p-${esc(p.id)}">${bframe(p.url, p.cover, catOf(p.cat).hue, '', vBadge(p))}
    <div class="info"><div><div class="meta">${L(UI.types[p.type])} · ${catName(p.cat)}${p.year ? ' · ' + esc(p.year) : ''}</div><h3>${esc(LL(p.title))}</h3>${LL(p.summary) ? `<p>${esc(LL(p.summary))}</p>` : ''}</div><span class="go">${icon('arrow', 20)}</span></div></a>`;
}
export function wkPlaceholder(w, lead){
  return `<div class="wk-card${lead ? ' lead' : ''}"><span class="badge alt ph-badge">${t('add')}</span><div class="bframe"><div class="bar"><i></i><i></i><i></i><span>${w.url}</span></div><div class="scr">${cv(w.layout, w.hue)}</div></div>
    <div class="info"><div><div class="meta">${L(UI.types[w.type])}</div><h3>${L(w.name)}</h3><p>${L(w.t)}</p></div></div></div>`;
}

// ---------- Page sections ----------
export const typeTabs = () => Object.keys(UI.typesPl).map(k => [k, L(UI.typesPl[k])]);
export const megaHtml = () => `<h5>${t('megaH')}</h5>` + CATS.map(c => `<a class="mi" href="#cat-${c.id}">${icon(c.id,20)}${L(c.name)}<span>${S.SOL.filter(s=>s.cat===c.id).length}</span></a>`).join('') +
  `<div class="feat"><span class="eyebrow" style="color:var(--gold)">${t('megaF')}</span><h4>Orbit SaaS Starter</h4><p>${t('megaP')}</p><a class="btn gold sm" href="#s-orbit-saas" style="margin-top:auto">${t('discover')}</a></div>`;
export const catGridHtml = () => CATS.map((c,i) => `<a class="cat${i===0?' big':i===5?' wide':''}" href="#cat-${c.id}"><div class="bgimg" style="background-image:url('${esc(catImg(c))}')"></div><div class="ic">${icon(c.id)}</div><div class="ct"><h3>${L(c.name)}</h3><p>${L(c.d)}</p><span class="n">${S.SOL.filter(s=>s.cat===c.id).length} ${t('solN')}<i>${icon('arrow',16)}</i></span></div></a>`).join('');
export function statsHtml(){
  const rows = [[5, '', tt('Years of experience', 'Ans d’expérience')], [25, '+', tt('Websites delivered', 'Sites web livrés')], [6, '', tt('Mobile apps launched', 'Applications mobiles lancées')], [S.SOL.length, '', tt('Ready-to-launch solutions', 'Solutions prêtes à lancer')]];
  return rows.map(([n, suf, l]) => `<div><b data-n="${n}" data-s="${suf}">${n}${suf}</b><span>${l}</span></div>`).join('');
}
export const indIconsHtml = () => CATS.map(c => `<a href="#cat-${c.id}" title="${L(c.name)}" style="--h:${c.hue}">${icon(c.id,20)}</a>`).join('');
export const fCatsHtml = () => CATS.slice(0,6).map(c => `<li><a href="#cat-${c.id}">${L(c.name)}</a></li>`).join('');
export const popularHtml = () => `<small>${t('popular')}</small>` + t('pop').map((x,i) => `<button class="chip" type="button" data-q="${UI.pop.en[i]}">${x}</button>`).join('');
export const TECH = ['React','Next.js','Node.js','TypeScript','Python','Laravel','React Native','Flutter','PostgreSQL','AWS','Docker','Coolify','Stripe','OpenAI'];
export const marqueeHtml = () => [...TECH,...TECH].map(x => `<span>${x}</span>`).join('');
export const homeTabsHtml = cur => tabsHtml([['all',t('all')], ...typeTabs()], cur);
export const workTabsHtml = cur => tabsHtml([['all',t('allWork')], ...typeTabs()], cur);
export const homeProductsHtml = tab => S.SOL.filter(s => tab==='all' ? s.badge : s.type===tab).slice(0,6).map(prodCard).join('');
export function workGridHtml(tab){
  const real = S.PROJECTS.length > 0, list = (real ? S.PROJECTS : WORK).filter(w => tab==='all' || w.type===tab);
  return list.length ? list.map(w => real ? wkCard(w) : wkPlaceholder(w)).join('') : `<div class="empty">${t('empty')}</div>`;
}
export function homeShowcaseHtml(){
  const real = S.PROJECTS.length > 0, items = real ? S.PROJECTS.slice(0, 3) : WORK.slice(0, 3), card = real ? wkCard : wkPlaceholder;
  return card(items[0], true) + (items.length > 1 ? `<div class="col">${items.slice(1).map(x => card(x)).join('')}</div>` : '');
}
export const svcListHtml = () => SERVICES.map(([ic,hue,h,p,l],k) => `<div class="svc-row"><div class="svc-img"><img src="/img/svc-${k}.jpg" alt="" loading="lazy"><span class="ic" style="background:linear-gradient(135deg,hsl(${hue} 70% 45%),hsl(${hue+25} 75% 28%))">${icon(ic,24)}</span></div><div><h3>${L(h)}</h3><p>${L(p)}</p></div><ul>${L(l).map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('');

// Solutions hub: hub = {q, type, cat, sort}
export function hubList(hub){
  const terms = String(hub.q || '').toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const list = S.SOL.filter(s => (hub.type==='all'||s.type===hub.type) && (hub.cat==='all'||s.cat===hub.cat) &&
    (!terms.length || terms.some(k => [s.name, s.t.en, s.t.fr, catOf(s.cat).name.en, catOf(s.cat).name.fr, s.type, ...s.f.en, ...s.f.fr].join(' ').toLowerCase().includes(k.slice(0,5)))));
  if (hub.sort==='low') list.sort((a,b)=>a.price-b.price);
  if (hub.sort==='high') list.sort((a,b)=>b.price-a.price);
  if (hub.sort==='fast') list.sort((a,b)=>parseInt(a.weeks)-parseInt(b.weeks));
  if (hub.sort==='featured') list.sort((a,b)=>(!!b.badge)-(!!a.badge));
  return list;
}
export function hubParts(hub){
  const list = hubList(hub);
  return {
    typeOpts: TYPES.map(k => `<button class="opt" type="button" data-type="${k}" aria-pressed="${hub.type===k}">${k==='all'?t('allTypes'):L(UI.typesPl[k])}<span>${S.SOL.filter(s=>k==='all'||s.type===k).length}</span></button>`).join(''),
    catOpts: [{id:'all',name:UI.allInd},...CATS].map(c => `<button class="opt" type="button" data-cat="${c.id}" aria-pressed="${hub.cat===c.id}">${L(c.name)}<span>${S.SOL.filter(s=>c.id==='all'||s.cat===c.id).length}</span></button>`).join(''),
    count: L(UI.count)(list.length) + (hub.cat!=='all' ? t('inCat') + catName(hub.cat) : ''),
    grid: list.length ? list.map(prodCard).join('') : `<div class="empty"><h3 style="font-size:24px">${t('empty')}</h3><p style="margin-top:10px">${t('emptyP')} <a class="link-arrow" href="#contact">${t('describe')}</a></p></div>`,
    sort: t('sort').map(([v, l]) => `<option value="${v}"${v === hub.sort ? ' selected' : ''}>${l}</option>`).join(''),
  };
}

export function detailHtml(p){
  const rel = S.SOL.filter(s => s.id!==p.id && (s.cat===p.cat || s.type===p.type)).slice(0,3);
  const gs = (p.shots || []).filter(x => hasVid(p) || x !== p.cover);
  return `
    <div class="crumbs" style="margin-bottom:22px"><a href="#home">${t('home')}</a> / <a href="#solutions">Solutions</a> / <a href="#cat-${p.cat}">${catName(p.cat)}</a> / ${esc(p.name)}</div>
    <div class="detail">
      <div>
        <div class="shot">${hasVid(p) ? playerHtml(p) : shotHtml(p.cover,p.layout,p.hue)}</div>
        ${gs.length ? `<h3 class="gal-h">${tt('Screenshots', 'Captures d’écran')} <small>${gs.length}</small></h3><div class="gallery g3" data-gallery="${esc(p.id)}">${gs.map((x,i)=>`<button type="button" data-lb="${i}" aria-label="${tt('Screenshot', 'Capture')} ${i+1}"><img src="${esc(x)}" alt="${esc(p.name)} · ${tt('screenshot', 'capture')} ${i+1}" loading="lazy"></button>`).join('')}</div>` : ''}
        <div class="dsec"><span class="eyebrow">${L(UI.types[p.type])} · ${catName(p.cat)}</span><h1 style="font-size:clamp(34px,4.6vw,58px);font-weight:800">${esc(p.name)}</h1><p class="muted" style="font-size:19px;max-width:60ch">${esc(LL(p.t))}</p></div>
        <div class="dsec"><h3>${t('feats')}</h3><ul class="feat-list">${L(p.f).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="dsec"><h3>${t('incl')}</h3><ul class="feat-list">${t('inclList').map(x=>`<li>${x}</li>`).join('')}</ul></div>
        <div class="dsec"><h3>${t('tech')}</h3>${p.s.length?`<div class="stack-tags">${p.s.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div>
      </div>
      <aside class="buybox">
        <span class="mono" style="font-size:12px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase">${tt('Price', 'Prix')}</span>
        <div class="price gold-text">${tt('Very affordable', 'Très abordable')}</div>
        <p class="muted" style="font-size:14px">${tt('Free quote within 24 hours. Pay in instalments or monthly.', 'Devis gratuit sous 24 h. Paiement en plusieurs fois ou mensuel.')}</p>
        <dl class="kv"><dt>${t('type')}</dt><dd>${L(UI.types[p.type])}</dd><dt>${t('industry')}</dt><dd>${catName(p.cat)}</dd><dt>${t('delivery')}</dt><dd>${esc(p.weeks)} ${t('weeks')}</dd><dt>${t('own')}</dt><dd>${t('ownV')}</dd></dl>
        <a class="btn gold" href="${R('contact')}?solution=${encodeURIComponent(p.name)}">${t('req')}</a>
        ${demoLink(p) ? `<a class="btn" href="${demoLink(p).href}"${demoLink(p).ext ? ' target="_blank" rel="noopener"' : ''}>${icon('play', 18)} ${tt('View live demo', 'Voir la démo en direct')}</a>` : ''}
        <a class="btn" href="#contact">${t('demo')}</a>
        <p class="muted" style="font-size:13.5px">${t('fine')}</p>
      </aside>
    </div>
    ${rel.length?`<div class="dsec" style="margin-top:80px"><h3>${t('also')}</h3><div class="pgrid">${rel.map(prodCard).join('')}</div></div>`:''}`;
}

export const postCats = () => [...new Set(POSTS.map(p => p.cat.en))];
export function blogParts(cat){
  const list = POSTS.filter(p => cat==='all' || p.cat.en===cat), [f, ...rest] = list;
  return {
    cats: [['all',t('all')], ...postCats().map(c => [c, L(POSTS.find(p=>p.cat.en===c).cat)])].map(([k,l]) => `<button class="chip" type="button" data-bc="${k}" aria-pressed="${k===cat}">${l}</button>`).join(''),
    featured: f ? `<a class="post featured-post" href="#post-${f.id}"><div class="thumb"><img src="/img/post-${f.id}.jpg" alt=""></div><div style="display:flex;flex-direction:column;gap:14px"><div class="pm"><b>${L(f.cat)}</b><span>${L(f.date)}</span><span>${f.read}</span></div><h3>${L(f.title)}</h3><p>${L(f.ex)}</p><span class="link-arrow">${t('read')}</span></div></a>` : '',
    grid: rest.map(postCard).join(''),
  };
}
export function postHtml(p){
  const body = L(p.body).map(([k,v]) => k==='h' ? `<h3>${v}</h3>` : k==='ul' ? `<ul>${v.map(i=>`<li>${i}</li>`).join('')}</ul>` : `<p>${v}</p>`).join('');
  const more = POSTS.filter(x => x.id!==p.id).slice(0,3);
  return `<div class="crumbs"><a href="#home">${t('home')}</a> / <a href="#blog">Blog</a> / ${L(p.cat)}</div>
    <div class="mono" style="margin-top:28px;display:flex;gap:14px;font-size:12px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase;flex-wrap:wrap"><b style="color:var(--accent);font-weight:500">${L(p.cat)}</b><span>${L(p.date)}</span><span>${p.read} ${t('readT')}</span></div>
    <h1 style="font-size:clamp(34px,5vw,58px);font-weight:800;margin-top:16px">${L(p.title)}</h1>
    <p class="muted" style="font-size:20px;margin-top:18px">${L(p.ex)}</p>
    <div class="cover"><img src="/img/post-${p.id}.jpg" alt="${esc(L(p.title))}"></div>
    <div class="body">${body}</div>
    <div class="inline-cta b-gold cta-band"><div><h2 style="font-size:32px">${t('ctaH')}</h2><p>${t('ctaP')}</p></div><div class="actions"><a class="btn dark" href="#contact">${t('ctaB')}</a></div></div>
    <div style="margin-top:64px"><h3 style="font-size:24px;margin-bottom:24px">${t('keep')}</h3><div class="bgrid">${more.map(postCard).join('')}</div></div>`;
}
export function projectHtml(p){
  const url = safeUrl(p.url), hue = catOf(p.cat).hue, more = S.PROJECTS.filter(x => x.id !== p.id).slice(0, 2);
  const hero = `<div class="crumbs"><a href="#home">${t('home')}</a> / <a href="#work">${tt('Portfolio', 'Réalisations')}</a> / ${esc(LL(p.title))}</div>
    <span class="eyebrow" style="margin-top:22px">${L(UI.types[p.type])} · ${catName(p.cat)}${p.year ? ' · ' + esc(p.year) : ''}</span>
    <h1>${esc(LL(p.title))}</h1>${LL(p.summary) ? `<p class="lede">${esc(LL(p.summary))}</p>` : ''}
    <div class="acts">${url ? `<a class="btn gold" href="${esc(url)}" target="_blank" rel="noopener">${tt('Visit the live site', 'Voir le site en ligne')} ↗</a>` : ''}<a class="btn" href="#contact">${tt('Start a similar project', 'Lancer un projet similaire')}</a></div>
    ${bframe(p.url, p.cover, hue, playerHtml(p))}`;
  const text = paras(LL(p.body)).map(x => `<p>${esc(x)}</p>`).join('');
  const body = `<div class="pj-grid">
      <div>${text ? `<h2 style="font-size:clamp(28px,3vw,40px)">${tt('About the project', 'Le projet')}</h2><div class="prose" style="margin-top:20px">${text}</div>` : ''}
        ${p.shots.length ? `<h3 style="font-size:24px;margin-top:${text ? 48 : 0}px">${tt('Screenshots', 'Captures d’écran')}</h3><div class="gallery" data-gallery="${esc(p.id)}">${p.shots.map((s, i) => `<button type="button" data-lb="${i}" aria-label="${tt('Open screenshot', 'Ouvrir la capture')} ${i + 1}"><img src="${esc(s)}" alt="${esc(LL(p.title))} · ${i + 1}" loading="lazy"></button>`).join('')}</div>` : ''}</div>
      <aside class="pj-facts"><dl class="kv">${p.client ? `<dt>${tt('Client', 'Client')}</dt><dd>${esc(p.client)}</dd>` : ''}${p.year ? `<dt>${tt('Year', 'Année')}</dt><dd>${esc(p.year)}</dd>` : ''}<dt>${t('type')}</dt><dd>${L(UI.types[p.type])}</dd><dt>${t('industry')}</dt><dd>${catName(p.cat)}</dd>${url ? `<dt>${tt('Website', 'Site')}</dt><dd><a class="link-arrow" href="${esc(url)}" target="_blank" rel="noopener">${esc(host(url))} ↗</a></dd>` : ''}</dl>
        ${p.stack.length ? `<h4 style="font:500 11px var(--f-mono);letter-spacing:.2em;text-transform:uppercase;color:var(--dim);margin:24px 0 10px">${t('tech')}</h4><div class="stack-tags">${p.stack.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        <a class="btn gold" href="#contact" style="width:100%;margin-top:24px">${tt('Get a quote', 'Obtenir un devis')}</a></aside>
    </div>
    ${more.length ? `<div style="margin-top:80px"><h3 style="font-size:28px;margin-bottom:24px">${tt('More projects', 'Autres réalisations')}</h3><div class="wgrid">${more.map(x => wkCard(x)).join('')}</div></div>` : ''}`;
  return {hero, body};
}

// Contact form options
export const optionsHtml = (k, sel) => t(k).map((x, i) => Array.isArray(x) ? `<option value="${x[0]}"${i === sel ? ' selected' : ''}>${x[1]}</option>` : `<option${i === sel ? ' selected' : ''}>${x}</option>`).join('');
export const solutionOptsHtml = want => `<option value="">${t('notSure')}</option>` + S.SOL.map(s => `<option${s.name === want ? ' selected' : ''}>${esc(s.name)}</option>`).join('');

// ---------- Video slider ----------
export const DEF_SLIDES = [
  {id: 'code', video: '/img/slide-code.mp4', poster: '/img/poster-code.jpg', label: {en: 'Engineering', fr: 'Ingénierie'},
   eyebrow: {en: 'Custom software engineering', fr: 'Ingénierie logicielle sur mesure'}, title: {en: 'Code that turns ideas into *empires.*', fr: 'Du code qui transforme les idées en *empires.*'},
   text: {en: 'From the first line to global launch, we architect, code and ship software that scales with your ambition.', fr: 'De la première ligne au lancement mondial, nous concevons, codons et livrons des logiciels à la hauteur de votre ambition.'},
   b1: {en: 'Start your project', fr: 'Lancer votre projet'}, l1: '#contact', b2: {en: 'Explore solutions', fr: 'Voir les solutions'}, l2: '#solutions', chips: 'TypeScript, Node.js, Edge, AI'},
  {id: 'sites', video: '/img/slide-sites.mp4', poster: '/img/poster-sites.jpg', label: {en: 'Websites', fr: 'Sites web'},
   eyebrow: {en: 'Premium web design', fr: 'Web design premium'}, title: {en: 'Websites people *remember.*', fr: 'Des sites dont on se *souvient.*'},
   text: {en: 'Award-level design, motion and copy that turn visitors into clients, in every language you sell in.', fr: 'Un design, des animations et des textes de haut niveau qui transforment vos visiteurs en clients, dans toutes vos langues.'},
   b1: {en: 'See our work', fr: 'Voir nos réalisations'}, l1: '#work', b2: {en: 'Get a quote', fr: 'Obtenir un devis'}, l2: '#contact', chips: 'UI/UX, Branding, SEO, Motion'},
  {id: 'apps', video: '/img/slide-apps.mp4', poster: '/img/poster-apps.jpg', label: {en: 'Mobile apps', fr: 'Applications'},
   eyebrow: {en: 'iOS · Android · Web apps', fr: 'iOS · Android · Applications web'}, title: {en: 'Apps that live in *every pocket.*', fr: 'Des applications dans *toutes les poches.*'},
   text: {en: 'Native-quality mobile and web apps your customers open every day, built once and shipped everywhere.', fr: 'Des applications mobiles et web de qualité native, que vos clients ouvrent chaque jour, développées une fois et publiées partout.'},
   b1: {en: 'Browse app solutions', fr: 'Voir les applications'}, l1: '#solutions', b2: {en: 'Book a demo', fr: 'Réserver une démo'}, l2: '#contact', chips: 'React Native, Flutter, PWA'},
  {id: 'data', video: '/img/slide-data.mp4', poster: '/img/poster-data.jpg', label: {en: 'Business software', fr: 'Logiciels'},
   eyebrow: {en: 'ERP · CRM · Dashboards · Automation', fr: 'ERP · CRM · Tableaux de bord · Automatisation'}, title: {en: 'Software that *runs* your business.', fr: 'Le logiciel qui *pilote* votre entreprise.'},
   text: {en: 'Real-time dashboards, automated workflows and AI assistants that give every team superpowers.', fr: 'Tableaux de bord en temps réel, processus automatisés et assistants IA qui donnent des super-pouvoirs à chaque équipe.'},
   b1: {en: 'Our services', fr: 'Nos services'}, l1: '#services', b2: {en: 'Talk to an expert', fr: 'Parler à un expert'}, l2: '#contact', chips: 'Realtime, AI, Analytics, Cloud'},
  {id: 'globe', video: '/img/slide-globe.mp4', poster: '/img/poster-globe.jpg', label: {en: 'Worldwide', fr: 'International'},
   eyebrow: {en: 'Teknons and Partners Digital Corporation', fr: 'Teknons and Partners Digital Corporation'}, title: {en: 'Everything is *possible.*', fr: 'Tout est *possible.*'},
   text: {en: 'From your city to the whole world: one partner to design, build and grow your digital empire.', fr: 'De votre ville au monde entier : un seul partenaire pour concevoir, construire et faire grandir votre empire numérique.'},
   b1: {en: 'Start today', fr: 'Commencer aujourd’hui'}, l1: '#contact', b2: {en: 'Who we are', fr: 'Qui sommes-nous'}, l2: '#about', chips: '38 countries, 24/7, EN · FR'},
];
export const safeBgVid = u => { u = String(u || '').trim(); return safeVid(u) || (/^\/?img\/[a-z0-9-]+\.(mp4|webm)$/.test(u) ? '/' + u.replace(/^\//, '') : /^https:\/\/[^\s"'<>()]+\.(mp4|webm)(\?[^\s"'<>()]*)?$/i.test(u) ? u : ''); };
export const safeLink = u => { u = String(u || '').trim(); return /^#[a-z0-9-]*$/i.test(u) || /^\/(en|fr)\/[A-Za-z0-9/_-]*$/.test(u) ? u : safeUrl(u); };
export function normSlide(d, i){
  const two = o => ({en: String(o?.en || ''), fr: String(o?.fr || o?.en || '')});
  return {id: String(d.id || 's' + i), video: safeBgVid(d.video), poster: safeImg(d.poster) || '', label: two(d.label), eyebrow: two(d.eyebrow), title: two(d.title), text: two(d.text),
    b1: two(d.b1), l1: safeLink(d.l1), b2: two(d.b2), l2: safeLink(d.l2), chips: String(d.chips || ''), hidden: !!d.hidden};
}
export const allSlides = () => (Array.isArray(S.settings.slides) && S.settings.slides.length ? S.settings.slides : DEF_SLIDES).map(normSlide);
export const visibleSlides = () => allSlides().filter(s => !s.hidden);
export const rsTitle = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');
export const rsHref = h => /^#/.test(h) ? fixLinks(`href="${h}"`).slice(6, -1) : h;
export function slidesHtml(list, cur = 0){
  return list.map((s, i) => `<div class="rs-slide${i === cur ? ' cur' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${list.length}" ${i === cur ? '' : 'aria-hidden="true"'}>
    <div class="rs-media">${s.video ? `<video muted playsinline loop preload="${i === cur ? 'auto' : 'none'}"${s.poster ? ` poster="${esc(s.poster)}"` : ''} src="${esc(s.video)}"></video>` : s.poster ? `<img src="${esc(s.poster)}" alt="">` : ''}</div>
    <div class="rs-scrim"></div>
    <div class="rs-copy"><div class="wrap"><div class="in">
      ${LL(s.eyebrow) ? `<span class="eyebrow fx-up" style="--d:.15s"><i></i><span data-scr>${esc(LL(s.eyebrow))}</span></span>` : ''}
      <h2>${rsTitle(LL(s.title))}</h2>
      ${LL(s.text) ? `<p class="lede fx-up" style="--d:.75s">${esc(LL(s.text))}</p>` : ''}
      <div class="rs-btns fx-up" style="--d:.95s">${LL(s.b1) && s.l1 ? `<a class="btn gold" href="${esc(rsHref(s.l1))}">${esc(LL(s.b1))} →</a>` : ''}${LL(s.b2) && s.l2 ? `<a class="btn ghost" href="${esc(rsHref(s.l2))}">${esc(LL(s.b2))}</a>` : ''}</div>
      ${s.chips ? `<div class="rs-chips fx-up" style="--d:1.1s">${s.chips.split(',').map(x => x.trim()).filter(Boolean).slice(0, 5).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    </div></div></div></div>`).join('');
}
export const thumbsHtml = (list, cur = 0) => list.length > 1 ? list.map((s, i) => `<button type="button" data-rs="${i}" aria-current="${i === cur}" aria-label="${esc(LL(s.label) || LL(s.title).replace(/\*/g, ''))}">${s.poster ? `<img src="${esc(s.poster)}" alt="" loading="lazy">` : ''}<span>${esc(LL(s.label) || '—')}<em>${String(i + 1).padStart(2, '0')}</em></span><u><i></i></u></button>`).join('') : '';

// ---------- Live demos ----------
// A solution's own demo link wins; otherwise its screenshots become an interactive demo page.
export function demoLink(p){
  const ext = safeUrl(p.demo);
  if (ext) return {href: esc(ext), ext: true};
  return (p.shots || []).length || p.cover || hasVid(p) ? {href: `#demo-${p.id}`, ext: false} : null;
}
export function demoScreens(p){
  const imgs = [...new Set([p.cover, ...(p.shots || [])].filter(Boolean))];
  const names = [tt('Overview', 'Vue d’ensemble'), tt('Dashboard', 'Tableau de bord'), tt('Workflow', 'Flux de travail'), tt('Reports', 'Rapports'), tt('Settings', 'Réglages'), tt('Mobile', 'Mobile')];
  const list = imgs.map((src, i) => ({src, name: names[i] || `${tt('Screen', 'Écran')} ${i + 1}`}));
  return hasVid(p) ? [{video: true, name: tt('Video tour', 'Visite vidéo')}, ...list] : list;
}
export function demoHtml(p){
  const sc = demoScreens(p), f = L(p.f);
  return `<div class="demo" id="demo" data-id="${esc(p.id)}">
    <div class="demo-bar">
      <a class="demo-logo" href="#home" aria-label="Teknons"><img class="mark" src="/img/teknons-mark.png" alt="" width="52" height="36"></a>
      <a class="demo-back" href="#s-${esc(p.id)}">← <span>${esc(p.name)}</span></a>
      <div class="demo-tabs" role="tablist" id="demoTabs">${sc.map((x, i) => `<button type="button" role="tab" data-ds="${i}" aria-selected="${i === 0}">${esc(x.name)}</button>`).join('')}</div>
      <button type="button" class="demo-full" id="demoFull" aria-pressed="false" aria-label="${tt('Full width', 'Pleine largeur')}">${icon('web', 18)}<span>${tt('Full width', 'Pleine largeur')}</span></button>
      <a class="btn gold sm" href="${R('contact')}?solution=${encodeURIComponent(p.name)}">${tt('Get this solution', 'Obtenir cette solution')}</a>
    </div>
    <div class="demo-main">
      <div class="demo-stage" id="demoStage">
        <div class="bframe"><div class="bar"><i></i><i></i><i></i><span>${esc(p.id)}.demo.teknons.com</span></div>
          <div class="scr" id="demoScr">${sc.map((x, i) => `<div class="ds${i === 0 ? ' on' : ''}" data-i="${i}">${x.video ? playerHtml(p) : `<img src="${esc(x.src)}" alt="${esc(p.name)} · ${esc(x.name)}"${i ? ' loading="lazy"' : ''}>`}</div>`).join('')}</div></div>
        <button type="button" class="demo-nav prev" id="demoPrev" aria-label="${tt('Previous screen', 'Écran précédent')}">‹</button><button type="button" class="demo-nav next" id="demoNext" aria-label="${tt('Next screen', 'Écran suivant')}">›</button>
      </div>
      <aside class="demo-side">
        <span class="eyebrow">${L(UI.types[p.type])} · ${catName(p.cat)}</span>
        <h1>${esc(p.name)}</h1>
        <p class="muted">${esc(LL(p.t))}</p>
        ${f.length ? `<ul class="feat-list">${f.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <dl class="kv"><dt>${tt('Price', 'Prix')}</dt><dd>${tt('Very affordable', 'Très abordable')}</dd><dt>${t('delivery')}</dt><dd>${esc(p.weeks)} ${t('weeks')}</dd></dl>
        <p class="demo-note">${tt('Sample data. Your version uses your brand, your content and your workflows.', 'Données d’exemple. Votre version reprend votre marque, vos contenus et vos processus.')}</p>
        <a class="btn" href="#addons">${tt('See add-ons', 'Voir les options')} →</a>
      </aside>
    </div>
  </div>`;
}

// ---------- Add-ons (editable in Admin → Add-ons) ----------
export const ADDON_CATS = {
  sales: {en: 'Payments & sales', fr: 'Paiements et ventes'},
  comms: {en: 'Messaging', fr: 'Messagerie'},
  ai: {en: 'AI & data', fr: 'IA et données'},
  reach: {en: 'Mobile & reach', fr: 'Mobile et visibilité'},
  care: {en: 'Hosting & care', fr: 'Hébergement et suivi'},
};
export const DEF_ADDONS = [
  {id: 'payments', cat: 'sales', icon: 'card', price: 900, unit: 'once', name: {en: 'Online payments', fr: 'Paiements en ligne'}, desc: {en: 'Card, Stripe, PayPal and mobile money, with a payment link on every invoice and order.', fr: 'Carte, Stripe, PayPal et mobile money, avec un lien de paiement sur chaque facture et commande.'}},
  {id: 'invoicing', cat: 'sales', icon: 'erp', price: 1200, unit: 'once', name: {en: 'Invoicing & accounting', fr: 'Facturation et comptabilité'}, desc: {en: 'Quotes, invoices, local tax rates, legal mentions and an export for your accountant.', fr: 'Devis, factures, taux de TVA locaux, mentions légales et export pour votre comptable.'}},
  {id: 'whatsapp', cat: 'comms', icon: 'chat', price: 600, unit: 'once', name: {en: 'WhatsApp & SMS', fr: 'WhatsApp et SMS'}, desc: {en: 'Automatic confirmations, reminders and receipts sent by WhatsApp and SMS.', fr: 'Confirmations, rappels et reçus envoyés automatiquement par WhatsApp et SMS.'}},
  {id: 'email', cat: 'comms', icon: 'mail', price: 450, unit: 'once', name: {en: 'Email automation', fr: 'Emails automatiques'}, desc: {en: 'Branded transactional emails and simple newsletters from your own domain.', fr: 'Emails transactionnels à vos couleurs et newsletters simples depuis votre domaine.'}},
  {id: 'ai', cat: 'ai', icon: 'ai', price: 1500, unit: 'once', name: {en: 'AI assistant', fr: 'Assistant IA'}, desc: {en: 'A chat assistant trained on your products and documents that answers customers day and night.', fr: 'Un assistant entraîné sur vos produits et documents qui répond à vos clients jour et nuit.'}},
  {id: 'analytics', cat: 'ai', icon: 'chart', price: 1100, unit: 'once', name: {en: 'Analytics dashboard', fr: 'Tableau de bord analytique'}, desc: {en: 'Sales, customers and performance in one live dashboard, with monthly email reports.', fr: 'Ventes, clients et performance dans un tableau de bord en direct, avec rapport mensuel par email.'}},
  {id: 'import', cat: 'ai', icon: 'data', price: 500, unit: 'once', name: {en: 'Data import', fr: 'Import de données'}, desc: {en: 'We move your customers, products and history from Excel or your old software.', fr: 'Nous reprenons vos clients, produits et historique depuis Excel ou votre ancien logiciel.'}},
  {id: 'mobile', cat: 'reach', icon: 'mobile', price: 6900, unit: 'once', name: {en: 'Mobile app', fr: 'Application mobile'}, desc: {en: 'iOS and Android app connected to your platform, published on both stores.', fr: 'Application iOS et Android reliée à votre plateforme, publiée sur les deux stores.'}},
  {id: 'language', cat: 'reach', icon: 'globe', price: 400, unit: 'lang', name: {en: 'Extra language', fr: 'Langue supplémentaire'}, desc: {en: 'Full translation of the interface and content, with right-to-left support when needed.', fr: 'Traduction complète de l’interface et des contenus, avec écriture de droite à gauche si besoin.'}},
  {id: 'seo', cat: 'reach', icon: 'arrow', price: 700, unit: 'once', name: {en: 'SEO & speed pack', fr: 'Pack SEO et vitesse'}, desc: {en: 'Technical SEO, structured data, Google Business setup and a speed audit.', fr: 'SEO technique, données structurées, fiche Google Business et audit de vitesse.'}},
  {id: 'hosting', cat: 'care', icon: 'cloud', price: 49, unit: 'month', name: {en: 'Managed hosting', fr: 'Hébergement géré'}, desc: {en: 'Fast hosting, SSL, daily backups and uptime monitoring, fully handled by us.', fr: 'Hébergement rapide, SSL, sauvegardes quotidiennes et surveillance, entièrement gérés par nous.'}},
  {id: 'care', cat: 'care', icon: 'headset', price: 149, unit: 'month', name: {en: 'Care plan', fr: 'Contrat de suivi'}, desc: {en: 'Updates, security patches, small changes each month and priority support.', fr: 'Mises à jour, correctifs de sécurité, petites modifications chaque mois et support prioritaire.'}},
];
export const normAddon = (a, i) => ({id: String(a.id || 'addon-' + i), cat: ADDON_CATS[a.cat] ? a.cat : 'sales', icon: I[a.icon] ? a.icon : 'code', price: Math.max(0, +a.price || 0),
  unit: ['once', 'month', 'lang'].includes(a.unit) ? a.unit : 'once', name: {en: a.name?.en || '', fr: a.name?.fr || ''}, desc: {en: a.desc?.en || '', fr: a.desc?.fr || ''}, hidden: !!a.hidden});
export const allAddons = () => (Array.isArray(S.settings.addons) && S.settings.addons.length ? S.settings.addons : DEF_ADDONS).map(normAddon);
export const visibleAddons = () => allAddons().filter(a => !a.hidden && (a.name.en || a.name.fr));
const unitTxt = u => u === 'month' ? tt('/ month', '/ mois') : u === 'lang' ? tt('/ language', '/ langue') : tt('one-time', 'paiement unique');
export function addonCard(a){
  return `<article class="addon" data-acat="${a.cat}"><div class="ad-ic">${icon(a.icon, 24)}</div><span class="ad-cat">${L(ADDON_CATS[a.cat])}</span><h3>${esc(LL(a.name))}</h3><p>${esc(LL(a.desc))}</p>
    <div class="ad-f"><div class="price"><small>${tt('Price', 'Prix')}</small>${tt('Very affordable', 'Très abordable')}</div><a class="btn sm" href="${R('contact')}?addon=${encodeURIComponent(a.id)}">${tt('Add to my project', 'Ajouter à mon projet')}</a></div></article>`;
}
export function addonsParts(cat = 'all'){
  const list = visibleAddons(), cats = Object.keys(ADDON_CATS).filter(k => list.some(a => a.cat === k));
  return {
    tabs: [['all', t('all')], ...cats.map(k => [k, L(ADDON_CATS[k])])].map(([k, l]) => `<button class="chip" type="button" data-ac="${k}" aria-pressed="${k === cat}">${l}</button>`).join(''),
    grid: list.filter(a => cat === 'all' || a.cat === cat).map(addonCard).join(''),
  };
}

// ---------- Promises, testimonials and FAQ (home page) ----------
export const PROMISES = [
  ['code', {en: 'You own everything', fr: 'Tout vous appartient'}, {en: 'Source code, domain, data and accounts are yours from day one.', fr: 'Code source, domaine, données et comptes sont à vous dès le premier jour.'}],
  ['shield', {en: 'Fixed price, no surprises', fr: 'Prix fixe, sans surprise'}, {en: 'A written quote before any work starts. The price you approve is the price you pay.', fr: 'Un devis écrit avant tout travail. Le prix validé est le prix payé.'}],
  ['pen', {en: 'Your brand, not a template', fr: 'Votre marque, pas un modèle'}, {en: 'Your logo, colours, domain and wording. Nobody else has the same site.', fr: 'Votre logo, vos couleurs, votre domaine et vos mots. Personne n’a le même site.'}],
  ['card', {en: 'Local payments built in', fr: 'Paiements locaux intégrés'}, {en: 'Mobile money, bank transfer, cards, Stripe or PayPal, set up for your country.', fr: 'Mobile money, virement, carte, Stripe ou PayPal, configurés pour votre pays.'}],
  ['data', {en: 'Setup and data import included', fr: 'Mise en place et import inclus'}, {en: 'We install, configure and move your existing data, then train your team.', fr: 'Nous installons, configurons et reprenons vos données, puis formons votre équipe.'}],
  ['headset', {en: 'A real team after launch', fr: 'Une vraie équipe après le lancement'}, {en: 'Updates, backups and an engineer who answers on WhatsApp, email or tickets.', fr: 'Mises à jour, sauvegardes et un ingénieur qui répond par WhatsApp, email ou ticket.'}],
];
export const promisesHtml = () => PROMISES.map(([ic, h, p]) => `<div class="pr"><div class="pr-ic">${icon(ic, 22)}</div><div><h3>${L(h)}</h3><p>${L(p)}</p></div></div>`).join('');

export const normTesti = (x, i) => ({id: String(x.id || 'tm-' + i), name: x.name || '', role: x.role || '', quote: {en: x.quote?.en || '', fr: x.quote?.fr || ''}, photo: safeImg(x.photo), rating: Math.min(5, Math.max(0, +x.rating || 5)), hidden: !!x.hidden});
export const allTestis = () => (Array.isArray(S.settings.testimonials) ? S.settings.testimonials : []).map(normTesti);
export const visibleTestis = () => allTestis().filter(x => !x.hidden && x.name && (x.quote.en || x.quote.fr));
export const testisHtml = () => visibleTestis().map(x => `<figure class="testi"><div class="stars" aria-label="${x.rating}/5">${'★'.repeat(x.rating)}<span>${'★'.repeat(5 - x.rating)}</span></div><blockquote>“${esc(LL(x.quote))}”</blockquote>
  <figcaption>${x.photo ? `<img src="${esc(x.photo)}" alt="" loading="lazy">` : `<span class="av">${esc(x.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>`}<span><b>${esc(x.name)}</b>${x.role ? `<small>${esc(x.role)}</small>` : ''}</span></figcaption></figure>`).join('');

export const FAQ = [
  [{en: 'How much does a project cost?', fr: 'Combien coûte un projet ?'}, {en: 'Our packs are very affordable and the price depends on your trade, your size and the options you choose. After a free call we send a fixed written quote that includes design, development, setup and training. You can pay in instalments or with a monthly plan.', fr: 'Nos packs sont très abordables et le prix dépend de votre métier, de votre taille et des options choisies. Après un appel gratuit, nous envoyons un devis écrit à prix fixe qui inclut design, développement, mise en place et formation. Vous pouvez payer en plusieurs fois ou avec un forfait mensuel.'}],
  [{en: 'How long does it take?', fr: 'Combien de temps faut-il ?'}, {en: 'Most websites go live in 2 to 6 weeks and web applications in 4 to 14 weeks. The delivery time is shown on each solution and confirmed in your quote.', fr: 'La plupart des sites sont en ligne en 2 à 6 semaines et les applications web en 4 à 14 semaines. Le délai est indiqué sur chaque solution et confirmé dans votre devis.'}],
  [{en: 'Can I try a solution before buying?', fr: 'Puis-je essayer une solution avant d’acheter ?'}, {en: 'Yes. Open the live demo on any solution to click through its screens, then book a free call and we walk you through it with your own use case.', fr: 'Oui. Ouvrez la démo en direct de chaque solution pour parcourir ses écrans, puis réservez un appel gratuit et nous vous la présentons avec votre propre cas.'}],
  [{en: 'Who owns the code and the data?', fr: 'À qui appartiennent le code et les données ?'}, {en: 'You do. The source code, domain, accounts and all data belong to your company. There is no lock-in: you can host it anywhere.', fr: 'À vous. Le code source, le domaine, les comptes et toutes les données appartiennent à votre entreprise. Aucun verrouillage : vous pouvez l’héberger où vous voulez.'}],
  [{en: 'Do you host and maintain the site?', fr: 'Hébergez-vous et maintenez-vous le site ?'}, {en: 'We can. Managed hosting covers SSL, daily backups and monitoring, and a care plan adds updates, security patches and monthly changes. You can also host it yourself.', fr: 'Oui, si vous le souhaitez. L’hébergement géré couvre SSL, sauvegardes quotidiennes et surveillance, et le contrat de suivi ajoute mises à jour, correctifs et modifications mensuelles. Vous pouvez aussi l’héberger vous-même.'}],
  [{en: 'Can it accept local payments?', fr: 'Peut-il accepter les paiements locaux ?'}, {en: 'Yes. We connect mobile money, bank transfer, cards, Stripe or PayPal depending on your country, with payment links on invoices and orders.', fr: 'Oui. Nous connectons mobile money, virement, carte, Stripe ou PayPal selon votre pays, avec des liens de paiement sur les factures et commandes.'}],
  [{en: 'Can I update the content myself?', fr: 'Puis-je modifier le contenu moi-même ?'}, {en: 'Yes. Every project comes with an admin panel and a short training session, so your team can change texts, images, products and prices without us.', fr: 'Oui. Chaque projet inclut un panneau d’administration et une courte formation, pour que votre équipe modifie textes, images, produits et prix sans nous.'}],
  [{en: 'What happens after launch?', fr: 'Que se passe-t-il après le lancement ?'}, {en: 'We stay with you. Bugs found after launch are fixed at no cost, and you can reach us through the Support page, WhatsApp or email for anything else.', fr: 'Nous restons à vos côtés. Les bugs trouvés après le lancement sont corrigés sans frais, et vous pouvez nous joindre via la page Support, WhatsApp ou email pour tout le reste.'}],
];
FAQ.splice(1, 0,
  [{en: 'Does it work during power cuts or when the internet is down?', fr: 'Est-ce que ça marche pendant les coupures de courant ou d’Internet ?'}, {en: 'Yes. Our management software keeps working offline. As soon as the network is back, everything syncs automatically.', fr: 'Oui. Nos logiciels de gestion continuent de fonctionner hors ligne. Dès que le réseau revient, tout se synchronise automatiquement.'}],
  [{en: 'Can I pay in instalments?', fr: 'Puis-je payer en plusieurs fois ?'}, {en: 'Yes. Every pack can be paid in instalments or as a monthly plan, with a clear signed contract.', fr: 'Oui. Chaque pack peut être payé en plusieurs fois ou en forfait mensuel, avec un contrat clair et signé.'}],
  [{en: 'What is Teknons Private AI?', fr: 'Qu’est-ce que l’IA privée Teknons ?'}, {en: 'An artificial intelligence installed on your own server, included in the Premium pack. Your figures, customers and documents never leave your company, and we train your team to use it.', fr: 'Une intelligence artificielle installée sur votre propre serveur, incluse dans le pack Premium. Vos chiffres, vos clients et vos documents ne sortent jamais de l’entreprise, et nous formons votre équipe à l’utiliser.'}]);
export const faqHtml = () => FAQ.map(([q, a], i) => `<details class="faq"${i === 0 ? ' open' : ''}><summary>${L(q)}<i aria-hidden="true"></i></summary><p>${L(a)}</p></details>`).join('');
export const faqLd = () => ({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({'@type': 'Question', name: L(q), acceptedAnswer: {'@type': 'Answer', text: L(a)}}))});

// ---------- Support ----------
export const GUIDES = [
  ['pen', {en: 'Edit your content', fr: 'Modifier vos contenus'}, {en: 'Sign in to your admin panel, open the page or product, change the text or images and press Save. Changes are live straight away.', fr: 'Connectez-vous à votre administration, ouvrez la page ou le produit, modifiez textes ou images puis Enregistrer. Les changements sont en ligne aussitôt.'}],
  ['refresh', {en: 'Request a change', fr: 'Demander une modification'}, {en: 'Open a ticket below with the page address and what should change. A screenshot helps. Small changes are included in care plans.', fr: 'Ouvrez un ticket ci-dessous avec l’adresse de la page et ce qui doit changer. Une capture aide. Les petites modifications sont incluses dans les contrats de suivi.'}],
  ['card', {en: 'Payments and invoices', fr: 'Paiements et factures'}, {en: 'Payment problems are urgent: choose the Urgent priority. Tell us the order or invoice number and the payment method used.', fr: 'Les problèmes de paiement sont urgents : choisissez la priorité Urgent. Indiquez le numéro de commande ou de facture et le moyen de paiement utilisé.'}],
  ['cloud', {en: 'Hosting, domain and email', fr: 'Hébergement, domaine et email'}, {en: 'If your site is down or your domain expires, open an Urgent ticket. We check backups, SSL and DNS and keep you updated.', fr: 'Si votre site est hors ligne ou votre domaine expire, ouvrez un ticket Urgent. Nous vérifions sauvegardes, SSL et DNS et vous tenons informé.'}],
  ['shield', {en: 'Accounts and access', fr: 'Comptes et accès'}, {en: 'To add a team member or reset a password, the account owner should send the request from the email address we have on file.', fr: 'Pour ajouter un membre ou réinitialiser un mot de passe, le titulaire du compte doit envoyer la demande depuis l’adresse email enregistrée.'}],
  ['book', {en: 'Training', fr: 'Formation'}, {en: 'New team member? Ask for a short video call and we walk them through the admin panel and your daily tasks.', fr: 'Nouveau membre dans l’équipe ? Demandez un court appel vidéo et nous lui présentons l’administration et vos tâches quotidiennes.'}],
];
export const guidesHtml = () => GUIDES.map(([ic, h, p]) => `<details class="guide"><summary><span class="g-ic">${icon(ic, 20)}</span>${L(h)}<i aria-hidden="true"></i></summary><p>${L(p)}</p></details>`).join('');
export const waLink = () => { const n = String(S.settings.whatsapp || '237673799674').replace(/[^\d]/g, ''); return n.length >= 8 ? `https://wa.me/${n}` : ''; };
export const supportEmail = () => /^\S+@\S+\.\S+$/.test(S.settings.supportEmail || '') ? S.settings.supportEmail : 'contact@teknons.com';
export function supportChannelsHtml(){
  const wa = waLink(), em = supportEmail();
  return `<a class="chan" href="#ticket"><span class="ch-ic">${icon('headset', 24)}</span><b>${tt('Open a ticket', 'Ouvrir un ticket')}</b><small>${tt('Tracked request, answer by email', 'Demande suivie, réponse par email')}</small></a>
    ${wa ? `<a class="chan" href="${wa}" target="_blank" rel="noopener"><span class="ch-ic">${icon('chat', 24)}</span><b>WhatsApp</b><small>${tt('Quick questions and urgent issues', 'Questions rapides et urgences')}</small></a>` : ''}
    <a class="chan" href="mailto:${esc(em)}"><span class="ch-ic">${icon('mail', 24)}</span><b>${tt('Email', 'Email')}</b><small>${esc(em)}</small></a>
    <a class="chan" href="#contact"><span class="ch-ic">${icon('play', 24)}</span><b>${tt('Book a call', 'Réserver un appel')}</b><small>${tt('Training or a new project', 'Formation ou nouveau projet')}</small></a>`;
}
export const prioOptsHtml = () => [['normal', tt('Normal', 'Normale')], ['low', tt('Low', 'Basse')], ['urgent', tt('Urgent: site down or payments broken', 'Urgente : site hors ligne ou paiements bloqués')]].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
