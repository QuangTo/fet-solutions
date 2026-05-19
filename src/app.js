import { apiRequest } from "./api/client.js";
import { enhanceDateInputs } from "./ui/date-input.js";
import { bindDialogDismiss, hideDialog, showDialog } from "./ui/dialog.js";
import {
  emptyStateMarkup,
  escapeHtml,
  optionMarkup,
  sampleTableRow,
} from "./ui/html.js";
import {
  masterDataConfig,
  masterListView,
  normalizeMasterValue,
} from "./ui/master-data.js";
import { paginateRows, paginationMarkup } from "./ui/table.js";

const SESSION_KEY = "fet-logistics-session";
const SETTINGS_KEY = "fet-logistics-settings";

const roles = {
  admin: "Admin",
  warehouse: "Thủ kho",
  accountant: "Kế toán",
  driver: "Lái xe",
};

const pages = {
  "tong-quan": {
    title: "Tổng quan",
    subtitle:
      "Theo dõi tồn kho, tiến độ xuất hàng và những khách hàng cần ưu tiên xử lý.",
    roles: ["admin", "warehouse", "accountant", "driver"],
  },
  "nhap-hang": {
    title: "Nhập hàng",
    subtitle:
      "Tạo đợt nhập, thêm nhiều loại hàng cho cùng khách hàng và kiểm tra tồn còn lại.",
    roles: ["admin", "warehouse", "driver"],
  },
  "xuat-hang": {
    title: "Xuất hàng",
    subtitle:
      "Chọn khách hàng, xe, tài xế và số lượng hàng xuất dựa trên tồn kho khả dụng.",
    roles: ["admin", "warehouse", "driver"],
  },
  "cai-dat": {
    title: "Cài đặt",
    subtitle:
      "Tùy chỉnh giao diện để phù hợp cách anh muốn quan sát dữ liệu mỗi ngày.",
    roles: ["admin"],
  },
  "quan-ly": {
    title: "Quản lý",
    subtitle:
      "Cập nhật danh sách khách hàng, xe và tài xế để các bước nhập xuất luôn nhất quán.",
    roles: ["admin", "warehouse"],
  },
  "bao-cao": {
    title: "Báo cáo",
    subtitle:
      "Xem trạng thái chốt hóa đơn và toàn bộ lịch sử xuất hàng theo từng khách hàng.",
    roles: ["admin", "accountant"],
  },
};

const legacyRoutes = {
  dashboard: "tong-quan",
  receipt: "nhap-hang",
  dispatch: "xuat-hang",
  "master-data": "quan-ly",
  "danh-muc": "quan-ly",
  reports: "bao-cao",
};

let state = emptyState();
let session = loadSession();
let settings = loadSettings();
let activePage = getInitialPage();
let selectedCustomer = "";
let customerPage = 1;
let receiptSummaryPage = 1;
let receiptHistoryPage = 1;
let dispatchHistoryPage = 1;
let reportHistoryPage = 1;
let invoiceHistoryPage = 1;
let customerManagementPage = 1;
let vehicleManagementPage = 1;
let driverManagementPage = 1;
let selectedReportCustomer = "";
let pendingInvoiceCustomer = "";
let pendingMasterEdit = null;
let pendingMasterDelete = null;
let dispatchToastTimer;
let overviewPeriod = "month";
const dateSortDirections = {
  dispatchHistory: "desc",
  invoiceHistory: "desc",
  receiptHistory: "desc",
  reportHistory: "desc",
};

const selectors = {
  loginScreen: document.querySelector("#login-screen"),
  loginForm: document.querySelector("#login-form"),
  mobileNavBackdrop: document.querySelector("#mobile-nav-backdrop"),
  mobileNavToggle: document.querySelector("#mobile-nav-toggle"),
  sidebarActiveUser: document.querySelector("#sidebar-active-user"),
  sidebarActiveRole: document.querySelector("#sidebar-active-role"),
  sidebarUserButton: document.querySelector("#sidebar-user-button"),
  pageTitle: document.querySelector("#page-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  overviewPeriodControl: document.querySelector("#overview-period-control"),
  overviewPeriod: document.querySelector("#overview-period"),
  stockForm: document.querySelector("#stock-form"),
  dispatchForm: document.querySelector("#dispatch-form"),
  dispatchSuccess: document.querySelector("#dispatch-success"),
  dispatchHistoryFilter: document.querySelector("#dispatch-history-filter"),
  dispatchHistoryTable: document.querySelector("#dispatch-history-table"),
  dispatchHistoryPagination: document.querySelector(
    "#dispatch-history-pagination",
  ),
  settingsForm: document.querySelector("#settings-form"),
  customerForm: document.querySelector("#customer-form"),
  customerManagementList: document.querySelector("#customer-management-list"),
  customerManagementPagination: document.querySelector(
    "#customer-management-pagination",
  ),
  vehicleForm: document.querySelector("#vehicle-form"),
  driverForm: document.querySelector("#driver-form"),
  vehicleList: document.querySelector("#vehicle-list"),
  vehiclePagination: document.querySelector("#vehicle-pagination"),
  driverList: document.querySelector("#driver-list"),
  driverPagination: document.querySelector("#driver-pagination"),
  customerList: document.querySelector("#customer-list"),
  customerGrid: document.querySelector("#customer-grid"),
  customerPagination: document.querySelector("#customer-pagination"),
  inventoryChart: document.querySelector("#inventory-chart"),
  customerDetailTitle: document.querySelector("#customer-detail-title"),
  customerDetailCopy: document.querySelector("#customer-detail-copy"),
  stockTable: document.querySelector("#stock-table"),
  stockPagination: document.querySelector("#stock-pagination"),
  inventoryTable: document.querySelector("#inventory-table"),
  receiptHistoryPagination: document.querySelector(
    "#receipt-history-pagination",
  ),
  accountingReport: document.querySelector("#accounting-report"),
  reportHistoryTable: document.querySelector("#report-history-table"),
  reportHistoryPagination: document.querySelector("#report-history-pagination"),
  invoiceHistoryTable: document.querySelector("#invoice-history-table"),
  invoiceHistoryPagination: document.querySelector(
    "#invoice-history-pagination",
  ),
  invoiceConfirmDialog: document.querySelector("#invoice-confirm-dialog"),
  invoiceConfirmTitle: document.querySelector("#invoice-confirm-title"),
  invoiceConfirmCopy: document.querySelector("#invoice-confirm-copy"),
  invoiceConfirmApprove: document.querySelector("#invoice-confirm-approve"),
  invoiceConfirmCancel: document.querySelector("#invoice-confirm-cancel"),
  masterEditDialog: document.querySelector("#master-edit-dialog"),
  masterEditTitle: document.querySelector("#master-edit-title"),
  masterEditCopy: document.querySelector("#master-edit-copy"),
  masterEditForm: document.querySelector("#master-edit-form"),
  masterEditLabel: document.querySelector("#master-edit-label"),
  masterEditInput: document.querySelector("#master-edit-input"),
  masterEditCancel: document.querySelector("#master-edit-cancel"),
  masterEditSubmit: document.querySelector("#master-edit-submit"),
  masterDeleteDialog: document.querySelector("#master-delete-dialog"),
  masterDeleteTitle: document.querySelector("#master-delete-title"),
  masterDeleteCopy: document.querySelector("#master-delete-copy"),
  masterDeleteCancel: document.querySelector("#master-delete-cancel"),
  masterDeleteConfirm: document.querySelector("#master-delete-confirm"),
  totalInvoiced: document.querySelector("#total-invoiced"),
  totalDispatched: document.querySelector("#total-dispatched"),
  totalRemaining: document.querySelector("#total-remaining"),
  skuSelect: document.querySelector("select[name='sku']"),
  pageViews: document.querySelectorAll(".page-view"),
  pageLinks: document.querySelectorAll("[data-page-link]"),
  writableOnly: document.querySelectorAll(".writable-only"),
};

setToday(selectors.dispatchForm.elements.date);
setToday(selectors.stockForm.elements.date);
setDefaultItemFields(selectors.stockForm);
selectors.dispatchHistoryFilter.reset();
selectors.dispatchHistoryFilter.elements.date.value = "";
enhanceDateInputs();

function emptyState() {
  return {
    billingReady: [],
    customerIds: {},
    customerRecords: [],
    customers: [],
    dispatches: [],
    driverIds: {},
    driverRecords: [],
    drivers: [],
    inventory: [],
    invoice: [],
    invoiceApprovals: [],
    vehicleIds: {},
    vehicleRecords: [],
    vehicles: [],
  };
}

function loadSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  const parsed = JSON.parse(stored);
  return { ...parsed, role: normalizeRole(parsed.role) };
}

