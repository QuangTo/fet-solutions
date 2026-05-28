export {
  configurableRoleOrder,
  DEFAULT_UNIT,
  defaultPageAccess,
  managedUserRoles,
  normalizePageAccess,
  normalizePageId,
  normalizeRole,
  loginPath,
  pageIdFromPathname,
  pageOrder,
  pagePaths,
  pages,
  roleCanAccessPage,
  roles,
} from "./fet-config.cjs";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeApiDate(value) {
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

export function formatDate(value) {
  const normalized = normalizeApiDate(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function normalizeSku(value = "") {
  return value.toString().trim().toUpperCase();
}

export function flattenReceipts(receipts = []) {
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
      warehouse: receipt.warehouse,
      warehouseCode: receipt.warehouseCode,
      warehouseId: receipt.warehouseId,
    })),
  );
}

export function listItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.items || [];
}

export function flattenDispatches(dispatches = []) {
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
      warehouseCode: dispatch.warehouseCode,
      warehouseId: dispatch.warehouseId,
    })),
  );
}

export function composeState({ master, catalog, operations, accounting, report }) {
  const catalogData = catalog || master || {};
  const accountingData = accounting || report || {};
  const customers = catalogData?.customers || [];
  const vehicles = catalogData?.vehicles || [];
  const drivers = catalogData?.drivers || [];
  const warehouses = catalogData?.warehouses || [];
  const receipts = flattenReceipts(listItems(operations?.receipts));
  const dispatches = flattenDispatches(listItems(operations?.dispatches));

  return {
    billingReady:
      accountingData?.ready ||
      accountingData?.billingReady ||
      report?.billingReady ||
      [],
    customerIds: Object.fromEntries(
      customers.map((item) => [item.label, item.id]),
    ),
    customerRecords: customers,
    customers: customers.map((item) => item.label),
    dispatches,
    driverIds: Object.fromEntries(drivers.map((item) => [item.label, item.id])),
    driverRecords: drivers,
    drivers: drivers.map((item) => item.label),
    inventory: (operations?.inventory || []).map((row) => ({
      ...row,
      currentPeriodOnly: row.currentPeriodOnly !== false,
      dispatchedQuantity: Number(row.dispatchedQuantity || 0),
      invoiceQuantity: Number(row.receivedQuantity || 0),
      remainingQuantity: Number(row.remainingQuantity || 0),
    })),
    invoice: receipts,
    invoiceApprovals:
      listItems(accountingData?.closuresPage) ||
      accountingData?.closures ||
      accountingData?.invoiceApprovals ||
      listItems(report?.closuresPage) ||
      report?.invoiceApprovals ||
      [],
    vehicleIds: Object.fromEntries(
      vehicles.map((item) => [item.label, item.id]),
    ),
    vehicleRecords: vehicles,
    vehicles: vehicles.map((item) => item.label),
    warehouseIds: Object.fromEntries(
      warehouses.map((item) => [item.label, item.id]),
    ),
    warehouseCodes: Object.fromEntries(
      warehouses.map((item) => [item.label, item.code]),
    ),
    warehouseRecords: warehouses,
    warehouses: warehouses.map((item) => item.label),
  };
}

export function inventoryRows(state, customer = "") {
  return (state.inventory || [])
    .filter((row) => row.currentPeriodOnly !== false)
    .filter((row) => !customer || row.customer === customer)
    .map((row) => ({
      ...row,
      currentPeriodOnly: true,
      dispatchedQuantity: Number(row.dispatchedQuantity || 0),
      invoiceQuantity: Number(row.invoiceQuantity || row.receivedQuantity || 0),
      remainingQuantity: Number(row.remainingQuantity || 0),
      unit: row.unit || "đơn vị",
    }));
}

export function stockRows(state) {
  return inventoryRows(state)
    .map((row) => ({
      customer: row.customer,
      date:
        state.invoice
          .filter(
            (item) => item.customer === row.customer && item.sku === row.sku,
          )
          .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || "",
      remainingQuantity: Number(row.remainingQuantity),
      sku: row.sku,
      unit: row.unit || "đơn vị",
    }))
    .filter((row) => row.remainingQuantity > 0);
}

export function allCustomers(state) {
  return Array.from(
    new Set([
      ...(state.customers || []),
      ...(state.invoice || []).map((item) => item.customer),
    ]),
  )
    .filter(Boolean)
    .sort();
}

