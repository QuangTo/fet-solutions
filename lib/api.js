const API_BASE_URL =
  typeof window !== "undefined" &&
  (window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost")
    ? "http://127.0.0.1:4175/api"
    : "/api";

export async function apiRequest(path, options = {}, session = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-user-role": session?.role || "warehouse",
      "x-user-name": encodeURIComponent(session?.name || "Người dùng mẫu"),
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
    queryKey: ["page-data", page, session?.role, session?.name],
    queryFn: () => apiRequest(paths[page], {}, session),
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
    staleTime: staleTimes[page] || 15_000,
  };
}
