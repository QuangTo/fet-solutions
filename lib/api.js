import { parseApiErrorMessage } from "./api-errors";
import { DEFAULT_PAGE_SIZE, UI_PAGE_SIZE } from "./list-pagination";

export const API_BASE_URL = "/api/v1";
export { DEFAULT_PAGE_SIZE, UI_PAGE_SIZE };

export function buildListQuery({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  ...filters
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

const defaultQueryOptions = {
  gcTime: 10 * 60_000,
  refetchOnMount: false,
  refetchOnReconnect: true,
  refetchOnWindowFocus: false,
};

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code || null;
    this.status = status || 0;
  }
}

export async function apiRequest(path, options = {}, session = null) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {}),
  };

  // Dev-only: curl/scripts without cookies (set FET_ALLOW_HEADER_AUTH=true on server).
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_FET_ALLOW_HEADER_AUTH === "true" &&
    session?.id
  ) {
    headers["x-user-id"] = session.id;
    headers["x-user-role"] = session.role || "warehouse";
    headers["x-user-name"] = encodeURIComponent(session.name || "Người dùng mẫu");
    if (session.siteId) headers["x-site-id"] = session.siteId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const fallback =
      path === "/users/login"
        ? "Không thể đăng nhập."
        : "Không thể kết nối API.";
    throw new ApiError(parseApiErrorMessage(body, fallback), {
      code: body.code || body.error || null,
      status: response.status,
    });
  }

  if (response.status === 204) return null;
  return response.json();
}

export function logoutRequest() {
  return apiRequest("/users/logout", { method: "POST" });
}

export function saveAppSetting(key, value, session) {
  return apiRequest(`/settings/${key}`, {
    body: JSON.stringify({ value }),
    method: "PUT",
  }, session);
}

/** Page key for GET /app-context */
export function appContextPageFor(visiblePage) {
  if (visiblePage === "bao-cao") return "accounting";
  return "shell";
}

export function appContextQueryOptions(session, page = "shell") {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryFn: () =>
      apiRequest(`/app-context?page=${encodeURIComponent(page)}`, {}, session),
    queryKey: ["app-context", session?.id, session?.siteId, page],
    staleTime: page === "shell" ? 5 * 60_000 : 30_000,
  };
}

export function shellContextQueryOptions(session) {
  return appContextQueryOptions(session, "shell");
}

export function dashboardSummaryQueryOptions(session) {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryFn: () => apiRequest("/dashboard-summary", {}, session),
    queryKey: ["dashboard-summary", session?.id, session?.siteId],
    staleTime: 30_000,
  };
}

export function accountingContextQueryOptions(session) {
  return appContextQueryOptions(session, "accounting");
}

export function receiptsListQueryOptions(session, filters = {}, page = 1) {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryKey: ["receipts-list", session?.id, session?.siteId, filters, page],
    queryFn: () =>
      apiRequest(
        `/receipts${buildListQuery({ page, pageSize: UI_PAGE_SIZE, ...filters })}`,
        {},
        session,
      ),
    staleTime: 30_000,
  };
}

export function dispatchesListQueryOptions(session, filters = {}, page = 1) {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryKey: ["dispatches-list", session?.id, session?.siteId, filters, page],
    queryFn: () =>
      apiRequest(
        `/dispatches${buildListQuery({ page, pageSize: UI_PAGE_SIZE, ...filters })}`,
        {},
        session,
      ),
    staleTime: 30_000,
  };
}

export function accountingClosuresQueryOptions(session, page = 1, pageSize = UI_PAGE_SIZE) {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryKey: ["accounting-closures", session?.id, session?.siteId, page, pageSize],
    queryFn: () =>
      apiRequest(
        `/accounting/closures${buildListQuery({ page, pageSize })}`,
        {},
        session,
      ),
    staleTime: 30_000,
  };
}

export function usersListQueryOptions(session, page = 1) {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryKey: ["users-list", session?.id, session?.role, session?.siteId, page],
    queryFn: () =>
      apiRequest(
        `/users${buildListQuery({ page, pageSize: UI_PAGE_SIZE })}`,
        {},
        session,
      ),
    staleTime: 60_000,
  };
}

export function billingQueryOptions(session, { enabled = true } = {}) {
  return {
    ...defaultQueryOptions,
    enabled: Boolean(session) && enabled,
    queryFn: () => apiRequest("/billing", {}, session),
    queryKey: ["billing", session?.id, session?.role, session?.siteId],
    staleTime: 60_000,
  };
}

export function pageQueryOptions(page, session, listParams = {}) {
  const paths = {
    dispatch: "/dispatch-data",
    master: "/master-data",
    receipt: "/receipt-data",
  };
  const staleTimes = {
    dispatch: 30_000,
    master: 5 * 60_000,
    receipt: 30_000,
  };
  const listQuery = buildListQuery(listParams);

  return {
    ...defaultQueryOptions,
    enabled: Boolean(session),
    placeholderData: (previousData) => previousData,
    queryKey: [
      "page-data",
      page,
      session?.id,
      session?.role,
      session?.name,
      session?.siteId,
      listParams,
    ],
    queryFn: () => apiRequest(`${paths[page]}${listQuery}`, {}, session),
    staleTime: staleTimes[page] || 30_000,
    refetchOnWindowFocus: page === "receipt" || page === "dispatch",
  };
}
