import { enhanceDateInputs } from "./ui/date-input.js";
import { paginateRows, paginationMarkup } from "./ui/table.js";

const STORAGE_KEY = "fet-logistics-demo";
const SESSION_KEY = "fet-logistics-session";
const SETTINGS_KEY = "fet-logistics-settings";

const roles = {
  warehouse: "Thủ kho",
  accounting: "Kế toán",
  driver: "Lái xe"
};

const pages = {
  "tong-quan": {
    title: "Tổng quan",
    kicker: "Bức tranh vận hành",
    subtitle: "Theo dõi tồn kho, tiến độ xuất hàng và những khách hàng cần ưu tiên xử lý.",
    roles: ["warehouse", "accounting", "driver"]
  },
  "nhap-hang": {
    title: "Nhập hàng",
    kicker: "Ghi nhận hàng vào kho",
    subtitle: "Tạo đợt nhập, thêm nhiều loại hàng cho cùng khách hàng và kiểm tra tồn còn lại.",
    roles: ["warehouse", "accounting"]
  },
  "xuat-hang": {
    title: "Xuất hàng",
    kicker: "Điều phối chuyến xe",
    subtitle: "Chọn khách hàng, xe, tài xế và số lượng hàng xuất dựa trên tồn kho khả dụng.",
    roles: ["warehouse", "driver"]
  },
  "cai-dat": {
    title: "Cài đặt",
    kicker: "Không gian làm việc",
    subtitle: "Tùy chỉnh giao diện để phù hợp cách anh muốn quan sát dữ liệu mỗi ngày.",
    roles: ["warehouse", "accounting", "driver"]
  },
  "quan-ly": {
    title: "Quản lý",
    kicker: "Dữ liệu nền tảng",
    subtitle: "Cập nhật danh sách khách hàng, xe và tài xế để các bước nhập xuất luôn nhất quán.",
    roles: ["warehouse", "accounting"]
  },
  "bao-cao": {
    title: "Báo cáo",
    kicker: "Đối soát kế toán",
    subtitle: "Xem trạng thái chốt hóa đơn và toàn bộ lịch sử xuất hàng theo từng khách hàng.",
    roles: ["warehouse", "accounting", "driver"]
  }
};

const legacyRoutes = {
  dashboard: "tong-quan",
  receipt: "nhap-hang",
  dispatch: "xuat-hang",
  "master-data": "quan-ly",
  "danh-muc": "quan-ly",
  reports: "bao-cao"
};

const demoVehicles = ["51C-123.45", "50H-888.88", "29C-456.78", "60C-222.11"];
const demoDrivers = ["Nguyễn Văn An", "Trần Minh Quân", "Lê Hoàng Nam", "Phạm Quốc Huy"];

const demoCustomers = [
  "Vinamilk",
  "Hoa Phat Group",
  "Masan Consumer",
  "Vingroup",
  "Petrolimex",
  "FPT Corporation",
  "Viettel Post",
  "Sabeco",
  "Mobile World",
  "Duc Giang Chemicals",
  "Vinatex",
  "Thaco",
  "Binh Minh Plastics",
  "Traphaco",
  "Nam Kim Steel",
  "Refrigeration Electrical Engineering",
  "Dabaco",
  "Gemadept",
  "Tan Cang Sai Gon",
  "An Phat Holdings"
];

const demoItems = [
  { sku: "THEP", unit: "tan" },
  { sku: "SUA", unit: "thung" },
  { sku: "VAI", unit: "cuon" },
  { sku: "NHUA", unit: "kien" },
  { sku: "BANH", unit: "thung" },
  { sku: "HOA CHAT", unit: "can" },
  { sku: "MAY MOC", unit: "pallet" },
  { sku: "DAU", unit: "phuy" }
];

const demoState = {
  customers: demoCustomers,
  invoice: buildDemoInvoice(),
  invoiceApprovals: [],
  vehicles: demoVehicles,
  drivers: demoDrivers,
  dispatches: [
    { date: "2026-05-17", customer: "Vinamilk", warehouse: "Thủ kho mẫu", truck: "51C-123.45", driver: "Nguyễn Văn An", sku: "THEP", quantity: 50 },
    { date: "2026-05-17", customer: "Hoa Phat Group", warehouse: "Thủ kho mẫu", truck: "51C-123.45", driver: "Nguyễn Văn An", sku: "SUA", quantity: 120 },
    { date: "2026-05-18", customer: "Masan Consumer", warehouse: "Thủ kho mẫu", truck: "50H-888.88", driver: "Trần Minh Quân", sku: "VAI", quantity: 80 },
    { date: "2026-05-18", customer: "Vingroup", warehouse: "Thủ kho mẫu", truck: "50H-888.88", driver: "Trần Minh Quân", sku: "NHUA", quantity: 100 }
  ]
};

let state = loadState();
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
let dispatchToastTimer;
let overviewPeriod = "month";

