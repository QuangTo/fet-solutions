import { apiRequest } from "./client.js";
import { invalidateQueries, useQuery } from "./query-client.js";

const PAGE_DATA_STALE_TIME = 20_000;

function sessionScope(session) {
  return {
    name: session?.name || "Người dùng mẫu",
    role: session?.role || "warehouse",
  };
}

function pageQuery(page, path, session, options = {}) {
  return useQuery({
    queryKey: ["page-data", page, sessionScope(session)],
    queryFn: () => apiRequest(path, {}, session),
    staleTime: PAGE_DATA_STALE_TIME,
    ...options,
  });
}

export function masterDataQuery(session, options) {
  return pageQuery("master", "/master-data", session, options);
}

export function operationsDataQuery(session, options) {
  return pageQuery("operations", "/operations-data", session, options);
}

export function receiptDataQuery(session, options) {
  return pageQuery("receipt", "/receipt-data", session, options);
}

export function dispatchDataQuery(session, options) {
  return pageQuery("dispatch", "/dispatch-data", session, options);
}

export function reportDataQuery(session, options) {
  return pageQuery("report", "/report-data", session, options);
}

export function invalidatePageData(page) {
  if (page) {
    invalidateQueries(["page-data", page]);
    return;
  }
  invalidateQueries(["page-data"]);
}
