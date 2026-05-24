const {
  defaultPageAccess,
  normalizePageAccess,
  requireAnyPageAccess,
  roleCanAccessPage,
} = require("../fet-config.cjs");

function parseSettingValue(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

module.exports = {
  defaultPageAccess,
  normalizePageAccess,
  parseSettingValue,
  requireAnyPageAccess,
  roleCanAccessPage,
};
