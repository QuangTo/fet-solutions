const { normalizeRole } = require("./roles");
const { requireAnyPageAccess } = require("./page-access");
const { loadPageAccess } = require("./services/settings");
const { parseListPagination } = require("./list-pagination");

function json(data, status = 200) {
  return Response.json(data, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function noContent() {
  return new Response(null, {
    headers: { "Cache-Control": "no-store" },
    status: 204,
  });
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return "Người dùng API";
  }
}

function userFromRequest(request) {
  const url = new URL(request.url);
  return {
    id: request.headers.get("x-user-id") || null,
    name: safeDecodeURIComponent(
      request.headers.get("x-user-name") || "Người dùng API",
    ),
    role: normalizeRole(request.headers.get("x-user-role") || "driver"),
    siteId: request.headers.get("x-site-id") || url.searchParams.get("siteId"),
  };
}

function requireRole(user, ...allowedRoles) {
  if (user.role === "admin" || allowedRoles.includes(user.role)) return;
  const error = new Error("Vai trò hiện tại không có quyền thực hiện thao tác này.");
  error.statusCode = 403;
  error.code = "FORBIDDEN";
  throw error;
}

function requireAuthenticatedUser(user) {
  if (user.id) return;
  const error = new Error("Cần đăng nhập để xem dữ liệu site.");
  error.statusCode = 401;
  error.code = "AUTH_REQUIRED";
  throw error;
}

async function bodyJson(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function readListQuery(url) {
  return parseListPagination(url.searchParams);
}

function readListFilters(url) {
  const value = (key) => url.searchParams.get(key) || null;
  return {
    customerId: value("customerId"),
    dateFrom: value("dateFrom"),
    dateTo: value("dateTo"),
    date: value("date"),
    driver: value("driver"),
    periodClosedAt: value("periodClosedAt"),
    periodOpenAt: value("periodOpenAt"),
    plate: value("plate"),
  };
}

function formatCaughtError(error) {
  if (error?.name === "ZodError" || Array.isArray(error?.issues)) {
    const field = error.issues?.[0]?.path?.[0];
    if (field === "phone") {
      return {
        code: "VALIDATION_ERROR",
        message: "Số điện thoại không hợp lệ.",
        statusCode: 400,
      };
    }
    if (field === "password") {
      return {
        code: "VALIDATION_ERROR",
        message: "Mật khẩu không hợp lệ.",
        statusCode: 400,
      };
    }
    return {
      code: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ.",
      statusCode: 400,
    };
  }

  return {
    code: error.code,
    message: error.message || "Không thể xử lý API.",
    statusCode: error.statusCode || error.status || 500,
  };
}

/**
 * Wrap a Next route handler with shared auth, page-access, role checks,
 * body/params parsing and uniform error formatting.
 *
 * @param {(ctx: {body: any, params: any, request: Request, url: URL, user: any}) => any} handler
 * @param {{public?: boolean, access?: string[], roles?: string[]}} [options]
 */
function withApi(handler, options = {}) {
  return async function routeHandler(request, context) {
    try {
      const user = userFromRequest(request);

      if (!options.public) {
        requireAuthenticatedUser(user);
      }
      if (options.access) {
        const pageAccess = await loadPageAccess();
        requireAnyPageAccess(pageAccess, user, options.access);
      }
      if (options.roles) {
        requireRole(user, ...options.roles);
      }

      const params = context?.params ? await context.params : {};
      const url = new URL(request.url);
      const body = await bodyJson(request);

      const result = await handler({ body, params, request, url, user });
      if (result instanceof Response) return result;
      return json(result);
    } catch (error) {
      const formatted = formatCaughtError(error);
      return json(
        {
          code: formatted.code,
          error: formatted.code || "API_ERROR",
          message: formatted.message,
        },
        formatted.statusCode,
      );
    }
  };
}

module.exports = {
  json,
  noContent,
  readListFilters,
  readListQuery,
  requireAuthenticatedUser,
  requireRole,
  userFromRequest,
  withApi,
};
