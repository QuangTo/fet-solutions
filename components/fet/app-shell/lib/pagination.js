export function paginate(rows, page, pageSize = 10) {
  const pageCount = Math.max(Math.ceil(rows.length / pageSize), 1);
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pageCount,
    rows: rows.slice(start, start + pageSize),
  };
}
