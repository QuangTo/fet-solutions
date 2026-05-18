const roles = {
  driver: "Lái xe",
  warehouse: "Thủ kho",
  accountant: "Kế toán",
  admin: "Admin",
};

const pageAccess = {
  "tong-quan": ["driver", "warehouse", "accountant", "admin"],
  "nhap-hang": ["driver", "warehouse", "admin"],
  "xuat-hang": ["driver", "warehouse", "admin"],
  "quan-ly": ["warehouse", "admin"],
  "bao-cao": ["accountant", "admin"],
  "cai-dat": ["admin"],
};

function normalizeRole(role = "driver") {
  const normalized = role.toString().trim().toLowerCase();
  if (normalized === "accounting") return "accountant";
  return roles[normalized] ? normalized : "driver";
}

module.exports = { normalizeRole, pageAccess, roles };
