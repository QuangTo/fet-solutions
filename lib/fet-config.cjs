/** Shared FET config — safe for client (via fet-domain) and server (require). */

const roles = {
  admin: "Admin",
  warehouse: "Thủ kho",
  accountant: "Kế toán",
  driver: "Tài xế",
};

const LEGACY_PAGE_ALIASES = {
  "tong-quan": "dashboard",
};

const pages = {
  dashboard: {
    icon: "LayoutDashboard",
    title: "Dashboard",
    subtitle:
      "Theo dõi tồn kho, tiến độ xuất hàng và những khách hàng cần ưu tiên xử lý.",
    roles: ["admin", "warehouse", "accountant", "driver"],
  },
  "nhap-hang": {
    icon: "PackagePlus",
    title: "Nhập hàng",
    subtitle: "Tạo đợt nhập, thêm hàng cho khách hàng và kiểm tra tồn còn lại.",
    roles: ["admin", "warehouse", "driver"],
  },
  "xuat-hang": {
    icon: "Truck",
    title: "Xuất hàng",
    subtitle:
      "Chọn khách hàng, xe, tài xế và số lượng hàng xuất dựa trên tồn kho khả dụng.",
    roles: ["admin", "warehouse", "driver"],
  },
  "bao-cao": {
    icon: "FileCheck2",
    title: "Báo cáo",
    subtitle:
      "Xem trạng thái chốt hóa đơn và toàn bộ lịch sử xuất hàng theo từng khách hàng.",
    roles: ["admin", "accountant"],
  },
  "quan-ly": {
    icon: "Settings2",
    title: "Quản lý",
    subtitle: "Cập nhật tài khoản, khách hàng, xe, và thanh toán.",
    roles: ["admin"],
  },
  "cai-dat": {
    icon: "SlidersHorizontal",
    title: "Cài đặt",
    subtitle: "Tùy chỉnh giao diện vận hành và quản lý quyền truy cập.",
    roles: ["admin"],
  },
};

const pageOrder = Object.keys(pages);

const loginPath = "/login";

const pagePaths = {
  dashboard: "/dashboard",
  "nhap-hang": "/nhap-hang",
  "xuat-hang": "/xuat-hang",
  "bao-cao": "/bao-cao",
  "quan-ly": "/quan-ly",
  "cai-dat": "/settings",
};

const pageIdFromPathname = {
  ...Object.fromEntries(
    Object.entries(pagePaths).map(([pageId, path]) => [path, pageId]),
  ),
  [loginPath]: "dashboard",
};

const configurableRoleOrder = ["driver", "warehouse", "accountant", "admin"];

const DEFAULT_ROLE = "warehouse";

const DEFAULT_UNIT = "đơn vị";

function normalizePageId(pageId = "") {
  const key = pageId?.toString().trim();
  return LEGACY_PAGE_ALIASES[key] || key;
}

function normalizeRole(role = DEFAULT_ROLE) {
  const normalized = role?.toString().trim().toLowerCase() || DEFAULT_ROLE;
  if (normalized === "accounting") return "accountant";
  return roles[normalized] ? normalized : DEFAULT_ROLE;
}

function migratePageAccessInput(input) {
  if (!input || typeof input !== "object") return input;
  const migrated = {};
  Object.entries(input).forEach(([pageId, allowed]) => {
    migrated[normalizePageId(pageId)] = allowed;
  });
  return migrated;
}

function defaultPageAccess() {
  return Object.fromEntries(
    Object.entries(pages).map(([pageId, page]) => [pageId, [...page.roles]]),
  );
}

function normalizePageAccess(input) {
  const migrated = migratePageAccessInput(input);
  if (!migrated || typeof migrated !== "object") return defaultPageAccess();

  const access = {};
  Object.keys(pages).forEach((pageId) => {
    if (!Array.isArray(migrated[pageId])) {
      access[pageId] = [...defaultPageAccess()[pageId]];
      return;
    }
    const allowed = migrated[pageId]
      .map((role) => normalizeRole(role))
      .filter((role) => roles[role]);
    access[pageId] = [...new Set(["admin", ...allowed])];
  });

  return access;
}

function roleCanAccessPage(pageAccess, role, pageId) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return true;
  const resolvedPageId = normalizePageId(pageId);
  if (!pageAccess?.[resolvedPageId]) return false;
  return pageAccess[resolvedPageId].includes(normalized);
}

function requireAnyPageAccess(pageAccess, user, pageIds) {
  if (normalizeRole(user.role) === "admin") return;
  const role = normalizeRole(user.role);
  const allowed = pageIds.some((pageId) =>
    roleCanAccessPage(pageAccess, role, pageId),
  );
  if (!allowed) {
    const error = new Error(
      "Vai trò hiện tại không có quyền thực hiện thao tác này.",
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
}

const managedUserRoles = configurableRoleOrder.map((role) => [role, roles[role]]);

module.exports = {
  DEFAULT_ROLE,
  DEFAULT_UNIT,
  configurableRoleOrder,
  defaultPageAccess,
  managedUserRoles,
  normalizePageAccess,
  normalizePageId,
  normalizeRole,
  loginPath,
  pageIdFromPathname,
  pageOrder,
  pagePaths,
  pages,
  requireAnyPageAccess,
  roleCanAccessPage,
  roles,
};
