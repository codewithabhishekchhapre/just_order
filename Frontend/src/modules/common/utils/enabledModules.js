export const DEFAULT_ENABLED_MODULES = {
  food: true,
  quickCommerce: true,
  porter: true,
};

export const ALLOWED_MODULE_KEYS = Object.keys(DEFAULT_ENABLED_MODULES);

export const MODULE_LABELS = {
  food: "Food Delivery",
  quickCommerce: "Quick Commerce",
  porter: "Porter / Logistics",
};

export const MODULE_LANDING_PATHS = {
  food: "/food/user",
  quickCommerce: "/quick",
  porter: "/porter",
};

export const TAB_TO_MODULE_KEY = {
  food: "food",
  quick: "quickCommerce",
  porter: "porter",
};

export const normalizeEnabledModules = (modules) => {
  const result = { ...DEFAULT_ENABLED_MODULES };
  if (modules && typeof modules === "object") {
    for (const [key, value] of Object.entries(modules)) {
      result[key] = value !== false;
    }
  }
  return result;
};

export const isModuleEnabled = (modules, moduleKey) => {
  if (!moduleKey) return true;
  return normalizeEnabledModules(modules)[moduleKey] !== false;
};

export const getFirstEnabledModulePath = (modules) => {
  const normalized = normalizeEnabledModules(modules);
  for (const [key, path] of Object.entries(MODULE_LANDING_PATHS)) {
    if (normalized[key] !== false) return path;
  }
  return null;
};

export const resolveModuleKeyFromPath = (pathname = "") => {
  const path = String(pathname || "");
  if (path === "/quick" || path.startsWith("/quick/")) return "quickCommerce";
  if (path === "/porter" || path.startsWith("/porter/")) return "porter";
  if (
    path === "/food/user" ||
    path.startsWith("/food/user/") ||
    path === "/food" ||
    path === "/food/"
  ) {
    return "food";
  }
  return null;
};

export const getVisibleHomeTabs = (modules) => {
  const normalized = normalizeEnabledModules(modules);
  const tabs = [
    { id: "quick", moduleKey: "quickCommerce" },
    { id: "food", moduleKey: "food" },
    { id: "porter", moduleKey: "porter" },
  ];
  return tabs.filter((tab) => normalized[tab.moduleKey] !== false);
};

export const countEnabledModules = (modules) => {
  const normalized = normalizeEnabledModules(modules);
  return ALLOWED_MODULE_KEYS.filter((key) => normalized[key] !== false).length;
};

export const canDisableModule = (modules, moduleKey) => {
  if (!ALLOWED_MODULE_KEYS.includes(moduleKey)) return false;
  const normalized = normalizeEnabledModules(modules);
  if (normalized[moduleKey] === false) return true;
  const enabledCount = countEnabledModules(normalized);
  return enabledCount > 1;
};

export const validateModuleToggle = (modules, moduleKey, nextEnabled) => {
  if (!ALLOWED_MODULE_KEYS.includes(moduleKey)) {
    return { valid: false, message: "Unknown module selected." };
  }

  if (typeof nextEnabled !== "boolean") {
    return { valid: false, message: "Invalid module state." };
  }

  const nextModules = {
    ...normalizeEnabledModules(modules),
    [moduleKey]: nextEnabled,
  };

  if (countEnabledModules(nextModules) === 0) {
    return {
      valid: false,
      message: "At least one customer module must remain enabled.",
    };
  }

  return { valid: true, nextModules };
};

export const buildModulesUpdatePayload = (modules) => {
  const normalized = normalizeEnabledModules(modules);
  const payload = {};
  ALLOWED_MODULE_KEYS.forEach((key) => {
    payload[key] = normalized[key] !== false;
  });
  return payload;
};