const selectors = {
  loginScreen: document.querySelector("#login-screen"),
  loginForm: document.querySelector("#login-form"),
  activeUser: document.querySelector("#active-user"),
  activeRole: document.querySelector("#active-role"),
  pageKicker: document.querySelector("#page-kicker"),
  pageTitle: document.querySelector("#page-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  overviewPeriodControl: document.querySelector("#overview-period-control"),
  overviewPeriod: document.querySelector("#overview-period"),
  logoutButton: document.querySelector("#logout-button"),
  stockForm: document.querySelector("#stock-form"),
  dispatchForm: document.querySelector("#dispatch-form"),
  dispatchSuccess: document.querySelector("#dispatch-success"),
  dispatchHistoryFilter: document.querySelector("#dispatch-history-filter"),
  dispatchHistoryTable: document.querySelector("#dispatch-history-table"),
  dispatchHistoryPagination: document.querySelector("#dispatch-history-pagination"),
  settingsForm: document.querySelector("#settings-form"),
  customerForm: document.querySelector("#customer-form"),
  customerManagementList: document.querySelector("#customer-management-list"),
  customerManagementPagination: document.querySelector("#customer-management-pagination"),
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
  receiptHistoryPagination: document.querySelector("#receipt-history-pagination"),
  dispatchTripList: document.querySelector("#dispatch-trip-list"),
  accountingReport: document.querySelector("#accounting-report"),
  reportHistoryTable: document.querySelector("#report-history-table"),
  reportHistoryPagination: document.querySelector("#report-history-pagination"),
  invoiceHistoryTable: document.querySelector("#invoice-history-table"),
  invoiceHistoryPagination: document.querySelector("#invoice-history-pagination"),
  invoiceConfirmDialog: document.querySelector("#invoice-confirm-dialog"),
  invoiceConfirmTitle: document.querySelector("#invoice-confirm-title"),
  invoiceConfirmCopy: document.querySelector("#invoice-confirm-copy"),
  invoiceConfirmApprove: document.querySelector("#invoice-confirm-approve"),
  invoiceConfirmCancel: document.querySelector("#invoice-confirm-cancel"),
  totalInvoiced: document.querySelector("#total-invoiced"),
  totalDispatched: document.querySelector("#total-dispatched"),
  totalRemaining: document.querySelector("#total-remaining"),
  billingStatus: document.querySelector("#billing-status"),
  skuSelect: document.querySelector("select[name='sku']"),
  pageViews: document.querySelectorAll(".page-view"),
  pageLinks: document.querySelectorAll("[data-page-link]"),
  writableOnly: document.querySelectorAll(".writable-only")
};

setToday(selectors.dispatchForm.elements.date);
setToday(selectors.dispatchHistoryFilter.elements.date);
setToday(selectors.stockForm.elements.date);
setDefaultItemFields(selectors.stockForm);
enhanceDateInputs();

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return structuredClone(demoState);
  }

  const parsed = JSON.parse(stored);
  parsed.customers = parsed.customers || Array.from(new Set((parsed.invoice || []).map((item) => item.customer || "CustomerA")));
  parsed.invoiceApprovals = parsed.invoiceApprovals || [];
  parsed.vehicles = parsed.vehicles || demoVehicles;
  parsed.drivers = parsed.drivers || demoDrivers;
  const customers = new Set((parsed.invoice || []).map((item) => item.customer || "CustomerA"));
  return customers.size >= 20 ? parsed : structuredClone(demoState);
}

function loadSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  const defaults = { theme: "light", background: "default", accent: "teal", textSize: "comfortable" };
  return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function navigateTo(page) {
  activePage = pages[page] ? page : "tong-quan";
  window.history.replaceState(null, "", `#${activePage}`);
  render();
}

function buildDemoInvoice() {
  return demoCustomers.flatMap((customer, customerIndex) => {
    const lineCount = 3 + (customerIndex % 3);
    return Array.from({ length: lineCount }, (_, lineIndex) => {
      const item = demoItems[(customerIndex + lineIndex) % demoItems.length];
      const quantity = 80 + ((customerIndex + 2) * (lineIndex + 3) * 17) % 520;
      const day = String(1 + ((customerIndex + lineIndex) % 17)).padStart(2, "0");
      return {
        customer,
        date: `2026-05-${day}`,
        sku: item.sku,
        quantity,
        unit: item.unit
      };
    });
  });
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
  const invoiceItems = customer ? state.invoice.filter((item) => item.customer === customer) : state.invoice;
  const dispatchItems = customer ? state.dispatches.filter((item) => item.customer === customer) : state.dispatches;
  const invoiced = invoiceTotals(invoiceItems);
  const dispatched = dispatchTotals(dispatchItems);
  const units = skuUnits(invoiceItems);
  const skus = Array.from(new Set([...Object.keys(invoiced), ...Object.keys(dispatched)])).sort();

  return skus.map((sku) => {
    const invoiceQuantity = invoiced[sku] || 0;
    const dispatchedQuantity = dispatched[sku] || 0;
    return {
      sku,
      invoiceQuantity,
      dispatchedQuantity,
      remainingQuantity: invoiceQuantity - dispatchedQuantity,
      unit: units[sku] || "don vi"
    };
  });
}

