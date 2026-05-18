export function escapeHtml(value = "") {
  return value
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function selectedAttribute(value, selectedValue) {
  return value === selectedValue ? "selected" : "";
}

export function optionMarkup({ value, label = value, selectedValue = "" }) {
  const safeValue = escapeHtml(value);
  return `<option value="${safeValue}" ${selectedAttribute(value, selectedValue)}>${escapeHtml(label)}</option>`;
}

export function emptyStateMarkup({ title = "", copy = "" }) {
  return `
    <div class="empty-state">
      ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
      ${copy ? `<span>${escapeHtml(copy)}</span>` : ""}
    </div>
  `;
}

export function sampleTableRow(
  colspan,
  message = "Chưa chọn khách hàng. Đây là khu vực hiển thị dữ liệu sau khi chọn khách hàng.",
) {
  return `
    <tr>
      <td colspan="${colspan}">${escapeHtml(message)}</td>
    </tr>
  `;
}
