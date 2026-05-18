import { escapeHtml } from "./html.js";
import { paginateRows, paginationMarkup } from "./table.js";

export const masterDataConfig = {
  customers: {
    typeLabel: "khách hàng",
    fieldLabel: "Tên khách hàng",
  },
  vehicles: {
    typeLabel: "xe vận chuyển",
    fieldLabel: "Biển số xe",
    normalize: (value) => value.trim().toUpperCase(),
  },
  drivers: {
    typeLabel: "tài xế",
    fieldLabel: "Tên tài xế",
  },
};

export function normalizeMasterValue(listName, value) {
  const normalize = masterDataConfig[listName]?.normalize;
  return normalize ? normalize(value) : value.trim();
}

export function masterListView({ items, page, listName, emptyMessage }) {
  const numberedItems = items.map((value, index) => ({ value, index }));
  const paginated = paginateRows(numberedItems, page);

  return {
    page: paginated.page,
    listHtml:
      paginated.rows.map((item) => masterItemMarkup(item, listName)).join("") ||
      `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`,
    paginationHtml: paginationMarkup({
      page: paginated.page,
      pageCount: paginated.pageCount,
      scopeAttribute: "data-master-page",
      scope: listName,
    }),
  };
}

function masterItemMarkup(item, listName) {
  return `
    <div class="master-item">
      <strong>${escapeHtml(item.value)}</strong>
      <div>
        <button type="button" data-master="${listName}" data-action="edit" data-index="${item.index}">Sửa</button>
        <button type="button" data-master="${listName}" data-action="delete" data-index="${item.index}">Xóa</button>
      </div>
    </div>
  `;
}