function skuUnits(items = state.invoice) {
  return items.reduce((units, item) => {
    const sku = normalizeSku(item.sku);
    units[sku] = item.unit || units[sku] || "don vi";
    return units;
  }, {});
}

function stockRows() {
  const dispatched = customerDispatchTotals();
  const dispatchedUsed = {};

  return state.invoice
    .map((item) => {
      const sku = normalizeSku(item.sku);
      const customer = item.customer || "CustomerA";
      const key = `${customer}||${sku}`;
      const dispatchedForSku = dispatched[key] || 0;
      const alreadyUsed = dispatchedUsed[key] || 0;
      const quantity = Number(item.quantity);
      const deducted = Math.min(quantity, Math.max(dispatchedForSku - alreadyUsed, 0));
      dispatchedUsed[key] = alreadyUsed + deducted;

      return {
        customer,
        sku,
        unit: item.unit || "don vi",
        date: item.date || "2026-05-17",
        remainingQuantity: quantity - deducted
      };
    })
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
        latestDate: row.date
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
      itemTypeCount: summary.itemTypes.size
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity || a.customer.localeCompare(b.customer));
}

function tripGroups(customerFilter = "") {
  const groups = new Map();

  state.dispatches
    .filter((item) => !customerFilter || item.customer === customerFilter)
    .forEach((item) => {
    const customer = item.customer || "CustomerA";
    const key = `${item.date}-${customer}-${item.truck}-${item.driver}`;
    if (!groups.has(key)) {
      groups.set(key, { date: item.date, customer, truck: item.truck, driver: item.driver, items: [], total: 0 });
    }

    const trip = groups.get(key);
    trip.items.push(`${item.sku}: ${item.quantity}`);
    trip.total += Number(item.quantity);
    });

  return Array.from(groups.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function render() {
  applySettings();
  renderSession();
  renderPage();
  renderCustomerOptions();
  renderMasterData();

  const rows = inventoryRows();
  const totalInvoiced = rows.reduce((sum, row) => sum + row.invoiceQuantity, 0);
  const totalDispatched = rows.reduce((sum, row) => sum + Math.min(row.invoiceQuantity, row.dispatchedQuantity), 0);
  const totalRemaining = rows.reduce((sum, row) => sum + Math.max(row.remainingQuantity, 0), 0);
  const extraItems = rows.filter((row) => row.remainingQuantity < 0);
  const readyToBill = totalRemaining === 0 && extraItems.length === 0;

  selectors.totalInvoiced.textContent = totalInvoiced.toLocaleString("vi-VN");
  selectors.totalDispatched.textContent = totalDispatched.toLocaleString("vi-VN");
  selectors.totalRemaining.textContent = totalRemaining.toLocaleString("vi-VN");
  selectors.billingStatus.textContent = readyToBill ? "Đủ điều kiện" : "Đang chờ";

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

  selectors.dispatchTripList.innerHTML = selectedCustomer
    ? tripMarkupForCustomer(selectedCustomer)
    : sampleTripCard();
}

function tripMarkupForCustomer(customer) {
  return tripGroups(customer).map((trip) => `
    <article class="trip-card">
      <div>
        <strong>${trip.truck}</strong>
        <span>${trip.customer} - ${trip.driver} - ${formatDate(trip.date)}</span>
      </div>
      <p>${trip.items.join(" | ")}</p>
      <small>Tổng số lượng chuyến xe: ${trip.total.toLocaleString("vi-VN")}</small>
    </article>
  `).join("") || sampleTripCard("Khách hàng này chưa có chuyến xuất hàng.");
}

function sampleTripCard(message = "Chọn khách hàng để xem các chuyến xe liên quan.") {
  return `
    <article class="trip-card">
      <p>${message}</p>
    </article>
  `;
}

function customerInventorySummary(customer) {
  const rows = stockRows().filter((row) => row.customer === customer);
  return {
    remainingQuantity: rows.reduce((sum, row) => sum + row.remainingQuantity, 0),
    itemTypeCount: new Set(rows.map((row) => row.sku)).size
  };
}

function renderReceiptCustomerView() {
  syncReceiptCustomerSelects();

  if (!selectedCustomer) {
    selectors.customerDetailTitle.textContent = "Tổng hợp hàng nhập";
    selectors.customerDetailCopy.textContent = "Chọn khách hàng từ Tổng quan hoặc danh sách bên trên để xem dữ liệu thực tế.";
    selectors.stockTable.innerHTML = sampleTableRow(3);
    selectors.stockPagination.innerHTML = "";
    selectors.inventoryTable.innerHTML = sampleTableRow(4);
    selectors.receiptHistoryPagination.innerHTML = "";
    return;
  }

  const summaryRows = receiptSummaryRows(selectedCustomer);
  const historyRows = state.invoice
    .filter((item) => item.customer === selectedCustomer)
    .sort((a, b) => b.date.localeCompare(a.date));
  const summaryPage = paginateRows(summaryRows, receiptSummaryPage);
  const historyPage = paginateRows(historyRows, receiptHistoryPage);
  receiptSummaryPage = summaryPage.page;
  receiptHistoryPage = historyPage.page;

  selectors.customerDetailTitle.textContent = `Tổng hợp hàng nhập - ${selectedCustomer}`;
  selectors.customerDetailCopy.textContent = `${summaryRows.length} loại hàng đã được ghi nhận.`;

  selectors.stockTable.innerHTML = summaryPage.rows.map((row) => `
    <tr>
      <td><strong>${row.sku}</strong></td>
      <td>${row.quantity.toLocaleString("vi-VN")}</td>
      <td>${row.unit}</td>
    </tr>
  `).join("") || sampleTableRow(3, "Khách hàng này chưa có dữ liệu nhập hàng.");
  renderTablePagination(selectors.stockPagination, receiptSummaryPage, summaryPage.pageCount, "summary");

  selectors.inventoryTable.innerHTML = historyPage.rows.map((row) => `
    <tr>
      <td>${formatDate(row.date)}</td>
      <td><strong>${row.sku}</strong></td>
      <td>${Number(row.quantity).toLocaleString("vi-VN")}</td>
      <td>${row.unit || "đơn vị"}</td>
    </tr>
  `).join("") || sampleTableRow(4, "Khách hàng này chưa có lịch sử nhập hàng.");
  renderTablePagination(selectors.receiptHistoryPagination, receiptHistoryPage, historyPage.pageCount, "history");
}

function renderTablePagination(container, currentPage, pageCount, tableName) {
  container.innerHTML = paginationMarkup({ page: currentPage, pageCount, scopeAttribute: "data-receipt-page", scope: tableName });
}

function renderDispatchPagination(page, pageCount) {
  selectors.dispatchHistoryPagination.innerHTML = paginationMarkup({ page, pageCount, scopeAttribute: "data-dispatch-page", scope: "history" });
}

function renderReportPagination(container, page, pageCount, tableName) {
  container.innerHTML = paginationMarkup({ page, pageCount, scopeAttribute: "data-report-page", scope: tableName });
}

function resetReceiptPages() {
  receiptSummaryPage = 1;
  receiptHistoryPage = 1;
}

function showDispatchToast(message = "Xuất hàng thành công. Lịch sử bên dưới đã được cập nhật.") {
  window.clearTimeout(dispatchToastTimer);
  selectors.dispatchSuccess.textContent = message;
  selectors.dispatchSuccess.hidden = false;
  selectors.dispatchSuccess.classList.add("visible");
  dispatchToastTimer = window.setTimeout(() => {
    selectors.dispatchSuccess.classList.remove("visible");
    selectors.dispatchSuccess.hidden = true;
  }, 5000);
}

function openInvoiceConfirmDialog(customer) {
  pendingInvoiceCustomer = customer;
  selectors.invoiceConfirmTitle.textContent = `Xuất hóa đơn cho ${customer}?`;
  selectors.invoiceConfirmCopy.textContent = "Sau khi đồng ý, khách hàng sẽ được ghi nhận vào lịch sử xuất hóa đơn và được xóa khỏi danh sách đủ điều kiện.";
  selectors.invoiceConfirmDialog.hidden = false;
  selectors.invoiceConfirmApprove.focus();
}

function closeInvoiceConfirmDialog() {
  pendingInvoiceCustomer = "";
  selectors.invoiceConfirmDialog.hidden = true;
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

  return Array.from(rows.values()).sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku));
}

