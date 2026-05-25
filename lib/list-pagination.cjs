/** Shared list pagination defaults (server + client). */

/** Default rows per API request when pageSize is omitted. */
const DEFAULT_PAGE_SIZE = 50;
/** Max rows shown per table page in the UI (AGENTS.md). */
const UI_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function parseListPagination(input = {}) {
  const raw =
    typeof input?.get === "function"
      ? {
          page: input.get("page"),
          pageSize: input.get("pageSize"),
        }
      : input;

  const page = Math.max(1, Number.parseInt(raw.page, 10) || 1);
  const requested = Number.parseInt(raw.pageSize, 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(requested) ? requested : DEFAULT_PAGE_SIZE),
  );

  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize,
  };
}

function toPaginatedList(items, total, { page, pageSize }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  return {
    items: items || [],
    page,
    pageCount: Math.max(Math.ceil(safeTotal / pageSize), 1),
    pageSize,
    total: safeTotal,
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  UI_PAGE_SIZE,
  parseListPagination,
  toPaginatedList,
};