function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  const defaults = {
    theme: "light",
    background: "default",
    accent: "teal",
    textSize: "comfortable",
  };
  return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveSession(nextSession) {
  session = nextSession;
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
}

function getInitialPage() {
  const page = window.location.hash.replace("#", "");
  const normalizedPage = legacyRoutes[page] || page;
  return pages[normalizedPage] ? normalizedPage : "tong-quan";
}

async function navigateTo(page, { refresh = true } = {}) {
  activePage = pages[page] ? page : "tong-quan";
  window.history.replaceState(null, "", `#${activePage}`);
  setMobileNavOpen(false);
  if (refresh) {
    await refreshAppData();
  }
  render();
}

function setMobileNavOpen(isOpen) {
  document.body.classList.toggle("mobile-nav-open", isOpen);
  selectors.mobileNavBackdrop.hidden = !isOpen;
  selectors.mobileNavToggle.setAttribute("aria-expanded", isOpen.toString());
  selectors.mobileNavToggle.setAttribute(
    "aria-label",
    isOpen ? "Đóng điều hướng" : "Mở điều hướng",
  );
}

function normalizeRole(role = "warehouse") {
  return role === "accounting" ? "accountant" : role;
}

async function refreshAppData() {
  const data = await apiRequest("/app-data", {}, session);
  state = hydrateState(data);
  if (selectedCustomer && !state.customers.includes(selectedCustomer)) {
    selectedCustomer = "";
  }
}

function hydrateState(data) {
  const customers = data.customers || [];
  const vehicles = data.vehicles || [];
  const drivers = data.drivers || [];
  return {
    billingReady: data.billingReady || [],
    customerIds: Object.fromEntries(customers.map((item) => [item.label, item.id])),
    customerRecords: customers,
    customers: customers.map((item) => item.label),
    dispatches: flattenDispatches(data.dispatches || []),
    driverIds: Object.fromEntries(drivers.map((item) => [item.label, item.id])),
    driverRecords: drivers,
    drivers: drivers.map((item) => item.label),
    inventory: (data.inventory || []).map((row) => ({
      ...row,
      invoiceQuantity: Number(row.receivedQuantity || 0),
      dispatchedQuantity: Number(row.dispatchedQuantity || 0),
      remainingQuantity: Number(row.remainingQuantity || 0),
    })),
    invoice: flattenReceipts(data.receipts || []),
    invoiceApprovals: data.invoiceApprovals || [],
    vehicleIds: Object.fromEntries(vehicles.map((item) => [item.label, item.id])),
    vehicleRecords: vehicles,
    vehicles: vehicles.map((item) => item.label),
  };
}

function flattenReceipts(receipts) {
  return receipts.flatMap((receipt) =>
    (receipt.items || []).map((item) => ({
      customer: receipt.customer,
      customerId: receipt.customerId,
      date: normalizeApiDate(receipt.date),
      id: item.id,
      quantity: Number(item.quantity),
      receiptId: receipt.id,
      sku: item.sku,
      unit: item.unit,
    })),
  );
}

function flattenDispatches(dispatches) {
  return dispatches.flatMap((dispatch) =>
    (dispatch.items || []).map((item) => ({
      createdAt: dispatch.createdAt,
      customer: dispatch.customer,
      customerId: dispatch.customerId,
      date: normalizeApiDate(dispatch.date),
      dispatchId: dispatch.id,
      driver: dispatch.driver,
      driverId: dispatch.driverId,
      id: item.id,
      quantity: Number(item.quantity),
      sku: item.sku,
      truck: dispatch.plate,
      unit: item.unit,
      vehicleId: dispatch.vehicleId,
      warehouse: dispatch.warehouse,
    })),
  );
}

function normalizeApiDate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toString().slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function refreshAndRender() {
  await refreshAppData();
  render();
}

function invoiceTotals(items = state.invoice) {
  return items.reduce((totals, item) => {
    const sku = normalizeSku(item.sku);
    totals[sku] = (totals[sku] || 0) + Number(item.quantity);
    return totals;
  }, {});
}

function dispatchTotals(items = state.dispatches) {
  return items.reduce((totals, item) => {
    const sku = normalizeSku(item.sku);
    totals[sku] = (totals[sku] || 0) + Number(item.quantity);
    return totals;
  }, {});
}

function customerDispatchTotals() {
  return state.dispatches.reduce((totals, item) => {
    const customer = item.customer || "CustomerA";
    const sku = normalizeSku(item.sku);
    const key = `${customer}||${sku}`;
    totals[key] = (totals[key] || 0) + Number(item.quantity);
    return totals;
  }, {});
}

function inventoryRows(customer = "") {
  return state.inventory
    .filter((row) => !customer || row.customer === customer)
    .map((row) => ({
      ...row,
      invoiceQuantity: Number(row.invoiceQuantity || row.receivedQuantity || 0),
      dispatchedQuantity: Number(row.dispatchedQuantity || 0),
      remainingQuantity: Number(row.remainingQuantity || 0),
      unit: row.unit || "đơn vị",
    }));
}

function skuUnits(items = state.invoice) {
  return items.reduce((units, item) => {
    const sku = normalizeSku(item.sku);
    units[sku] = item.unit || units[sku] || "don vi";
    return units;
  }, {});
}

function stockRows() {
  return inventoryRows()
    .map((row) => ({
      customer: row.customer,
      sku: row.sku,
      unit: row.unit || "đơn vị",
      date:
        state.invoice
          .filter(
            (item) => item.customer === row.customer && item.sku === row.sku,
          )
          .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
        "2026-05-01",
      remainingQuantity: Number(row.remainingQuantity),
    }))
    .filter((row) => row.remainingQuantity > 0);
}