function sampleTableRow(colspan, message = "Chưa chọn khách hàng. Đây là khu vực hiển thị dữ liệu sau khi chọn khách hàng.") {
  return `
    <tr>
      <td colspan="${colspan}">${message}</td>
    </tr>
  `;
}

function renderAccountingReport() {
  const customers = Array.from(new Set(state.invoice.map((item) => item.customer || "CustomerA"))).sort();
  const approvedCustomers = new Set((state.invoiceApprovals || []).map((item) => item.customer));
  const reportRows = customers.map((customer) => {
    const summary = customerInventorySummary(customer);
    const customerDispatches = state.dispatches.filter((item) => (item.customer || "CustomerA") === customer);
    const lastDispatchAt = latestDispatchTimestamp(customerDispatches);
    const status = summary.remainingQuantity === 0 ? "complete" : "pending";
    return {
      customer,
      ...summary,
      historyCount: customerDispatches.length,
      lastDispatchAt,
      completedAgo: relativeTimeFrom(lastDispatchAt),
      status
    };
  });
  const completedRows = reportRows.filter((row) => row.status === "complete" && !approvedCustomers.has(row.customer));
  const currentCustomer = completedRows.some((row) => row.customer === selectedReportCustomer)
    ? selectedReportCustomer
    : completedRows[0]?.customer || "";

  if (currentCustomer && selectedReportCustomer !== currentCustomer) {
    selectedReportCustomer = currentCustomer;
  }

  selectors.accountingReport.innerHTML = completedRows.map((row) => `
    <article class="report-customer-card ${row.customer === currentCustomer ? "active" : ""}" data-report-customer="${row.customer}">
      <div class="report-card-title">
        <strong>${row.customer}</strong>
        <span class="status-pill complete">Hoàn thành</span>
      </div>
      <span class="report-meta">Hoàn thành ${row.completedAgo} - ${row.historyCount.toLocaleString("vi-VN")} dòng lịch sử xuất hàng</span>
      <button class="invoice-button" data-invoice-action="approve" type="button">Xuất hóa đơn</button>
    </article>
  `).join("") || `
    <div class="empty-state">
      <strong>Chưa có khách hàng hoàn thành</strong>
      <span>Khi hàng của khách được xuất hết, khách hàng sẽ xuất hiện ở đây để kế toán xuất hóa đơn.</span>
    </div>
  `;

  const history = state.dispatches
    .filter((item) => (item.customer || "CustomerA") === currentCustomer)
    .sort((a, b) => b.date.localeCompare(a.date));
  const historyPage = paginateRows(history, reportHistoryPage);
  reportHistoryPage = historyPage.page;

  selectors.reportHistoryTable.innerHTML = historyPage.rows.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${item.warehouse || "Thủ kho mẫu"}</td>
      <td><strong>${item.truck}</strong></td>
      <td>${item.driver}</td>
      <td>${item.sku}</td>
      <td>${Number(item.quantity).toLocaleString("vi-VN")}</td>
    </tr>
  `).join("") || sampleTableRow(6, currentCustomer ? "Chưa có lịch sử xuất hàng cho khách hàng này." : "Chọn khách hàng hoàn thành để xem lịch sử xuất hàng.");
  renderReportPagination(selectors.reportHistoryPagination, reportHistoryPage, historyPage.pageCount, "dispatch");

  const invoiceHistory = [...(state.invoiceApprovals || [])].sort((a, b) => b.date.localeCompare(a.date));
  const invoicePage = paginateRows(invoiceHistory, invoiceHistoryPage);
  invoiceHistoryPage = invoicePage.page;
  selectors.invoiceHistoryTable.innerHTML = invoicePage.rows.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${item.customer}</td>
      <td><span class="status-pill complete">${item.status || "Hoàn thành"}</span></td>
    </tr>
  `).join("") || sampleTableRow(3, "Chưa có lịch sử xuất hóa đơn.");
  renderReportPagination(selectors.invoiceHistoryPagination, invoiceHistoryPage, invoicePage.pageCount, "invoice");
}

