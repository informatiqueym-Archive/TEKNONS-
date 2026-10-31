// The sector modules this server runs. The 10 Teknons platforms share the core
// and each adds its module here (restaurant, shop, school, hotel, clinic...).
import accounting from './accounting/index.js';

export const ALL_MODULES = { accounting };

export function loadModules(list = process.env.MODULES || 'accounting') {
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((id) => {
    if (!ALL_MODULES[id]) throw new Error(`Unknown module: ${id}`);
    return ALL_MODULES[id];
  });
}