function customerSummaries() {
  const rows = stockRows();
  const summaries = new Map();

  rows.forEach((row) => {
    if (!summaries.has(row.customer)) {
      summaries.set(row.customer, {
        customer: row.customer,
        itemTypes: new Set(),
        totalQuantity: 0,
        latestDate: row.date,
      });
    }

    const summary = summaries.get(row.customer);
    summary.itemTypes.add(row.sku);
    summary.totalQuantity += row.remainingQuantity;
    if (row.date > summary.latestDate) {
      summary.latestDate = row.date;
    }
  });

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      itemTypeCount: summary.itemTypes.size,
    }))
    .sort(
      (a, b) =>
        b.totalQuantity - a.totalQuantity ||
        a.customer.localeCompare(b.customer),
    );
}

function render() {
  applySettings();
  renderSession();
  renderPage();
  renderCustomerOptions();
  renderMasterData();

  const rows = inventoryRows();
  const totalInvoiced = rows.reduce((sum, row) => sum + row.invoiceQuantity, 0);
  const totalDispatched = rows.reduce(
    (sum, row) => sum + Math.min(row.invoiceQuantity, row.dispatchedQuantity),
    0,
  );
  const totalRemaining = rows.reduce(
    (sum, row) => sum + Math.max(row.remainingQuantity, 0),
    0,
  );

  selectors.totalInvoiced.textContent = totalInvoiced.toLocaleString("vi-VN");
  selectors.totalDispatched.textContent =
    totalDispatched.toLocaleString("vi-VN");
  selectors.totalRemaining.textContent = totalRemaining.toLocaleString("vi-VN");

  const summaries = customerSummaries();
  renderCustomerCards(summaries);
  renderInventoryChart();

  renderReceiptCustomerView();

  if (!selectors.dispatchForm.elements.customer.value) {
    selectors.dispatchForm.elements.customer.value = selectedCustomer;
  }
  renderDispatchSkuOptions();
  renderDispatchHistory();

  renderAccountingReport();
  renderDateSortControls();
}

function customerInventorySummary(customer) {
  const rows = stockRows().filter((row) => row.customer === customer);
  return {
    remainingQuantity: rows.reduce(
      (sum, row) => sum + row.remainingQuantity,
      0,
    ),
    itemTypeCount: new Set(rows.map((row) => row.sku)).size,
  };
}

function renderReceiptCustomerView() {
  syncReceiptCustomerSelects();

  if (!selectedCustomer) {
    selectors.customerDetailTitle.textContent = "Tổng hợp hàng nhập";
    selectors.customerDetailCopy.textContent =
      "Chọn khách hàng từ Tổng quan hoặc danh sách bên trên để xem dữ liệu thực tế.";
    selectors.stockTable.innerHTML = sampleTableRow(3);
    selectors.stockPagination.innerHTML = "";
    selectors.inventoryTable.innerHTML = sampleTableRow(4);
    selectors.receiptHistoryPagination.innerHTML = "";
    return;
  }

  const summaryRows = receiptSummaryRows(selectedCustomer);
  const historyRows = sortRowsByDate(
    state.invoice.filter((item) => item.customer === selectedCustomer),
    "receiptHistory",
  );
  const summaryPage = paginateRows(summaryRows, receiptSummaryPage);
  const historyPage = paginateRows(historyRows, receiptHistoryPage);
  receiptSummaryPage = summaryPage.page;
  receiptHistoryPage = historyPage.page;

  selectors.customerDetailTitle.textContent = `Tổng hợp hàng nhập - ${selectedCustomer}`;
  selectors.customerDetailCopy.textContent = `${summaryRows.length} loại hàng đã được ghi nhận.`;

  selectors.stockTable.innerHTML =
    summaryPage.rows
      .map(
        (row) => `
    <tr>
      <td><strong>${escapeHtml(row.sku)}</strong></td>
      <td>${row.quantity.toLocaleString("vi-VN")}</td>
      <td>${escapeHtml(row.unit)}</td>
    </tr>
  `,
      )
      .join("") ||
    sampleTableRow(3, "Khách hàng này chưa có dữ liệu nhập hàng.");
  renderTablePagination(
    selectors.stockPagination,
    receiptSummaryPage,
    summaryPage.pageCount,
    "summary",
  );

  selectors.inventoryTable.innerHTML =
    historyPage.rows
      .map(
        (row) => `
    <tr>
      <td>${formatDate(row.date)}</td>
      <td><strong>${escapeHtml(row.sku)}</strong></td>
      <td>${Number(row.quantity).toLocaleString("vi-VN")}</td>
      <td>${escapeHtml(row.unit || "đơn vị")}</td>
    </tr>
  `,
      )
      .join("") ||
    sampleTableRow(4, "Khách hàng này chưa có lịch sử nhập hàng.");
  renderTablePagination(
    selectors.receiptHistoryPagination,
    receiptHistoryPage,
    historyPage.pageCount,
    "history",
  );
}

function renderTablePagination(container, currentPage, pageCount, tableName) {
  container.innerHTML = paginationMarkup({
    page: currentPage,
    pageCount,
    scopeAttribute: "data-receipt-page",
    scope: tableName,
  });
}

function renderDispatchPagination(page, pageCount) {
  selectors.dispatchHistoryPagination.innerHTML = paginationMarkup({
    page,
    pageCount,
    scopeAttribute: "data-dispatch-page",
    scope: "history",
  });
}

function renderReportPagination(container, page, pageCount, tableName) {
  container.innerHTML = paginationMarkup({
    page,
    pageCount,
    scopeAttribute: "data-report-page",
    scope: tableName,
  });
}

function resetReceiptPages() {
  receiptSummaryPage = 1;
  receiptHistoryPage = 1;
}

function showToast(
  message = "Xuất hàng thành công. Lịch sử bên dưới đã được cập nhật.",
) {
  window.clearTimeout(dispatchToastTimer);
  selectors.dispatchSuccess.textContent = message;
  selectors.dispatchSuccess.hidden = false;
  selectors.dispatchSuccess.classList.add("visible");
  dispatchToastTimer = window.setTimeout(() => {
    selectors.dispatchSuccess.classList.remove("visible");
    selectors.dispatchSuccess.hidden = true;
  }, 3000);
}

function openInvoiceConfirmDialog(customer) {
  pendingInvoiceCustomer = customer;
  selectors.invoiceConfirmTitle.textContent = `Xuất hóa đơn cho ${customer}?`;
  selectors.invoiceConfirmCopy.textContent =
    "Sau khi đồng ý, khách hàng sẽ được ghi nhận vào lịch sử xuất hóa đơn và được xóa khỏi danh sách đủ điều kiện.";
  showDialog(selectors.invoiceConfirmDialog, selectors.invoiceConfirmApprove);
}

function closeInvoiceConfirmDialog() {
  pendingInvoiceCustomer = "";
  hideDialog(selectors.invoiceConfirmDialog);
}

