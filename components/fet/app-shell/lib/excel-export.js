import * as XLSX from "xlsx";

function cellValue(row, column) {
  const value =
    typeof column.value === "function" ? column.value(row) : row[column.value];
  return value == null ? "" : value;
}

function safeFilename(value) {
  const base = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\.xlsx$/i, "")
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "fet-export"}.xlsx`;
}

function safeSheetName(value = "Du lieu") {
  const name = value.toString().replace(/[\][*?/\\:]/g, " ").trim();
  return (name || "Du lieu").slice(0, 31);
}

function columnWidth(label, rows, column) {
  const maxLength = rows.reduce((max, row) => {
    const value = cellValue(row, column).toString();
    return Math.max(max, value.length);
  }, label.length);
  return { wch: Math.min(Math.max(maxLength + 2, 10), 36) };
}

export function downloadExcel({ columns, filename, rows, sheetName }) {
  if (typeof window === "undefined" || !rows?.length) return;

  const header = columns.map((column) => column.label);
  const body = rows.map((row) =>
    columns.map((column) => cellValue(row, column)),
  );
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  worksheet["!cols"] = columns.map((column) =>
    columnWidth(column.label, rows, column),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(sheetName),
  );
  XLSX.writeFile(workbook, safeFilename(filename), { compression: true });
}
