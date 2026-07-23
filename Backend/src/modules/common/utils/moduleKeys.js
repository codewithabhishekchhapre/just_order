/**
 * Canonical module-key normalization between GlobalSettings (camelCase)
 * and Driver registeredServices / authorizedServices (kebab-case).
 */

export const SETTINGS_TO_DRIVER = {
  food: "food",
  quickCommerce: "quick-commerce",
  porter: "porter",
  taxi: "taxi",
  /** Legacy alias — normalize to porter via canonicalizeDriverModuleKey */
  parcel: "parcel",
};

export const DRIVER_TO_SETTINGS = {
  food: "food",
  "quick-commerce": "quickCommerce",
  porter: "porter",
  taxi: "taxi",
  parcel: "porter",
};

export const DRIVER_MODULE_KEYS = [
  "food",
  "quick-commerce",
  "porter",
  "parcel",
  "taxi",
];

/** Canonical work-module keys used for activeWorkModule / dispatch filters */
export const CANONICAL_DRIVER_MODULE_KEYS = [
  "food",
  "quick-commerce",
  "porter",
  "taxi",
];

export const MODULE_PERMISSION_ROOTS = {
  food: "food",
  "quick-commerce": "quick",
  quickCommerce: "quick",
  porter: "porter",
  taxi: "taxi",
  parcel: "porter",
};

export const toDriverModuleKey = (raw) => {
  const key = String(raw || "").trim();
  if (!key) return null;
  if (SETTINGS_TO_DRIVER[key]) return SETTINGS_TO_DRIVER[key];
  if (DRIVER_TO_SETTINGS[key]) return key;
  const lower = key.toLowerCase();
  if (SETTINGS_TO_DRIVER[lower]) return SETTINGS_TO_DRIVER[lower];
  if (DRIVER_TO_SETTINGS[lower]) return lower;
  return null;
};

/**
 * Map legacy aliases to the single work-module key used in dispatch.
 * `parcel` → `porter`. Prefer this for activeWorkModule comparisons.
 */
export const canonicalizeDriverModuleKey = (raw) => {
  const key = toDriverModuleKey(raw);
  if (!key) return null;
  if (key === "parcel") return "porter";
  return key;
};

/** True if driver's authorizedServices covers the requested module (incl. parcel↔porter). */
export const driverAuthorizedForModule = (authorizedServices = [], moduleKey) => {
  const wanted = canonicalizeDriverModuleKey(moduleKey);
  if (!wanted) return false;
  const set = new Set(
    (authorizedServices || []).map((k) => canonicalizeDriverModuleKey(k)).filter(Boolean),
  );
  return set.has(wanted);
};

export const toSettingsModuleKey = (raw) => {
  const driverKey = toDriverModuleKey(raw);
  if (!driverKey) return null;
  return DRIVER_TO_SETTINGS[driverKey] || null;
};

export const getPermissionRootForModule = (raw) => {
  const driverKey = toDriverModuleKey(raw);
  if (!driverKey) return null;
  return MODULE_PERMISSION_ROOTS[driverKey] || null;
};

export const getModuleLabel = (raw, labels = {}) => {
  const settingsKey = toSettingsModuleKey(raw);
  const driverKey = toDriverModuleKey(raw);
  return (
    labels[settingsKey] ||
    labels[driverKey] ||
    labels[raw] ||
    String(raw || "Module")
  );
};