function openMasterEditDialog(listName, index) {
  const currentList = state[listName] || [];
  const currentValue = currentList[index];
  if (typeof currentValue !== "string") return;
  const config = masterDataConfig[listName];
  pendingMasterEdit = { listName, index };
  selectors.masterEditTitle.textContent = `Sửa ${config.typeLabel}`;
  selectors.masterEditCopy.textContent =
    "Dữ liệu hiện tại đã được điền sẵn. Chọn Update để lưu thay đổi.";
  selectors.masterEditLabel.textContent = config.fieldLabel;
  selectors.masterEditInput.value = currentValue;
  selectors.masterEditInput.setCustomValidity("");
  showDialog(selectors.masterEditDialog, selectors.masterEditInput);
}

function closeMasterEditDialog() {
  pendingMasterEdit = null;
  selectors.masterEditForm.reset();
  selectors.masterEditInput.setCustomValidity("");
  hideDialog(selectors.masterEditDialog);
}

function openMasterDeleteDialog(listName, index) {
  const currentList = state[listName] || [];
  const currentValue = currentList[index];
  if (typeof currentValue !== "string") return;
  const config = masterDataConfig[listName];
  pendingMasterDelete = { listName, index };
  selectors.masterDeleteTitle.textContent = `Xóa ${config.typeLabel} này?`;
  selectors.masterDeleteCopy.textContent = `"${currentValue}" sẽ bị xóa khỏi danh sách quản lý.`;
  showDialog(selectors.masterDeleteDialog, selectors.masterDeleteConfirm);
}

function closeMasterDeleteDialog() {
  pendingMasterDelete = null;
  hideDialog(selectors.masterDeleteDialog);
}

function masterApiPath(listName) {
  return {
    customers: "/customers",
    drivers: "/drivers",
    vehicles: "/vehicles",
  }[listName];
}

function masterPayload(listName, value) {
  return listName === "vehicles" ? { plate: value } : { name: value };
}

function masterId(listName, value) {
  return {
    customers: state.customerIds,
    drivers: state.driverIds,
    vehicles: state.vehicleIds,
  }[listName]?.[value];
}

function receiptSummaryRows(customer) {
  const rows = new Map();
  state.invoice
    .filter((item) => item.customer === customer)
    .forEach((item) => {
      const sku = normalizeSku(item.sku);
      const unit = item.unit || "đơn vị";
      const key = `${sku}||${unit}`;
      if (!rows.has(key)) {
        rows.set(key, { sku, unit, quantity: 0 });
      }
      rows.get(key).quantity += Number(item.quantity);
    });

  return Array.from(rows.values()).sort(
    (a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku),
  );
}

function renderAccountingReport() {
  const customers = Array.from(
    new Set(state.invoice.map((item) => item.customer || "CustomerA")),
  ).sort();
  const approvedCustomers = new Set(
    (state.invoiceApprovals || []).map((item) => item.customer),
  );
  const reportRows = customers.map((customer) => {
    const summary = customerInventorySummary(customer);
    const customerDispatches = state.dispatches.filter(
      (item) => (item.customer || "CustomerA") === customer,
    );
    const lastDispatchAt = latestDispatchTimestamp(customerDispatches);
    const status = summary.remainingQuantity === 0 ? "complete" : "pending";
    return {
      customer,
      ...summary,
      historyCount: customerDispatches.length,
      lastDispatchAt,
      completedAgo: relativeTimeFrom(lastDispatchAt),
      status,
    };
  });
  const completedRows = reportRows.filter(
    (row) => row.status === "complete" && !approvedCustomers.has(row.customer),
  );
  const currentCustomer = completedRows.some(
    (row) => row.customer === selectedReportCustomer,
  )
    ? selectedReportCustomer
    : completedRows[0]?.customer || "";

  if (currentCustomer && selectedReportCustomer !== currentCustomer) {
    selectedReportCustomer = currentCustomer;
  }

  selectors.accountingReport.innerHTML =
    completedRows
      .map(
        (row) => `
    <article class="report-customer-card ${row.customer === currentCustomer ? "active" : ""}" data-report-customer="${escapeHtml(row.customer)}">
      <div class="report-card-title">
        <strong>${escapeHtml(row.customer)}</strong>
      </div>
      <div class="report-meta">
        <span>Hoàn thành ${row.completedAgo}</span>
        <span>${row.historyCount.toLocaleString("vi-VN")} lần xuất hàng</span>
      </div>
      <button class="invoice-button" data-invoice-action="approve" type="button">Xuất hóa đơn</button>
    </article>
  `,
      )
      .join("") ||
    emptyStateMarkup({
      title: "Chưa có khách hàng hoàn thành",
      copy: "Khi hàng của khách được xuất hết, khách hàng sẽ xuất hiện ở đây để kế toán xuất hóa đơn.",
    });

  const history = sortRowsByDate(
    state.dispatches.filter(
      (item) => (item.customer || "CustomerA") === currentCustomer,
    ),
    "reportHistory",
  );
  const historyPage = paginateRows(history, reportHistoryPage);
  reportHistoryPage = historyPage.page;

  selectors.reportHistoryTable.innerHTML =
    historyPage.rows
      .map(
        (item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.warehouse || "Thủ kho mẫu")}</td>
      <td><strong>${escapeHtml(item.truck)}</strong></td>
      <td>${escapeHtml(item.driver)}</td>
      <td>${escapeHtml(item.sku)}</td>
      <td>${Number(item.quantity).toLocaleString("vi-VN")}</td>
    </tr>
  `,
      )
      .join("") ||
    sampleTableRow(
      6,
      currentCustomer
        ? "Chưa có lịch sử xuất hàng cho khách hàng này."
        : "Chọn khách hàng hoàn thành để xem lịch sử xuất hàng.",
    );
  renderReportPagination(
    selectors.reportHistoryPagination,
    reportHistoryPage,
    historyPage.pageCount,
    "dispatch",
  );

  const invoiceHistory = sortRowsByDate(
    state.invoiceApprovals || [],
    "invoiceHistory",
  );
  const invoicePage = paginateRows(invoiceHistory, invoiceHistoryPage);
  invoiceHistoryPage = invoicePage.page;
  selectors.invoiceHistoryTable.innerHTML =
    invoicePage.rows
      .map(
        (item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.customer)}</td>
      <td><span class="status-pill complete">${escapeHtml(item.status || "Hoàn thành")}</span></td>
    </tr>
  `,
      )
      .join("") || sampleTableRow(3, "Chưa có lịch sử xuất hóa đơn.");
  renderReportPagination(
    selectors.invoiceHistoryPagination,
    invoiceHistoryPage,
    invoicePage.pageCount,
    "invoice",
  );
}

function latestDispatchTimestamp(dispatches) {
  return dispatches.reduce((latest, item) => {
    const timestamp = new Date(item.createdAt || item.date).getTime();
    return Number.isFinite(timestamp) && timestamp > latest
      ? timestamp
      : latest;
  }, 0);
}

