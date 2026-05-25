import {
  dateInWindow,
  overviewBuckets,
  periodWindow,
} from "@/components/fet/app-shell/lib/period-utils";
import { normalizeApiDate } from "@/lib/fet-domain";

function localIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sumInWindow(rows, period, valueKey = "quantity") {
  const window = periodWindow(period);
  return rows.reduce((sum, row) => {
    if (!dateInWindow(row.date, window)) return sum;
    return sum + Number(row[valueKey] || 0);
  }, 0);
}

function trendFromDaily(receiptDaily, dispatchDaily, period) {
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

  let receivedTotal = 0;
  let dispatchedTotal = 0;
  const receiptByDate = Object.fromEntries(
    receiptDaily.map((row) => [row.date, Number(row.quantity || 0)]),
  );
  const dispatchByDate = Object.fromEntries(
    dispatchDaily.map((row) => [row.date, Number(row.quantity || 0)]),
  );

  return points.map((point) => {
    const iso = localIsoDate(point.date);
    receivedTotal += receiptByDate[iso] || 0;
    dispatchedTotal += dispatchByDate[iso] || 0;
    return {
      ...point,
      quantity: Math.max(receivedTotal - dispatchedTotal, 0),
    };
  });
}

function countsToChartData(countRows, period) {
  const buckets = overviewBuckets(period);
  const countByDate = Object.fromEntries(
    countRows.map((row) => [row.date, Number(row.count || 0)]),
  );
  return buckets.map((bucket) => {
    let count = 0;
    const cursor = new Date(bucket.start);
    while (cursor <= bucket.end) {
      const iso = localIsoDate(cursor);
      count += countByDate[iso] || 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return { ...bucket, count };
  });
}

function buildCustomerSummariesFromSummary(summary) {
  const activityMap = Object.fromEntries(
    (summary.customerActivity || []).map((row) => [row.customer, row.latestDate]),
  );
  const byCustomer = new Map();

  (summary.inventory || []).forEach((row) => {
    const remaining = Number(row.remainingQuantity || 0);
    if (remaining <= 0) return;
    const customer = row.customer;
    if (!byCustomer.has(customer)) {
      byCustomer.set(customer, {
        customer,
        itemTypeCount: 0,
        itemTypes: new Set(),
        latestDate: activityMap[customer] || "",
        totalQuantity: 0,
      });
    }
    const entry = byCustomer.get(customer);
    entry.itemTypes.add(row.sku);
    entry.totalQuantity += remaining;
    if ((activityMap[customer] || "") > entry.latestDate) {
      entry.latestDate = activityMap[customer];
    }
  });

  return Array.from(byCustomer.values())
    .map((row) => ({ ...row, itemTypeCount: row.itemTypes.size }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

function operationalStatsFromSummary(summary, period) {
  const window = periodWindow(period);
  const totalVehicles = Number(summary.catalogCounts?.vehicles || 0);
  const totalDrivers = Number(summary.catalogCounts?.drivers || 0);
  const pendingInvoices = summary.billingReady || [];
  const pendingInPeriod = pendingInvoices.filter((item) =>
    dateInWindow(
      normalizeApiDate(item.periodClosedAt || item.periodEnd),
      window,
    ),
  );

  return {
    drivers: { total: totalDrivers },
    invoices: {
      active: pendingInPeriod.length,
      idle: Math.max(pendingInvoices.length - pendingInPeriod.length, 0),
      total: pendingInvoices.length,
    },
    vehicles: { total: totalVehicles },
  };
}

export function dashboardMetricsFromSummary(summary, period) {
  const received = sumInWindow(summary.receiptDaily || [], period);
  const dispatched = sumInWindow(summary.dispatchDaily || [], period);
  const window = periodWindow(period);

  return {
    customerSummaries: buildCustomerSummariesFromSummary(summary),
    invoiceChart: countsToChartData(summary.closureCounts || [], period),
    operationalStats: operationalStatsFromSummary(summary, period),
    shipmentChart: countsToChartData(summary.dispatchCounts || [], period),
    stats: {
      dispatched,
      label: window.label,
      received,
      remaining: Math.max(received - dispatched, 0),
      window,
    },
    trend: trendFromDaily(
      summary.receiptDaily || [],
      summary.dispatchDaily || [],
      period,
    ),
  };
}

