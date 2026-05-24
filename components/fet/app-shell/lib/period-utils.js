import { reportRows } from "@/lib/fet-domain";

const overviewPeriodOptions = {
  month: { days: 31, label: "tháng" },
  quarter: { days: 90, label: "quý" },
  week: { days: 7, label: "tuần" },
};

export function periodLabel(period) {
  return (
    overviewPeriodOptions[period]?.label || overviewPeriodOptions.week.label
  );
}

export function periodDescription(prefix, period) {
  return `${prefix} trong ${periodLabel(period)}.`;
}

export function periodWindow(period) {
  const config = overviewPeriodOptions[period] || overviewPeriodOptions.week;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - config.days + 1);
  start.setHours(0, 0, 0, 0);
  return { ...config, end, start };
}

export function dateInWindow(value, window) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(12, 0, 0, 0);
  return date >= window.start && date <= window.end;
}

export function dateAtNoon(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(12, 0, 0, 0);
  return date;
}

export function overviewStats(state, period) {
  const window = periodWindow(period);
  const received = state.invoice
    .filter((item) => dateInWindow(item.date, window))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const dispatched = state.dispatches
    .filter((item) => dateInWindow(item.date, window))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    dispatched,
    label: window.label,
    received,
    remaining: Math.max(received - dispatched, 0),
    window,
  };
}

export function overviewTrend(state, period) {
  const window = periodWindow(period);
  const points = Array.from({ length: window.days }, (_, index) => {
    const date = new Date(window.start);
    date.setDate(window.start.getDate() + index);
    return {
      date,
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      quantity: 0,
    };
  });

  return points.map((point) => {
    const pointEnd = new Date(point.date);
    pointEnd.setHours(23, 59, 59, 999);
    const received = state.invoice
      .filter((item) => {
        const date = dateAtNoon(item.date);
        return date && date >= window.start && date <= pointEnd;
      })
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const dispatched = state.dispatches
      .filter((item) => {
        const date = dateAtNoon(item.date);
        return date && date >= window.start && date <= pointEnd;
      })
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    return {
      ...point,
      quantity: Math.max(received - dispatched, 0),
    };
  });
}

export function chartDateLabel(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function chartDayLabel(date) {
  return String(date.getDate()).padStart(2, "0");
}

export function overviewBuckets(period) {
  const window = periodWindow(period);
  const bucketDays = period === "quarter" ? 7 : 1;
  const buckets = [];
  const cursor = new Date(window.start);

  while (cursor <= window.end) {
    const start = new Date(cursor);
    const end = new Date(start);
    end.setDate(start.getDate() + bucketDays - 1);
    end.setHours(23, 59, 59, 999);
    if (end > window.end) end.setTime(window.end.getTime());

    buckets.push({
      count: 0,
      end,
      label: period === "week" ? chartDayLabel(start) : chartDateLabel(start),
      rangeLabel:
        bucketDays === 1
          ? chartDateLabel(start)
          : `${chartDateLabel(start)} - ${chartDateLabel(end)}`,
      start,
    });
    cursor.setDate(cursor.getDate() + bucketDays);
  }

  return buckets;
}

export function addDateToBucket(buckets, value) {
  const date = dateAtNoon(value);
  if (!date) return;
  const bucket = buckets.find((item) => date >= item.start && date <= item.end);
  if (bucket) bucket.count += 1;
}

export function completedShipmentChartData(state, period) {
  const buckets = overviewBuckets(period);
  const seenDispatches = new Set();

  state.dispatches.forEach((item) => {
    const key = item.dispatchId || item.id;
    if (!key || seenDispatches.has(key)) return;
    seenDispatches.add(key);
    addDateToBucket(buckets, item.date || item.createdAt);
  });

  return buckets;
}

export function issuedInvoiceChartData(state, period) {
  const buckets = overviewBuckets(period);

  state.invoiceApprovals.forEach((item) => {
    addDateToBucket(
      buckets,
      item.date || item.createdAt || item.periodClosedAt,
    );
  });

  return buckets;
}

export function resourceKey(item, idField, labelField) {
  return item[idField] || item[labelField] || "";
}

export function overviewOperationalStats(state, period) {
  const window = periodWindow(period);
  const periodDispatches = state.dispatches.filter((item) =>
    dateInWindow(item.date || item.createdAt, window),
  );
  const activeVehicles = new Set(
    periodDispatches
      .map((item) => resourceKey(item, "vehicleId", "truck"))
      .filter(Boolean),
  );
  const activeDrivers = new Set(
    periodDispatches
      .map((item) => resourceKey(item, "driverId", "driver"))
      .filter(Boolean),
  );
  const pendingInvoices = reportRows(state);
  const pendingInvoicesInPeriod = pendingInvoices.filter((item) =>
    dateInWindow(item.periodClosedAt || item.periodEnd, window),
  );
  const totalVehicles = Math.max(
    state.vehicleRecords.length,
    activeVehicles.size,
  );
  const totalDrivers = Math.max(state.driverRecords.length, activeDrivers.size);

  return {
    drivers: {
      active: activeDrivers.size,
      idle: Math.max(totalDrivers - activeDrivers.size, 0),
      total: totalDrivers,
    },
    invoices: {
      active: pendingInvoicesInPeriod.length,
      idle: Math.max(
        pendingInvoices.length - pendingInvoicesInPeriod.length,
        0,
      ),
      total: pendingInvoices.length,
    },
    vehicles: {
      active: activeVehicles.size,
      idle: Math.max(totalVehicles - activeVehicles.size, 0),
      total: totalVehicles,
    },
  };
}