function latestDispatchTimestamp(dispatches) {
  return dispatches.reduce((latest, item) => {
    const timestamp = new Date(item.createdAt || item.date).getTime();
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
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
    selectors.customerGrid.innerHTML = `
      <div class="empty-state">
        <strong>Chưa có khách hàng đang có hàng trong kho</strong>
        <span>Khi thủ kho nhập hàng, khách hàng sẽ xuất hiện tại đây để theo dõi nhanh.</span>
      </div>
    `;
    selectors.customerPagination.innerHTML = "";
    return;
  }

  const pageSize = customerCardsPerPage();
  const pageCount = Math.max(Math.ceil(summaries.length / pageSize), 1);
  customerPage = Math.min(customerPage, pageCount);
  const start = (customerPage - 1) * pageSize;
  const visibleSummaries = summaries.slice(start, start + pageSize);

  selectors.customerGrid.innerHTML = visibleSummaries.map((summary) => `
    <button class="customer-card ${summary.customer === selectedCustomer ? "active" : ""}" data-customer="${summary.customer}" type="button">
      <span>${summary.customer}</span>
      <strong>${summary.totalQuantity.toLocaleString("vi-VN")}</strong>
      <small>${summary.itemTypeCount} loại hàng - cập nhật ${formatDate(summary.latestDate)}</small>
    </button>
  `).join("");

  selectors.customerPagination.innerHTML = pageCount > 1 ? `
    <button type="button" data-page-action="prev" ${customerPage === 1 ? "disabled" : ""}>Trước</button>
    <span>Trang ${customerPage} / ${pageCount}</span>
    <button type="button" data-page-action="next" ${customerPage === pageCount ? "disabled" : ""}>Sau</button>
  ` : "";
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
  const path = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.quantity - minValue) / range) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
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
      ${points.map((point, index) => {
        const x = padding + (index / (points.length - 1)) * (width - padding * 2);
        const y = height - padding - ((point.quantity - minValue) / range) * (height - padding * 2);
        return `<circle class="chart-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index % 5 === 0 || index === points.length - 1 ? 4 : 2}" />`;
      }).join("")}
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
    return { days: 90, label: "Quý", axis: ["Ngày 1", "Ngày 30", "Ngày 60", "Ngày 90"] };
  }
  return { days: 31, label: "Tháng", axis: ["01/05", "10/05", "20/05", "31/05"] };
}