export function customerSummaries(state) {
  const summaries = new Map();
  const latestDates = new Map();

  allCustomers(state).forEach((customer) => {
    summaries.set(customer, {
      customer,
      itemTypes: new Set(),
      latestDate: "",
      totalQuantity: 0,
    });
  });

  [...(state.invoice || []), ...(state.dispatches || [])].forEach((item) => {
    const date = normalizeApiDate(item.date);
    if (!item.customer || !date) return;
    if (date > (latestDates.get(item.customer) || "")) {
      latestDates.set(item.customer, date);
    }
  });

  stockRows(state).forEach((row) => {
    if (!summaries.has(row.customer)) {
      summaries.set(row.customer, {
        customer: row.customer,
        itemTypes: new Set(),
        latestDate: "",
        totalQuantity: 0,
      });
    }
    const summary = summaries.get(row.customer);
    summary.itemTypes.add(row.sku);
    summary.totalQuantity += row.remainingQuantity;
  });

  latestDates.forEach((date, customer) => {
    const summary = summaries.get(customer);
    if (summary) summary.latestDate = date;
  });

  return Array.from(summaries.values())
    .map((summary) => ({ ...summary, itemTypeCount: summary.itemTypes.size }))
    .sort(
      (a, b) =>
        b.totalQuantity - a.totalQuantity ||
        a.customer.localeCompare(b.customer),
    );
}

export function receiptSummaryRows(state, customer) {
  if (!customer) return [];
  return inventoryRows(state, customer)
    .map((row) => ({
      currentPeriodOnly: true,
      dispatchedQuantity: Number(row.dispatchedQuantity || 0),
      receivedQuantity: Number(row.invoiceQuantity || row.receivedQuantity || 0),
      remainingQuantity: Number(row.remainingQuantity || 0),
      sku: normalizeSku(row.sku),
      unit: row.unit || "đơn vị",
    }))
    .filter((row) => row.remainingQuantity > 0)
    .sort(
      (a, b) =>
        b.remainingQuantity - a.remainingQuantity ||
        a.sku.localeCompare(b.sku),
    );
}

export function dateComparator(direction = "desc") {
  return (a, b) => {
    const comparison = normalizeApiDate(a.date).localeCompare(
      normalizeApiDate(b.date),
    );
    return direction === "asc" ? comparison : -comparison;
  };
}

export function inventoryTrend(state, dayCount = 31) {
  const days = Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    quantity: 0,
  }));

  state.invoice.forEach((item) => {
    const day = Math.min(new Date(item.date || todayIso()).getDate(), dayCount);
    days.forEach((point) => {
      if (point.day >= day) point.quantity += Number(item.quantity);
    });
  });

  state.dispatches.forEach((item) => {
    const day = Math.min(new Date(item.date || todayIso()).getDate(), dayCount);
    days.forEach((point) => {
      if (point.day >= day) point.quantity -= Number(item.quantity);
    });
  });

  return days.map((point) => ({
    ...point,
    label: `Ngày ${point.day}`,
    quantity: Math.max(point.quantity, 0),
  }));
}

export function customerInventorySummary(state, customer) {
  const rows = stockRows(state).filter((row) => row.customer === customer);
  return {
    itemTypeCount: new Set(rows.map((row) => row.sku)).size,
    remainingQuantity: rows.reduce(
      (sum, row) => sum + row.remainingQuantity,
      0,
    ),
  };
}

export function reportRows(state) {
  const periodInstant = (value) => {
    const time = new Date(value || "").getTime();
    return Number.isNaN(time) ? value || "" : String(time);
  };
  const invoicePeriodKey = (item) =>
    `${item.customerId || item.customer}|${periodInstant(item.periodClosedAt) || normalizeApiDate(item.periodEnd || item.date)}`;
  const approved = new Set(state.invoiceApprovals.map(invoicePeriodKey));
  return state.billingReady
    .filter((item) => !approved.has(invoicePeriodKey(item)))
    .map((item) => {
      const periodStart = normalizeApiDate(item.periodStart);
      const periodEnd = normalizeApiDate(item.periodEnd);
      return {
        customer: item.customer,
        customerId: item.customerId,
        historyCount: Number(item.historyCount || 0),
        itemTypeCount: Number(item.itemCount || 0),
        periodClosedAt: item.periodClosedAt,
        periodEnd,
        periodOpenAt: item.periodOpenAt,
        periodStart,
        reportKey: invoicePeriodKey(item),
        remainingQuantity: 0,
        status: "complete",
      };
    });
}
