import {
  defaultPageAccess,
  normalizePageAccess,
  requireAnyPageAccess,
  roleCanAccessPage,
} from "../fet-config.js";

export {
  defaultPageAccess,
  normalizePageAccess,
  requireAnyPageAccess,
  roleCanAccessPage,
};

export function parseSettingValue(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export default {
  defaultPageAccess,
  normalizePageAccess,
  parseSettingValue,
  requireAnyPageAccess,
  roleCanAccessPage,
};