function inventoryTrend(dayCount) {
  const days = Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    quantity: 0
  }));

  state.invoice.forEach((item) => {
    const day = Math.min(new Date(item.date || "2026-05-01").getDate(), dayCount);
    days.forEach((point) => {
      if (point.day >= day) {
        point.quantity += Number(item.quantity);
      }
    });
  });

  state.dispatches.forEach((item) => {
    const day = Math.min(new Date(item.date || "2026-05-01").getDate(), dayCount);
    days.forEach((point) => {
      if (point.day >= day) {
        point.quantity -= Number(item.quantity);
      }
    });
  });

  return days.map((point) => ({
    ...point,
    quantity: Math.max(point.quantity, 0)
  }));
}

function renderSession() {
  const activeRole = session?.role || "warehouse";
  document.body.dataset.role = activeRole;
  selectors.loginScreen.hidden = Boolean(session);
  selectors.activeUser.textContent = session?.name || "Người dùng mẫu";
  selectors.activeRole.textContent = roles[activeRole];

  selectors.writableOnly.forEach((form) => {
    const canWrite = activeRole === "warehouse";
    form.querySelectorAll("input, select, button").forEach((field) => {
      field.disabled = !canWrite;
    });
  });

}

function renderPage() {
  const activeRole = session?.role || "warehouse";
  if (!pages[activePage].roles.includes(activeRole)) {
    activePage = "tong-quan";
    window.history.replaceState(null, "", "#tong-quan");
  }

  const page = pages[activePage];
  selectors.pageKicker.textContent = page.kicker;
  selectors.pageTitle.textContent = page.title;
  selectors.pageSubtitle.textContent = page.subtitle;
  selectors.overviewPeriodControl.hidden = activePage !== "tong-quan";

  selectors.pageViews.forEach((view) => {
    const allowedRoles = view.dataset.roles ? view.dataset.roles.split(" ") : pages[view.dataset.page].roles;
    view.hidden = view.dataset.page !== activePage || !allowedRoles.includes(activeRole);
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
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function normalizeSku(value) {
  return value.toString().trim().toUpperCase();
}

function setToday(input) {
  input.valueAsDate = new Date();
}

function renderCustomerOptions() {
  const customers = allCustomers();
  selectors.customerList.innerHTML = customers.map((customer) => `<option value="${customer}"></option>`).join("");
  const stockCustomer = selectedCustomer || selectors.stockForm.elements.customer.value;
  const dispatchCustomer = selectors.dispatchForm.elements.customer.value || selectedCustomer;
  const customerOptions = customerSelectOptions(customers);

  selectors.stockForm.elements.customer.innerHTML = customerOptions;
  selectors.dispatchForm.elements.customer.innerHTML = customerOptions;
  selectors.stockForm.elements.customer.value = customers.includes(stockCustomer) ? stockCustomer : "";
  selectors.dispatchForm.elements.customer.value = customers.includes(dispatchCustomer) ? dispatchCustomer : "";
}

function customerSelectOptions(customers) {
  return `
    <option value="">Chọn khách hàng</option>
    ${customers.map((customer) => `<option value="${customer}">${customer}</option>`).join("")}
  `;
}

function allCustomers() {
  return Array.from(new Set([
    ...(state.customers || []),
    ...state.invoice.map((item) => item.customer || "CustomerA")
  ])).sort();
}

function renderDispatchSkuOptions() {
  const customer = selectors.dispatchForm.elements.customer.value || selectedCustomer;
  const rows = stockRows().filter((row) => row.customer === customer);
  const currentSku = selectors.skuSelect.value;
  selectors.skuSelect.innerHTML = rows.map((row) => `
    <option value="${row.sku}" ${row.sku === currentSku ? "selected" : ""}>${row.sku} - còn ${row.remainingQuantity.toLocaleString("vi-VN")} ${row.unit}</option>
  `).join("");
  const selectedRow = rows.find((row) => row.sku === selectors.skuSelect.value) || rows[0];
  selectors.dispatchForm.elements.quantity.value = selectedRow ? selectedRow.remainingQuantity : "";
  selectors.dispatchForm.elements.quantity.max = selectedRow ? selectedRow.remainingQuantity : "";
}

function renderDispatchHistory() {
  const form = selectors.dispatchHistoryFilter;
  const filters = {
    date: form.elements.date.value,
    truck: form.elements.truck.value,
    driver: form.elements.driver.value
  };
  const rows = state.dispatches
    .filter((item) => !filters.date || item.date === filters.date)
    .filter((item) => !filters.truck || item.truck === filters.truck)
    .filter((item) => !filters.driver || item.driver === filters.driver)
    .sort((a, b) => b.date.localeCompare(a.date));
  const page = paginateRows(rows, dispatchHistoryPage);
  dispatchHistoryPage = page.page;

  selectors.dispatchHistoryTable.innerHTML = page.rows.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${item.customer}</td>
      <td><strong>${item.truck}</strong></td>
      <td>${item.driver}</td>
      <td>${item.sku}</td>
      <td>${Number(item.quantity).toLocaleString("vi-VN")}</td>
    </tr>
  `).join("") || sampleTableRow(6, "Chưa có lịch sử xuất hàng phù hợp với bộ lọc hiện tại.");
  renderDispatchPagination(dispatchHistoryPage, page.pageCount);
}

function renderMasterData() {
  const selectedTruck = selectors.dispatchForm.elements.truck.value;
  const selectedDriver = selectors.dispatchForm.elements.driver.value;
  const selectedHistoryTruck = selectors.dispatchHistoryFilter.elements.truck.value;
  const selectedHistoryDriver = selectors.dispatchHistoryFilter.elements.driver.value;
  selectors.dispatchForm.elements.truck.innerHTML = state.vehicles.map((plate) => `
    <option value="${plate}" ${plate === selectedTruck ? "selected" : ""}>${plate}</option>
  `).join("");
  selectors.dispatchForm.elements.driver.innerHTML = state.drivers.map((driver) => `
    <option value="${driver}" ${driver === selectedDriver ? "selected" : ""}>${driver}</option>
  `).join("");
  selectors.dispatchHistoryFilter.elements.truck.innerHTML = `
    <option value="">Tất cả xe</option>
    ${state.vehicles.map((plate) => `<option value="${plate}" ${plate === selectedHistoryTruck ? "selected" : ""}>${plate}</option>`).join("")}
  `;
  selectors.dispatchHistoryFilter.elements.driver.innerHTML = `
    <option value="">Tất cả tài xế</option>
    ${state.drivers.map((driver) => `<option value="${driver}" ${driver === selectedHistoryDriver ? "selected" : ""}>${driver}</option>`).join("")}
  `;

  state.customers = state.customers || allCustomers();
  customerManagementPage = renderMasterList({
    items: state.customers,
    page: customerManagementPage,
    listName: "customers",
    listElement: selectors.customerManagementList,
    paginationElement: selectors.customerManagementPagination,
    emptyMessage: "Chưa có khách hàng trong danh mục."
  });
  vehicleManagementPage = renderMasterList({
    items: state.vehicles,
    page: vehicleManagementPage,
    listName: "vehicles",
    listElement: selectors.vehicleList,
    paginationElement: selectors.vehiclePagination,
    emptyMessage: "Chưa có xe vận chuyển trong danh mục."
  });
  driverManagementPage = renderMasterList({
    items: state.drivers,
    page: driverManagementPage,
    listName: "drivers",
    listElement: selectors.driverList,
    paginationElement: selectors.driverPagination,
    emptyMessage: "Chưa có tài xế trong danh mục."
  });
}

function renderMasterList({ items, page, listName, listElement, paginationElement, emptyMessage }) {
  const numberedItems = items.map((value, index) => ({ value, index }));
  const paginated = paginateRows(numberedItems, page);
  listElement.innerHTML = paginated.rows.map((item) => `
    <div class="master-item">
      <strong>${item.value}</strong>
      <div>
        <button type="button" data-master="${listName}" data-action="edit" data-index="${item.index}">Sửa</button>
        <button type="button" data-master="${listName}" data-action="delete" data-index="${item.index}">Xóa</button>
      </div>
    </div>
  `).join("") || `<div class="empty-state">${emptyMessage}</div>`;
  paginationElement.innerHTML = paginationMarkup({
    page: paginated.page,
    pageCount: paginated.pageCount,
    scopeAttribute: "data-master-page",
    scope: listName
  });
  return paginated.page;
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

function ensureCustomer(customer) {
  state.customers = state.customers || [];
  if (customer && !state.customers.includes(customer)) {
    state.customers.push(customer);
  }
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

selectors.stockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.invoice.push({
    customer: data.get("customer").toString().trim(),
    date: data.get("date"),
    sku: normalizeSku(data.get("sku")),
    quantity: Number(data.get("quantity")),
    unit: data.get("unit").toString().trim()
  });
  ensureCustomer(data.get("customer").toString().trim());
  saveState();
  resetReceiptPages();
  resetItemFields(event.currentTarget);
  setToday(selectors.stockForm.elements.date);
  render();
});

selectors.dispatchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const customer = data.get("customer").toString().trim();
  state.dispatches.push({
    date: data.get("date"),
    customer,
    warehouse: session?.name || "Thủ kho mẫu",
    truck: data.get("truck").toString().trim().toUpperCase(),
    driver: data.get("driver").toString().trim(),
    sku: normalizeSku(data.get("sku")),
    quantity: Number(data.get("quantity")),
    createdAt: new Date().toISOString()
  });
  ensureCustomer(customer);
  selectedCustomer = customer;
  saveState();
  event.currentTarget.reset();
  setToday(selectors.dispatchForm.elements.date);
  selectors.dispatchForm.elements.customer.value = selectedCustomer;
  selectors.dispatchHistoryFilter.elements.date.value = data.get("date");
  selectors.dispatchHistoryFilter.elements.truck.value = data.get("truck").toString().trim().toUpperCase();
  selectors.dispatchHistoryFilter.elements.driver.value = data.get("driver").toString().trim();
  dispatchHistoryPage = 1;
  showDispatchToast();
  render();
});

selectors.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  saveSession({
    role: data.get("role"),
    name: data.get("name").toString().trim()
  });
  render();
});

selectors.logoutButton.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  session = null;
  render();
});

selectors.pageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const page = event.currentTarget.dataset.pageLink;
    if (pages[page].roles.includes(session?.role || "warehouse")) {
      navigateTo(page);
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
  navigateTo("nhap-hang");
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
selectors.receiptHistoryPagination.addEventListener("click", handleReceiptPagination);

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

selectors.vehicleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const plate = new FormData(event.currentTarget).get("plate").toString().trim().toUpperCase();
  if (plate && !state.vehicles.includes(plate)) {
    state.vehicles.push(plate);
    vehicleManagementPage = Math.ceil(state.vehicles.length / 10);
    saveState();
  }
  event.currentTarget.reset();
  render();
});

selectors.driverForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name").toString().trim();
  if (name && !state.drivers.includes(name)) {
    state.drivers.push(name);
    driverManagementPage = Math.ceil(state.drivers.length / 10);
    saveState();
  }
  event.currentTarget.reset();
  render();
});

selectors.customerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name").toString().trim();
  state.customers = state.customers || [];
  if (name && !state.customers.includes(name)) {
    state.customers.push(name);
    customerManagementPage = Math.ceil(state.customers.length / 10);
    saveState();
  }
  event.currentTarget.reset();
  render();
});

selectors.settingsForm.addEventListener("change", (event) => {
  const form = event.currentTarget;
  settings = {
    theme: form.elements.theme.value,
    background: form.elements.background.value,
    accent: form.elements.accent.value,
    textSize: form.elements.textSize.value
  };
  saveSettings();
  applySettings();
});

document.querySelector("#master-data").addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-master-page][data-page-action]");
  if (pageButton) {
    event.preventDefault();
    const delta = pageButton.dataset.pageAction === "next" ? 1 : -1;
    if (pageButton.dataset.masterPage === "customers") customerManagementPage += delta;
    if (pageButton.dataset.masterPage === "vehicles") vehicleManagementPage += delta;
    if (pageButton.dataset.masterPage === "drivers") driverManagementPage += delta;
    renderMasterData();
    return;
  }

  const button = event.target.closest("[data-master]");
  if (!button) {
    return;
  }

  const listName = button.dataset.master;
  const index = Number(button.dataset.index);
  const currentList = state[listName] || [];
  if (button.dataset.action === "delete") {
    const value = currentList[index];
    state[listName] = (state[listName] || []).filter((item) => item !== value);
  } else {
    const nextValue = window.prompt("Nhập giá trị mới", currentList[index]);
    if (nextValue?.trim()) {
      const normalizedValue = listName === "vehicles" ? nextValue.trim().toUpperCase() : nextValue.trim();
      const oldValue = currentList[index];
      state[listName] = (state[listName] || currentList).map((item) => item === oldValue ? normalizedValue : item);
      if (listName === "customers") {
        state.invoice.forEach((item) => {
          if (item.customer === oldValue) item.customer = normalizedValue;
        });
        state.dispatches.forEach((item) => {
          if (item.customer === oldValue) item.customer = normalizedValue;
        });
        (state.invoiceApprovals || []).forEach((item) => {
          if (item.customer === oldValue) item.customer = normalizedValue;
        });
      }
    }
  }
  saveState();
  render();
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

selectors.invoiceConfirmApprove.addEventListener("click", () => {
  if (!pendingInvoiceCustomer) return;
  state.invoiceApprovals = state.invoiceApprovals || [];
  state.invoiceApprovals.unshift({
    date: new Date().toISOString().slice(0, 10),
    customer: pendingInvoiceCustomer,
    status: "Hoàn thành"
  });
  selectedReportCustomer = "";
  reportHistoryPage = 1;
  invoiceHistoryPage = 1;
  saveState();
  showDispatchToast("Xuất hóa đơn và lịch sử xuất hóa đơn đã ghi nhận thành công.");
  closeInvoiceConfirmDialog();
  render();
});

selectors.invoiceConfirmCancel.addEventListener("click", closeInvoiceConfirmDialog);

selectors.invoiceConfirmDialog.addEventListener("click", (event) => {
  if (event.target === selectors.invoiceConfirmDialog) {
    closeInvoiceConfirmDialog();
  }
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

selectors.reportHistoryPagination.addEventListener("click", handleReportPagination);
selectors.invoiceHistoryPagination.addEventListener("click", handleReportPagination);

selectors.overviewPeriod.addEventListener("change", () => {
  overviewPeriod = selectors.overviewPeriod.value;
  renderInventoryChart();
});

window.addEventListener("hashchange", () => {
  activePage = getInitialPage();
  render();
});

render();
