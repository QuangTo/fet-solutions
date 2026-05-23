const { normalizeRole, pageAccess: defaultPageAccessMap, roles } = require("./roles");

const pageIds = Object.keys(defaultPageAccessMap);

function defaultPageAccess() {
  return Object.fromEntries(
    Object.entries(defaultPageAccessMap).map(([pageId, allowed]) => [
      pageId,
      [...allowed],
    ]),
  );
}

function normalizePageAccess(input) {
  if (!input || typeof input !== "object") return defaultPageAccess();

  const access = {};
  pageIds.forEach((pageId) => {
    if (!Array.isArray(input[pageId])) {
      access[pageId] = [...defaultPageAccess()[pageId]];
      return;
    }
    const allowed = input[pageId]
      .map((role) => normalizeRole(role))
      .filter((role) => roles[role]);
    access[pageId] = [...new Set(["admin", ...allowed])];
  });

  return access;
}

function roleCanAccessPage(pageAccess, role, pageId) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return true;
  return (pageAccess[pageId] || []).includes(normalized);
}

function requireAnyPageAccess(pageAccess, user, pageIds) {
  if (normalizeRole(user.role) === "admin") return;
  const role = normalizeRole(user.role);
  const allowed = pageIds.some((pageId) => roleCanAccessPage(pageAccess, role, pageId));
  if (!allowed) {
    const error = new Error(
      "Vai trò hiện tại không có quyền thực hiện thao tác này.",
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
}

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
