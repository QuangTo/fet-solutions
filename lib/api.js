const API_BASE_URL = "/api";

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
    throw new Error(body.message || "Không thể kết nối API.");
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
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
    staleTime: staleTimes[page] || 15_000,
  };
}
