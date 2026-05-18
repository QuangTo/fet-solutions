export const TABLE_ROW_LIMIT = 10;

export function paginateRows(rows, currentPage, pageSize = TABLE_ROW_LIMIT) {
  const pageCount = Math.max(Math.ceil(rows.length / pageSize), 1);
  const page = Math.min(Math.max(currentPage, 1), pageCount);
  const start = (page - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageCount
  };
}

export function paginationMarkup({ page, pageCount, scopeAttribute, scope }) {
  return pageCount > 1 ? `
    <button type="button" ${scopeAttribute}="${scope}" data-page-action="prev" ${page === 1 ? "disabled" : ""}>Trước</button>
    <span>Trang ${page} / ${pageCount}</span>
    <button type="button" ${scopeAttribute}="${scope}" data-page-action="next" ${page === pageCount ? "disabled" : ""}>Sau</button>
  ` : "";
}
