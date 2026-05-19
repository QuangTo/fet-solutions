const { normalizeRole } = require("./roles");

function requestContext(request, _response, next) {
  request.user = {
    id: request.header("x-user-id") || null,
    name: decodeURIComponent(request.header("x-user-name") || "Người dùng API"),
    role: normalizeRole(request.header("x-user-role")),
  };
  next();
}

function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (request.user.role === "admin" || allowedRoles.includes(request.user.role)) {
      next();
      return;
    }

    response.status(403).json({
      error: "FORBIDDEN",
      message: "Vai trò hiện tại không có quyền thực hiện thao tác này.",
    });
  };
}

module.exports = { requestContext, requireRole };