function relativeTimeFrom(timestamp) {
  if (!timestamp) return "chưa có thời gian";
  const diffMs = Math.max(Date.now() - timestamp, 0);
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < hourMs) return "vừa xong";
  if (diffMs < dayMs) {
    const hours = Math.max(Math.floor(diffMs / hourMs), 1);
    return `${hours} giờ trước`;
  }
  if (diffMs < weekMs) {
    const days = Math.max(Math.floor(diffMs / dayMs), 1);
    return `${days} ngày trước`;
  }

  const weeks = Math.max(Math.floor(diffMs / weekMs), 1);
  return `${weeks} tuần trước`;
}

function renderCustomerCards(summaries) {
  if (!summaries.length) {
    selectors.customerGrid.innerHTML = emptyStateMarkup({
      title: "Chưa có khách hàng đang có hàng trong kho",
      copy: "Khi thủ kho nhập hàng, khách hàng sẽ xuất hiện tại đây để theo dõi nhanh.",
    });
    selectors.customerPagination.innerHTML = "";
    return;
  }

  const pageSize = customerCardsPerPage();
  const pageCount = Math.max(Math.ceil(summaries.length / pageSize), 1);
  customerPage = Math.min(customerPage, pageCount);
  const start = (customerPage - 1) * pageSize;
  const visibleSummaries = summaries.slice(start, start + pageSize);

  selectors.customerGrid.innerHTML = visibleSummaries
    .map(
      (summary) => `
    <button class="customer-card ${summary.customer === selectedCustomer ? "active" : ""}" data-customer="${escapeHtml(summary.customer)}" type="button">
      <span>${escapeHtml(summary.customer)}</span>
      <strong>${summary.totalQuantity.toLocaleString("vi-VN")}</strong>
      <small>${summary.itemTypeCount} loại hàng - cập nhật ${formatDate(summary.latestDate)}</small>
    </button>
  `,
    )
    .join("");

  selectors.customerPagination.innerHTML =
    pageCount > 1
      ? `
    <button type="button" data-page-action="prev" ${customerPage === 1 ? "disabled" : ""}>Trước</button>
    <span>Trang ${customerPage} / ${pageCount}</span>
    <button type="button" data-page-action="next" ${customerPage === pageCount ? "disabled" : ""}>Sau</button>
  `
      : "";
}

function customerCardsPerPage() {
  if (window.matchMedia("(max-width: 680px)").matches) return 3;
  if (window.matchMedia("(max-width: 980px)").matches) return 6;
  return 12;
}

function renderInventoryChart() {
  const config = periodConfig(overviewPeriod);
  const points = inventoryTrend(config.days);
  const width = 920;
  const height = 260;
  const padding = 34;
  const maxValue = Math.max(...points.map((point) => point.quantity), 1);
  const minValue = Math.min(...points.map((point) => point.quantity), 0);
  const range = Math.max(maxValue - minValue, 1);
  const path = points
    .map((point, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((point.quantity - minValue) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPath = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const first = points[0];
  const last = points[points.length - 1];
  const trendClass = last.quantity >= first.quantity ? "up" : "down";
  const trendText = last.quantity >= first.quantity ? "Tăng" : "Giảm";

  selectors.inventoryChart.innerHTML = `
    <div class="chart-summary ${trendClass}">
      <span>${trendText} trong ${config.label.toLowerCase()}</span>
      <strong>${last.quantity.toLocaleString("vi-VN")}</strong>
      <small>so với đầu ${config.label.toLowerCase()} ${first.quantity.toLocaleString("vi-VN")}</small>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Xu hướng tồn kho">
      <path class="chart-grid" d="M ${padding} ${padding} H ${width - padding} M ${padding} ${height / 2} H ${width - padding} M ${padding} ${height - padding} H ${width - padding}" />
      <path class="chart-area" d="${areaPath}" />
      <path class="chart-line" d="${path}" />
      ${points
        .map((point, index) => {
          const x =
            padding + (index / (points.length - 1)) * (width - padding * 2);
          const y =
            height -
            padding -
            ((point.quantity - minValue) / range) * (height - padding * 2);
          return `<circle class="chart-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index % 5 === 0 || index === points.length - 1 ? 4 : 2}" />`;
        })
        .join("")}
    </svg>
    <div class="chart-axis">
      ${config.axis.map((label) => `<span>${label}</span>`).join("")}
    </div>
  `;
}

function periodConfig(period) {
  if (period === "week") {
    return { days: 7, label: "Tuần", axis: ["T2", "T4", "T6", "CN"] };
  }
  if (period === "quarter") {
    return {
      days: 90,
      label: "Quý",
      axis: ["Ngày 1", "Ngày 30", "Ngày 60", "Ngày 90"],
    };
  }
  return {
    days: 31,
    label: "Tháng",
    axis: ["01/05", "10/05", "20/05", "31/05"],
  };
}

function inventoryTrend(dayCount) {
  const days = Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    quantity: 0,
  }));

  state.invoice.forEach((item) => {
    const day = Math.min(
      new Date(item.date || "2026-05-01").getDate(),
      dayCount,
    );
    days.forEach((point) => {
      if (point.day >= day) {
        point.quantity += Number(item.quantity);
      }
    });
  });

  state.dispatches.forEach((item) => {
    const day = Math.min(
      new Date(item.date || "2026-05-01").getDate(),
      dayCount,
    );
    days.forEach((point) => {
      if (point.day >= day) {
        point.quantity -= Number(item.quantity);
      }
    });
  });

  return days.map((point) => ({
    ...point,
    quantity: Math.max(point.quantity, 0),
  }));
}

function renderSession() {
  const activeRole = normalizeRole(session?.role || "warehouse");
  document.body.dataset.role = activeRole;
  selectors.loginScreen.hidden = Boolean(session);
  selectors.sidebarActiveUser.textContent = session?.name || "Người dùng mẫu";
  selectors.sidebarActiveRole.textContent = roles[activeRole];

  selectors.writableOnly.forEach((form) => {
    const isMasterForm = form.classList.contains("master-form");
    const canWrite =
      activeRole === "admin" ||
      (!isMasterForm && ["driver", "warehouse"].includes(activeRole)) ||
      (isMasterForm && activeRole === "warehouse");
    form.querySelectorAll("input, select, button").forEach((field) => {
      field.disabled = !canWrite;
    });
  });
}

function renderPage() {
  const activeRole = normalizeRole(session?.role || "warehouse");
  if (!pages[activePage].roles.includes(activeRole)) {
    activePage = "tong-quan";
    window.history.replaceState(null, "", "#tong-quan");
  }

  const page = pages[activePage];
  selectors.pageTitle.textContent = page.title;
  selectors.pageSubtitle.textContent = page.subtitle;
  selectors.overviewPeriodControl.hidden = activePage !== "tong-quan";

  selectors.pageViews.forEach((view) => {
    const allowedRoles = view.dataset.roles
      ? view.dataset.roles.split(" ")
      : pages[view.dataset.page].roles;
    view.hidden =
      view.dataset.page !== activePage || !allowedRoles.includes(activeRole);
  });

  selectors.pageLinks.forEach((link) => {
    const pageName = link.dataset.pageLink;
    const canAccess = pages[pageName].roles.includes(activeRole);
    link.classList.toggle("active", pageName === activePage);
    link.toggleAttribute("aria-current", pageName === activePage);
    link.toggleAttribute("aria-disabled", !canAccess);
  });
}

