// Roles and what each one may do. Every platform uses the same roles;
// a sector module only adds permission names.
export const PERMISSIONS = ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports', 'settings', 'users'];

export const ROLES = {
  owner:      { fr: 'Propriétaire', en: 'Owner', perms: PERMISSIONS },
  admin:      { fr: 'Administrateur', en: 'Administrator', perms: PERMISSIONS },
  accountant: { fr: 'Comptable', en: 'Accountant', perms: ['read', 'sales', 'purchases', 'treasury', 'accounting', 'reports'] },
  sales:      { fr: 'Commercial', en: 'Sales', perms: ['read', 'sales'] },
  cashier:    { fr: 'Caissier', en: 'Cashier', perms: ['read', 'treasury'] },
  viewer:     { fr: 'Lecture seule', en: 'Read only', perms: ['read', 'reports'] },
};

export const can = (user, perm) => !!user && (ROLES[user.role]?.perms || []).includes(perm);
