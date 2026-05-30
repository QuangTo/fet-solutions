import { normalizeRole } from "../fet-config.js";
import { requireAnyPageAccess } from "./page-access.js";
import { loadPageAccess } from "./services/settings.js";
import { parseListPagination } from "../list-pagination.js";
import {
  attachSessionCookie,
  clearSessionCookie,
  sessionFromRequest,
  slideSessionOnResponse,
} from "./session-auth.js";

export function json(data, status = 200) {
  return Response.json(data, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export function noContent() {
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

export function userFromRequest(request) {
  const url = new URL(request.url);
  const session = sessionFromRequest(request);
  if (session?.id) {
    return {
      id: session.id,
      name: safeDecodeURIComponent(session.name || "Người dùng API"),
      role: normalizeRole(session.role || "driver"),
      siteId: session.siteId || url.searchParams.get("siteId"),
    };
  }

  if (process.env.FET_ALLOW_HEADER_AUTH === "true") {
    return {
      id: request.headers.get("x-user-id") || null,
      name: safeDecodeURIComponent(
        request.headers.get("x-user-name") || "Người dùng API",
      ),
      role: normalizeRole(request.headers.get("x-user-role") || "driver"),
      siteId: request.headers.get("x-site-id") || url.searchParams.get("siteId"),
    };
  }

  return {
    id: null,
    name: "Người dùng API",
    role: normalizeRole("driver"),
    siteId: url.searchParams.get("siteId"),
  };
}

export function requireRole(user, ...allowedRoles) {
  if (user.role === "admin" || allowedRoles.includes(user.role)) return;
  const error = new Error("Vai trò hiện tại không có quyền thực hiện thao tác này.");
  error.statusCode = 403;
  error.code = "FORBIDDEN";
  throw error;
}

export function requireAuthenticatedUser(user) {
  if (user.id) return;
  const error = new Error("Cần đăng nhập để xem dữ liệu site.");
  error.statusCode = 401;
  error.code = "AUTH_REQUIRED";
  throw error;
}

export async function bodyJson(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      const error = new Error("JSON body must be an object.");
      error.statusCode = 400;
      error.code = "INVALID_JSON";
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error?.statusCode) throw error;
    const invalid = new Error("Request body is not valid JSON.");
    invalid.statusCode = 400;
    invalid.code = "INVALID_JSON";
    throw invalid;
  }
}

export function readListQuery(url) {
  return parseListPagination(url.searchParams);
}

export function readListFilters(url) {
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
  if (error?.code === "INVALID_JSON") {
    return {
      code: "INVALID_JSON",
      message: error.message || "Request body is not valid JSON.",
      statusCode: 400,
    };
  }
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

export function withApiLogin(handler) {
  return async function routeHandler(request) {
    try {
      const body = await bodyJson(request);
      const user = await handler(body);
      return attachSessionCookie(json(user), user);
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

export function withApi(handler, options = {}) {
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
      let response = result instanceof Response ? result : json(result);
      if (
        !options.public &&
        response.status >= 200 &&
        response.status < 400
      ) {
        response = slideSessionOnResponse(response, request);
      }
      return response;
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

const http = {
  json,
  noContent,
  readListFilters,
  readListQuery,
  requireAuthenticatedUser,
  requireRole,
  userFromRequest,
  withApi,
  withApiLogin,
  clearSessionCookie,
  bodyJson,
};

export { clearSessionCookie };
export default http;