function formatDate(value) {
  if (!value) return "";
  const normalized = normalizeApiDate(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toString();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function sortRowsByDate(rows, sortKey) {
  const direction = dateSortDirections[sortKey] || "desc";
  return [...rows].sort((a, b) => {
    const comparison = normalizeApiDate(a.date).localeCompare(
      normalizeApiDate(b.date),
    );
    return direction === "asc" ? comparison : -comparison;
  });
}

function resetDateSortPage(sortKey) {
  if (sortKey === "receiptHistory") {
    receiptHistoryPage = 1;
  }
  if (sortKey === "dispatchHistory") {
    dispatchHistoryPage = 1;
  }
  if (sortKey === "reportHistory") {
    reportHistoryPage = 1;
  }
  if (sortKey === "invoiceHistory") {
    invoiceHistoryPage = 1;
  }
}

function renderDateSortControls() {
  document.querySelectorAll("[data-date-sort]").forEach((button) => {
    const sortKey = button.dataset.dateSort;
    const direction = dateSortDirections[sortKey] || "desc";
    const label = direction === "asc" ? "tăng dần" : "giảm dần";
    const indicator = button.querySelector(".sort-indicator");
    const header = button.closest("th");

    button.setAttribute("aria-label", `Sắp xếp ngày ${label}`);
    if (indicator) {
      indicator.textContent = direction === "asc" ? "↑" : "↓";
    }
    if (header) {
      header.setAttribute(
        "aria-sort",
        direction === "asc" ? "ascending" : "descending",
      );
    }
  });
}

function normalizeSku(value) {
  return value.toString().trim().toUpperCase();
}

function setToday(input) {
  input.valueAsDate = new Date();
}

function renderCustomerOptions() {
  const customers = allCustomers();
  selectors.customerList.innerHTML = customers
    .map((customer) => `<option value="${escapeHtml(customer)}"></option>`)
    .join("");
  const stockCustomer =
    selectedCustomer || selectors.stockForm.elements.customer.value;
  const dispatchCustomer =
    selectors.dispatchForm.elements.customer.value || selectedCustomer;
  const customerOptions = customerSelectOptions(customers);

  selectors.stockForm.elements.customer.innerHTML = customerOptions;
  selectors.dispatchForm.elements.customer.innerHTML = customerOptions;
  selectors.stockForm.elements.customer.value = customers.includes(
    stockCustomer,
  )
    ? stockCustomer
    : "";
  selectors.dispatchForm.elements.customer.value = customers.includes(
    dispatchCustomer,
  )
    ? dispatchCustomer
    : "";
}

function customerSelectOptions(customers) {
  return `
    <option value="">Chọn khách hàng</option>
    ${customers.map((customer) => optionMarkup({ value: customer })).join("")}
  `;
}

function allCustomers() {
  return Array.from(
    new Set([
      ...(state.customers || []),
      ...state.invoice.map((item) => item.customer || "CustomerA"),
    ]),
  ).sort();
}

function renderDispatchSkuOptions() {
  const customer =
    selectors.dispatchForm.elements.customer.value || selectedCustomer;
  const rows = stockRows().filter((row) => row.customer === customer);
  const currentSku = selectors.skuSelect.value;
  selectors.skuSelect.innerHTML = rows
    .map(
      (row) =>
        optionMarkup({
          value: row.sku,
          label: `${row.sku} - còn ${row.remainingQuantity.toLocaleString("vi-VN")} ${row.unit}`,
          selectedValue: currentSku,
        }),
    )
    .join("");
  const selectedRow =
    rows.find((row) => row.sku === selectors.skuSelect.value) || rows[0];
  selectors.dispatchForm.elements.quantity.value = selectedRow
    ? selectedRow.remainingQuantity
    : "";
  selectors.dispatchForm.elements.quantity.max = selectedRow
    ? selectedRow.remainingQuantity
    : "";
}

function renderDispatchHistory() {
  const form = selectors.dispatchHistoryFilter;
  const filters = {
    date: form.elements.date.value,
    truck: form.elements.truck.value,
    driver: form.elements.driver.value,
  };
  const rows = state.dispatches
    .filter((item) => !filters.date || item.date === filters.date)
    .filter((item) => !filters.truck || item.truck === filters.truck)
    .filter((item) => !filters.driver || item.driver === filters.driver);
  const sortedRows = sortRowsByDate(rows, "dispatchHistory");
  const page = paginateRows(sortedRows, dispatchHistoryPage);
  dispatchHistoryPage = page.page;

  selectors.dispatchHistoryTable.innerHTML =
    page.rows
      .map(
        (item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.customer)}</td>
      <td><strong>${escapeHtml(item.truck)}</strong></td>
      <td>${escapeHtml(item.driver)}</td>
      <td>${escapeHtml(item.sku)}</td>
      <td>${Number(item.quantity).toLocaleString("vi-VN")}</td>
    </tr>
  `,
      )
      .join("") ||
    sampleTableRow(6, "Chưa có lịch sử xuất hàng phù hợp với bộ lọc hiện tại.");
  renderDispatchPagination(dispatchHistoryPage, page.pageCount);
}

function renderMasterData() {
  const selectedTruck = selectors.dispatchForm.elements.truck.value;
  const selectedDriver = selectors.dispatchForm.elements.driver.value;
  const selectedHistoryTruck =
    selectors.dispatchHistoryFilter.elements.truck.value;
  const selectedHistoryDriver =
    selectors.dispatchHistoryFilter.elements.driver.value;
  selectors.dispatchForm.elements.truck.innerHTML = state.vehicles
    .map((plate) =>
      optionMarkup({ value: plate, selectedValue: selectedTruck }),
    )
    .join("");
  selectors.dispatchForm.elements.driver.innerHTML = state.drivers
    .map((driver) =>
      optionMarkup({ value: driver, selectedValue: selectedDriver }),
    )
    .join("");
  selectors.dispatchHistoryFilter.elements.truck.innerHTML = `
    <option value="">Tất cả xe</option>
    ${state.vehicles.map((plate) => optionMarkup({ value: plate, selectedValue: selectedHistoryTruck })).join("")}
  `;
  selectors.dispatchHistoryFilter.elements.driver.innerHTML = `
    <option value="">Tất cả tài xế</option>
    ${state.drivers.map((driver) => optionMarkup({ value: driver, selectedValue: selectedHistoryDriver })).join("")}
  `;

  state.customers = state.customers || allCustomers();
  customerManagementPage = renderMasterList({
    items: state.customers,
    page: customerManagementPage,
    listName: "customers",
    listElement: selectors.customerManagementList,
    paginationElement: selectors.customerManagementPagination,
    emptyMessage: "Chưa có khách hàng trong danh mục.",
  });
  vehicleManagementPage = renderMasterList({
    items: state.vehicles,
    page: vehicleManagementPage,
    listName: "vehicles",
    listElement: selectors.vehicleList,
    paginationElement: selectors.vehiclePagination,
    emptyMessage: "Chưa có xe vận chuyển trong danh mục.",
  });
  driverManagementPage = renderMasterList({
    items: state.drivers,
    page: driverManagementPage,
    listName: "drivers",
    listElement: selectors.driverList,
    paginationElement: selectors.driverPagination,
    emptyMessage: "Chưa có tài xế trong danh mục.",
  });
}

function renderMasterList({
  items,
  page,
  listName,
  listElement,
  paginationElement,
  emptyMessage,
}) {
  const view = masterListView({ items, page, listName, emptyMessage });
  listElement.innerHTML = view.listHtml;
  paginationElement.innerHTML = view.paginationHtml;
  return view.page;
}

function applySettings() {
  document.body.dataset.theme = settings.theme;
  document.body.dataset.background = settings.background;
  document.body.dataset.accent = settings.accent;
  document.body.dataset.textSize = settings.textSize;
  selectors.settingsForm.elements.theme.value = settings.theme;
  selectors.settingsForm.elements.background.value = settings.background;
  selectors.settingsForm.elements.accent.value = settings.accent;
  selectors.settingsForm.elements.textSize.value = settings.textSize;
}

function syncReceiptCustomerSelects() {
  selectors.stockForm.elements.customer.value = selectedCustomer || "";
  selectors.dispatchForm.elements.customer.value = selectedCustomer || "";
}

function resetItemFields(form) {
  form.elements.sku.value = "";
  setDefaultItemFields(form);
  form.elements.sku.focus();
}

function setDefaultItemFields(form) {
  form.elements.quantity.value = 100;
  form.elements.unit.value = "tấn";
}

selectors.stockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const customer = data.get("customer").toString().trim();
  try {
    await apiRequest(
      "/receipts",
      {
        body: JSON.stringify({
          customerName: customer,
          date: data.get("date"),
          items: [
            {
              quantity: Number(data.get("quantity")),
              sku: normalizeSku(data.get("sku")),
              unit: data.get("unit").toString().trim(),
            },
          ],
          receivedByName: session?.name || "Thủ kho mẫu",
        }),
        method: "POST",
      },
      session,
    );
    selectedCustomer = customer;
    resetReceiptPages();
    resetItemFields(form);
    setToday(form.elements.date);
    await refreshAndRender();
    showToast("Nhập hàng thành công. Dữ liệu nhập kho đã được cập nhật.");
  } catch (error) {
    showToast(error.message);
  }
});

selectors.dispatchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const customer = data.get("customer").toString().trim();
  const truck = data.get("truck").toString().trim().toUpperCase();
  const driver = data.get("driver").toString().trim();
  try {
    await apiRequest(
      "/dispatches",
      {
        body: JSON.stringify({
          customerName: customer,
          date: data.get("date"),
          driverName: driver,
          items: [
            {
              quantity: Number(data.get("quantity")),
              sku: normalizeSku(data.get("sku")),
              unit:
                stockRows().find(
                  (row) =>
                    row.customer === customer &&
                    row.sku === normalizeSku(data.get("sku")),
                )?.unit || "đơn vị",
            },
          ],
          plate: truck,
          warehouseName: session?.name || "Thủ kho mẫu",
        }),
        method: "POST",
      },
      session,
    );
    selectedCustomer = customer;
    form.reset();
    setToday(form.elements.date);
    selectors.dispatchHistoryFilter.elements.date.value = data.get("date");
    selectors.dispatchHistoryFilter.elements.truck.value = truck;
    selectors.dispatchHistoryFilter.elements.driver.value = driver;
    dispatchHistoryPage = 1;
    showToast();
    await refreshAndRender();
  } catch (error) {
    showToast(error.message);
  }
});

selectors.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  saveSession({
    role: data.get("role"),
    name: data.get("name").toString().trim(),
  });
  render();
});

function showRoleSwitcher() {
  localStorage.removeItem(SESSION_KEY);
  session = null;
  setMobileNavOpen(false);
  render();
}

selectors.sidebarUserButton.addEventListener("click", showRoleSwitcher);

selectors.mobileNavToggle.addEventListener("click", () => {
  setMobileNavOpen(!document.body.classList.contains("mobile-nav-open"));
});

selectors.mobileNavBackdrop.addEventListener("click", () => {
  setMobileNavOpen(false);
});

selectors.pageLinks.forEach((link) => {
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    const page = event.currentTarget.dataset.pageLink;
    if (
      pages[page].roles.includes(normalizeRole(session?.role || "warehouse"))
    ) {
      await navigateTo(page);
    }
  });
});

selectors.customerGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-customer]");
  if (!card) {
    return;
  }
  selectedCustomer = card.dataset.customer;
  resetReceiptPages();
  syncReceiptCustomerSelects();
  selectors.dispatchForm.elements.customer.value = selectedCustomer;
  navigateTo("nhap-hang", { refresh: false });
});

selectors.stockForm.elements.customer.addEventListener("change", () => {
  selectedCustomer = selectors.stockForm.elements.customer.value;
  resetReceiptPages();
  syncReceiptCustomerSelects();
  renderReceiptCustomerView();
});

function handleReceiptPagination(event) {
  const button = event.target.closest("[data-receipt-page][data-page-action]");
  if (!button) return;
  event.preventDefault();

  const delta = button.dataset.pageAction === "next" ? 1 : -1;
  if (button.dataset.receiptPage === "summary") {
    receiptSummaryPage += delta;
  }
  if (button.dataset.receiptPage === "history") {
    receiptHistoryPage += delta;
  }
  renderReceiptCustomerView();
}

selectors.stockPagination.addEventListener("click", handleReceiptPagination);
selectors.receiptHistoryPagination.addEventListener(
  "click",
  handleReceiptPagination,
);

selectors.dispatchHistoryFilter.addEventListener("change", () => {
  dispatchHistoryPage = 1;
  renderDispatchHistory();
});

selectors.dispatchHistoryPagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dispatch-page][data-page-action]");
  if (!button) return;
  event.preventDefault();
  dispatchHistoryPage += button.dataset.pageAction === "next" ? 1 : -1;
  renderDispatchHistory();
});

selectors.customerPagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-action]");
  if (!button) return;
  event.preventDefault();
  customerPage += button.dataset.pageAction === "next" ? 1 : -1;
  renderCustomerCards(customerSummaries());
});

window.addEventListener("resize", () => {
  renderCustomerCards(customerSummaries());
});

selectors.dispatchForm.elements.customer.addEventListener("change", () => {
  selectedCustomer = selectors.dispatchForm.elements.customer.value;
  resetReceiptPages();
  syncReceiptCustomerSelects();
  renderDispatchSkuOptions();
});

selectors.skuSelect.addEventListener("change", () => {
  renderDispatchSkuOptions();
});

selectors.vehicleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const plate = new FormData(form)
    .get("plate")
    .toString()
    .trim()
    .toUpperCase();
  if (plate) {
    await apiRequest(
      "/vehicles",
      { body: JSON.stringify({ plate }), method: "POST" },
      session,
    );
    showToast("Thêm xe vận chuyển thành công.");
  }
  form.reset();
  await refreshAndRender();
});

selectors.driverForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = new FormData(form).get("name").toString().trim();
  if (name) {
    await apiRequest(
      "/drivers",
      { body: JSON.stringify({ name }), method: "POST" },
      session,
    );
    showToast("Thêm tài xế thành công.");
  }
  form.reset();
  await refreshAndRender();
});

selectors.customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = new FormData(form).get("name").toString().trim();
  if (name) {
    await apiRequest(
      "/customers",
      { body: JSON.stringify({ name }), method: "POST" },
      session,
    );
    showToast("Thêm khách hàng thành công.");
  }
  form.reset();
  await refreshAndRender();
});

selectors.settingsForm.addEventListener("change", (event) => {
  const form = event.currentTarget;
  settings = {
    theme: form.elements.theme.value,
    background: form.elements.background.value,
    accent: form.elements.accent.value,
    textSize: form.elements.textSize.value,
  };
  saveSettings();
  applySettings();
});

document.querySelector("#master-data").addEventListener("click", (event) => {
  const pageButton = event.target.closest(
    "[data-master-page][data-page-action]",
  );
  if (pageButton) {
    event.preventDefault();
    const delta = pageButton.dataset.pageAction === "next" ? 1 : -1;
    if (pageButton.dataset.masterPage === "customers")
      customerManagementPage += delta;
    if (pageButton.dataset.masterPage === "vehicles")
      vehicleManagementPage += delta;
    if (pageButton.dataset.masterPage === "drivers")
      driverManagementPage += delta;
    renderMasterData();
    return;
  }

  const button = event.target.closest("[data-master]");
  if (!button) {
    return;
  }

  const listName = button.dataset.master;
  const index = Number(button.dataset.index);
  if (button.dataset.action === "delete") {
    openMasterDeleteDialog(listName, index);
  } else {
    openMasterEditDialog(listName, index);
  }
});

selectors.accountingReport.addEventListener("click", (event) => {
  const card = event.target.closest("[data-report-customer]");
  if (!card) return;
  selectedReportCustomer = card.dataset.reportCustomer;
  reportHistoryPage = 1;
  if (event.target.closest("[data-invoice-action='approve']")) {
    openInvoiceConfirmDialog(selectedReportCustomer);
    return;
  }
  render();
});

selectors.invoiceConfirmApprove.addEventListener("click", async () => {
  if (!pendingInvoiceCustomer) return;
  try {
    await apiRequest(
      "/invoice-approvals",
      {
        body: JSON.stringify({
          approvedByName: session?.name || "Kế toán mẫu",
          customerId: state.customerIds[pendingInvoiceCustomer],
          status: "Hoàn thành",
        }),
        method: "POST",
      },
      session,
    );
    selectedReportCustomer = "";
    reportHistoryPage = 1;
    invoiceHistoryPage = 1;
    showToast(
      "Xuất hóa đơn và lịch sử xuất hóa đơn đã ghi nhận thành công.",
    );
    closeInvoiceConfirmDialog();
    await refreshAndRender();
  } catch (error) {
    showToast(error.message);
  }
});

bindDialogDismiss({
  dialog: selectors.invoiceConfirmDialog,
  cancelButton: selectors.invoiceConfirmCancel,
  onDismiss: closeInvoiceConfirmDialog,
});

selectors.masterEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!pendingMasterEdit) return;

  const { listName, index } = pendingMasterEdit;
  const currentList = state[listName] || [];
  const oldValue = currentList[index];
  const nextValue = normalizeMasterValue(
    listName,
    selectors.masterEditInput.value || "",
  );

  if (!nextValue) {
    selectors.masterEditInput.setCustomValidity("Vui lòng nhập giá trị.");
    selectors.masterEditInput.reportValidity();
    return;
  }

  const duplicateIndex = currentList.findIndex(
    (item, itemIndex) => item === nextValue && itemIndex !== index,
  );
  if (duplicateIndex >= 0) {
    selectors.masterEditInput.setCustomValidity(
      "Giá trị này đã có trong danh sách.",
    );
    selectors.masterEditInput.reportValidity();
    return;
  }

  selectors.masterEditInput.setCustomValidity("");
  try {
    if (oldValue !== nextValue) {
      await apiRequest(
        `${masterApiPath(listName)}/${masterId(listName, oldValue)}`,
        {
          body: JSON.stringify(masterPayload(listName, nextValue)),
          method: "PATCH",
        },
        session,
      );
      if (selectedCustomer === oldValue) selectedCustomer = nextValue;
    }

    closeMasterEditDialog();
    showToast(`Cập nhật ${masterDataConfig[listName].typeLabel} thành công.`);
    await refreshAndRender();
  } catch (error) {
    showToast(error.message);
  }
});

selectors.masterEditInput.addEventListener("input", () => {
  selectors.masterEditInput.setCustomValidity("");
});

bindDialogDismiss({
  dialog: selectors.masterEditDialog,
  cancelButton: selectors.masterEditCancel,
  onDismiss: closeMasterEditDialog,
});

selectors.masterDeleteConfirm.addEventListener("click", async () => {
  if (!pendingMasterDelete) return;
  const { listName, index } = pendingMasterDelete;
  const currentList = state[listName] || [];
  const oldValue = currentList[index];
  try {
    await apiRequest(
      `${masterApiPath(listName)}/${masterId(listName, oldValue)}`,
      { method: "DELETE" },
      session,
    );
    if (selectedCustomer === oldValue) selectedCustomer = "";
    closeMasterDeleteDialog();
    showToast(`Xóa ${masterDataConfig[listName].typeLabel} thành công.`);
    await refreshAndRender();
  } catch (error) {
    showToast(error.message);
  }
});

bindDialogDismiss({
  dialog: selectors.masterDeleteDialog,
  cancelButton: selectors.masterDeleteCancel,
  onDismiss: closeMasterDeleteDialog,
});

function handleReportPagination(event) {
  const button = event.target.closest("[data-report-page][data-page-action]");
  if (!button) return;
  event.preventDefault();

  const delta = button.dataset.pageAction === "next" ? 1 : -1;
  if (button.dataset.reportPage === "dispatch") {
    reportHistoryPage += delta;
  }
  if (button.dataset.reportPage === "invoice") {
    invoiceHistoryPage += delta;
  }
  renderAccountingReport();
}

selectors.reportHistoryPagination.addEventListener(
  "click",
  handleReportPagination,
);
selectors.invoiceHistoryPagination.addEventListener(
  "click",
  handleReportPagination,
);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date-sort]");
  if (!button) return;
  const sortKey = button.dataset.dateSort;
  if (!dateSortDirections[sortKey]) return;

  dateSortDirections[sortKey] =
    dateSortDirections[sortKey] === "asc" ? "desc" : "asc";
  resetDateSortPage(sortKey);
  render();
});

selectors.overviewPeriod.addEventListener("change", () => {
  overviewPeriod = selectors.overviewPeriod.value;
  renderInventoryChart();
});

window.addEventListener("hashchange", () => {
  setMobileNavOpen(false);
  activePage = getInitialPage();
  refreshAndRender();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMobileNavOpen(false);
  }
});

async function initializeApp() {
  try {
    await refreshAppData();
  } catch (error) {
    showToast(`Chưa kết nối được API: ${error.message}`);
  }
  render();
}

initializeApp();
