function csvCell(value) {
  const text = value == null ? "" : value.toString();
  return `"${text.replaceAll('"', '""')}"`;
}

function safeFilename(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function downloadCsv({ columns, filename, rows }) {
  if (typeof window === "undefined" || !rows?.length) return;
  const header = columns.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns
      .map((column) =>
        csvCell(
          typeof column.value === "function"
            ? column.value(row)
            : row[column.value],
        ),
      )
      .join(","),
  );
  const csv = `\uFEFF${[header, ...body].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename(filename || "fet-export.csv") || "fet-export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
