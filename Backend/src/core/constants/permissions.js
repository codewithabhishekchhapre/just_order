/**
 * Central RBAC permission key catalog for multi-module admin.
 * Employees must have matching AdminRole permissions; ADMIN bypasses checks.
 */
export const MODULE_PERMISSION_CATALOG = {
  food: {
    root: 'food',
    keys: ['food::orders', 'food::restaurants', 'food::zones', 'food::delivery'],
  },
  quick: {
    root: 'quick',
    keys: ['quick::orders', 'quick::sellers', 'quick::products', 'quick::zones'],
  },
  porter: {
    root: 'porter',
    keys: [
      'porter::zones',
      'porter::vehicles',
      'porter::pricing',
      'porter::coupons',
      'porter::banners',
      'porter::users',
      'porter::trips',
      'porter::orders',
    ],
  },
  taxi: {
    root: 'taxi',
    keys: [
      'taxi::zones',
      'taxi::vehicles',
      'taxi::pricing',
      'taxi::rides',
      'taxi::coupons',
    ],
  },
};

export const ALL_PERMISSION_KEYS = Object.values(MODULE_PERMISSION_CATALOG).flatMap(
  (m) => m.keys,
);
