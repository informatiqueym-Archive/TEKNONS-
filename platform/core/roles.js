// Roles and what each one may do. Every platform uses the same roles;
// a sector module only adds permission names.
//   pos   = sell at the till (Teknons POS)
//   stock = receive goods, transfers, inventory counts (Teknons POS)
//   frontdesk = bookings, check-in/out, folios, key cards (Teknons Hôtel)
//   housekeeping = room status, minibar, lost & found, maintenance (Teknons Hôtel)
//   outlet = restaurant, bar, room service, spa orders (Teknons Hôtel)
//   service = take orders, send to the kitchen, bills and payments (Teknons Resto)
//   kitchen = kitchen and bar display, mark dishes ready (Teknons Resto)
//   teaching = marks, tests, roll call, lesson log, e-learning (Teknons École)
//   schooloffice = students, admissions, classes, report cards (Teknons École)
//   discipline = attendance, gate, sanctions (Teknons École)
//   library = library loans and catalogue (Teknons École)
//   reception = patient registration, appointments, queue, cashier desk (Teknons Santé)
//   care = clinical record, vitals, consultations (Teknons Santé, medical secrecy)
//   prescribe = prescriptions, lab and imaging orders, certificates (Teknons Santé)
//   ward = beds, admissions, nursing chart (Teknons Santé)
//   lab = laboratory and imaging worklist, results (Teknons Santé)
//   pharmacy = dispensing, drug stock, lots and expiry (Teknons Santé)
// `only` limits a role to the products that use it (hidden elsewhere).
export const PERMISSIONS = ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports', 'settings', 'users', 'pos', 'stock', 'frontdesk', 'housekeeping', 'outlet', 'service', 'kitchen', 'teaching', 'schooloffice', 'discipline', 'library', 'reception', 'care', 'prescribe', 'ward', 'lab', 'pharmacy'];

export const ROLES = {
  owner:       { fr: 'Propriétaire', en: 'Owner', perms: PERMISSIONS },
  admin:       { fr: 'Administrateur', en: 'Administrator', perms: PERMISSIONS },
  manager:     { fr: 'Gérant / directeur', en: 'Manager', perms: ['read', 'sales', 'purchases', 'treasury', 'reports', 'pos', 'stock', 'frontdesk', 'housekeeping', 'outlet', 'service', 'kitchen', 'teaching', 'schooloffice', 'discipline', 'library', 'reception', 'ward', 'lab', 'pharmacy'] },
  accountant:  { fr: 'Comptable', en: 'Accountant', perms: ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports'] },
  sales:       { fr: 'Commercial', en: 'Sales', perms: ['read', 'sales', 'pos'] },
  cashier:     { fr: 'Caissier', en: 'Cashier', perms: ['read', 'treasury', 'pos'] },
  storekeeper: { fr: 'Magasinier', en: 'Storekeeper', perms: ['read', 'stock'] },
  receptionist: { fr: 'Réceptionniste', en: 'Receptionist', perms: ['read', 'frontdesk', 'outlet'], only: ['hotel'] },
  housekeeper: { fr: 'Gouvernante / femme de chambre', en: 'Housekeeper', perms: ['read', 'housekeeping'], only: ['hotel'] },
  waiter:      { fr: 'Serveur / barman / spa', en: 'Waiter / bartender / spa', perms: ['read', 'outlet'], only: ['hotel'] },
  server:      { fr: 'Serveur / barman', en: 'Waiter / bartender', perms: ['read', 'service'], only: ['restaurant'] },
  cook:        { fr: 'Cuisinier / chef de partie', en: 'Cook / chef', perms: ['read', 'kitchen'], only: ['restaurant'] },
  teacher:     { fr: 'Enseignant', en: 'Teacher', perms: ['read', 'teaching'], only: ['school'] },
  registrar:   { fr: 'Secrétariat / scolarité', en: 'Registrar', perms: ['read', 'schooloffice', 'sales', 'discipline'], only: ['school'] },
  supervisor:  { fr: 'Surveillant général / censeur', en: 'Dean of discipline', perms: ['read', 'discipline'], only: ['school'] },
  librarian:   { fr: 'Bibliothécaire', en: 'Librarian', perms: ['read', 'library'], only: ['school'] },
  doctor:      { fr: 'Médecin', en: 'Doctor', perms: ['read', 'care', 'prescribe', 'ward'], only: ['clinic'] },
  nurse:       { fr: 'Infirmier(ère) / sage-femme', en: 'Nurse / midwife', perms: ['read', 'care', 'ward', 'reception'], only: ['clinic'] },
  labtech:     { fr: 'Laborantin / imagerie', en: 'Lab / imaging technician', perms: ['read', 'lab'], only: ['clinic'] },
  pharmacist:  { fr: 'Pharmacien / dispensateur', en: 'Pharmacist', perms: ['read', 'pharmacy', 'sales'], only: ['clinic'] },
  reception:   { fr: 'Accueil et caisse', en: 'Front desk & cashier', perms: ['read', 'reception', 'treasury', 'sales'], only: ['clinic'] },
  viewer:      { fr: 'Lecture seule', en: 'Read only', perms: ['read', 'reports'] },
};

export const can = (user, perm) => !!user && (ROLES[user.role]?.perms || []).includes(perm);
