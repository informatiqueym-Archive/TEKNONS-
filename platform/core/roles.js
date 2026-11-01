// Roles and what each one may do. Every platform uses the same roles;
// a sector module only adds permission names.
//   pos   = sell at the till (Teknons POS)
//   stock = receive goods, transfers, inventory counts (Teknons POS)
export const PERMISSIONS = ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports', 'settings', 'users', 'pos', 'stock'];

export const ROLES = {
  owner:       { fr: 'Propriétaire', en: 'Owner', perms: PERMISSIONS },
  admin:       { fr: 'Administrateur', en: 'Administrator', perms: PERMISSIONS },
  manager:     { fr: 'Gérant de boutique', en: 'Store manager', perms: ['read', 'sales', 'purchases', 'treasury', 'reports', 'pos', 'stock'] },
  accountant:  { fr: 'Comptable', en: 'Accountant', perms: ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports'] },
  sales:       { fr: 'Commercial', en: 'Sales', perms: ['read', 'sales', 'pos'] },
  cashier:     { fr: 'Caissier', en: 'Cashier', perms: ['read', 'treasury', 'pos'] },
  storekeeper: { fr: 'Magasinier', en: 'Storekeeper', perms: ['read', 'stock'] },
  viewer:      { fr: 'Lecture seule', en: 'Read only', perms: ['read', 'reports'] },
};

export const can = (user, perm) => !!user && (ROLES[user.role]?.perms || []).includes(perm);
