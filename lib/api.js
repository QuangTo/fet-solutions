import { parseApiErrorMessage } from "./api-errors";

const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code || null;
    this.status = status || 0;
  }
}

export async function apiRequest(path, options = {}, session = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-user-id": session?.id || "",
      "x-user-role": session?.role || "warehouse",
      "x-user-name": encodeURIComponent(session?.name || "Người dùng mẫu"),
      "x-site-id": session?.siteId || "",
      ...(options.headers || {}),
    },
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

export function saveAppSetting(key, value, session) {
  return apiRequest(`/settings/${key}`, {
    body: JSON.stringify({ value }),
    method: "PUT",
  }, session);
}

export function accessQueryOptions(session) {
  return {
    enabled: Boolean(session),
    gcTime: 10 * 60_000,
    queryFn: () => apiRequest("/access", {}, session),
    queryKey: ["access", session?.id, session?.siteId],
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  };
}

export function billingQueryOptions(session, { enabled = true } = {}) {
  return {
    enabled: Boolean(session) && enabled,
    gcTime: 10 * 60_000,
    queryFn: () => apiRequest("/billing", {}, session),
    queryKey: ["billing", session?.id, session?.role, session?.siteId],
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  };
}

export function billingStatusQueryOptions(session) {
  return {
    enabled: Boolean(session),
    gcTime: 10 * 60_000,
    queryFn: () => apiRequest("/billing/status", {}, session),
    queryKey: ["billing-status", session?.id, session?.siteId],
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  };
}

export function pageQueryOptions(page, session) {
  const paths = {
    dispatch: "/dispatch-data",
    master: "/master-data",
    operations: "/operations-data",
    receipt: "/receipt-data",
    report: "/report-data",
  };
  const staleTimes = {
    dispatch: 15_000,
    master: 5 * 60_000,
    operations: 15_000,
    receipt: 15_000,
    report: 30_000,
  };

  return {
    gcTime: 10 * 60_000,
    placeholderData: (previousData) => previousData,
    queryKey: [
      "page-data",
      page,
      session?.id,
      session?.role,
      session?.name,
      session?.siteId,
    ],
    queryFn: () => apiRequest(paths[page], {}, session),
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: page === "operations" || page === "receipt" || page === "dispatch",
    staleTime: staleTimes[page] || 15_000,
  };
}
