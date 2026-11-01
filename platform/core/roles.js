// Roles and what each one may do. Every platform uses the same roles;
// a sector module only adds permission names.
//   pos   = sell at the till (Teknons POS)
//   stock = receive goods, transfers, inventory counts (Teknons POS)
//   frontdesk = bookings, check-in/out, folios, key cards (Teknons Hôtel)
//   housekeeping = room status, minibar, lost & found, maintenance (Teknons Hôtel)
//   outlet = restaurant, bar, room service, spa orders (Teknons Hôtel)
// `only` limits a role to the products that use it (hidden elsewhere).
export const PERMISSIONS = ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports', 'settings', 'users', 'pos', 'stock', 'frontdesk', 'housekeeping', 'outlet'];

export const ROLES = {
  owner:       { fr: 'Propriétaire', en: 'Owner', perms: PERMISSIONS },
  admin:       { fr: 'Administrateur', en: 'Administrator', perms: PERMISSIONS },
  manager:     { fr: 'Gérant / directeur', en: 'Manager', perms: ['read', 'sales', 'purchases', 'treasury', 'reports', 'pos', 'stock', 'frontdesk', 'housekeeping', 'outlet'] },
  accountant:  { fr: 'Comptable', en: 'Accountant', perms: ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports'] },
  sales:       { fr: 'Commercial', en: 'Sales', perms: ['read', 'sales', 'pos'] },
  cashier:     { fr: 'Caissier', en: 'Cashier', perms: ['read', 'treasury', 'pos'] },
  storekeeper: { fr: 'Magasinier', en: 'Storekeeper', perms: ['read', 'stock'] },
  receptionist: { fr: 'Réceptionniste', en: 'Receptionist', perms: ['read', 'frontdesk', 'outlet'], only: ['hotel'] },
  housekeeper: { fr: 'Gouvernante / femme de chambre', en: 'Housekeeper', perms: ['read', 'housekeeping'], only: ['hotel'] },
  waiter:      { fr: 'Serveur / barman / spa', en: 'Waiter / bartender / spa', perms: ['read', 'outlet'], only: ['hotel'] },
  viewer:      { fr: 'Lecture seule', en: 'Read only', perms: ['read', 'reports'] },
};

export const can = (user, perm) => !!user && (ROLES[user.role]?.perms || []).includes(perm);
