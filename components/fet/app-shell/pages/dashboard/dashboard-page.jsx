"use client";

import { useEffect, useMemo, useState } from "react";
import { dashboardMetricsFromSummary } from "@/lib/dashboard-metrics";
import { formatDate } from "@/lib/fet-domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyPanel } from "../../components/empty-panel";
import { Pagination } from "../../components/pagination";
import { useMediaQuery } from "../../hooks/use-media-query";
import { number } from "../../lib/format";
import { paginate } from "../../lib/pagination";
import { InventoryChart } from "./inventory-chart";
import { Metric } from "./metric";
import { OperationalMetric } from "./operational-metric";
import { DashboardCountChart } from "./dashboard-count-chart";

export function DashboardPage({ dashboard, onSelectCustomer, period }) {
  const [customerPage, setCustomerPage] = useState(1);
  const isCompactCustomers = useMediaQuery("(max-width: 639px)", false);
  const customerPageSize = isCompactCustomers ? 3 : 6;
  const metrics = useMemo(
    () => dashboardMetricsFromSummary(dashboard, period),
    [dashboard, period],
  );
  const customerView = paginate(
    metrics.customerSummaries,
    customerPage,
    customerPageSize,
  );
  const shipmentTotal = metrics.shipmentChart.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const invoiceTotal = metrics.invoiceChart.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  useEffect(() => {
    setCustomerPage(1);
  }, [metrics.customerSummaries.length, customerPageSize]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          label={`Tổng hàng đã nhập trong ${metrics.stats.label}`}
          value={number(metrics.stats.received)}
        />
        <Metric
          label={`Đã xuất lên xe trong ${metrics.stats.label}`}
          tone="amber"
          value={number(metrics.stats.dispatched)}
        />
        <Metric
          label={`Còn trong kho trong ${metrics.stats.label}`}
          tone="green"
          value={number(metrics.stats.remaining)}
        />
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Tổng quan khách hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.customerSummaries.length ? (
              customerView.rows.map((summary) => (
                <button
                  className="grid min-h-32 gap-2 rounded-lg border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 active:border-emerald-400 active:bg-emerald-50"
                  key={summary.customer}
                  onClick={() => onSelectCustomer(summary.customer)}
                  type="button"
                >
                  <span className="font-black text-slate-900">
                    {summary.customer}
                  </span>
                  <strong className="text-2xl font-black text-emerald-700">
                    {number(summary.totalQuantity)}
                  </strong>
                  <small className="text-sm leading-5 text-slate-500">
                    {summary.latestDate
                      ? `${summary.itemTypeCount} loại hàng - cập nhật ${formatDate(summary.latestDate)}`
                      : "Chưa có hàng trong kho"}
                  </small>
                </button>
              ))
            ) : (
              <EmptyPanel text="Chưa có khách hàng đang có hàng trong kho." />
            )}
          </div>
          <Pagination
            page={customerView.page}
            pageCount={customerView.pageCount}
            onPageChange={setCustomerPage}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCountChart
          color="#d97706"
          data={metrics.shipmentChart}
          period={period}
          total={shipmentTotal}
          title="Chuyến hàng hoàn thành"
          unitLabel="Chuyến"
        />
        <DashboardCountChart
          color="#2563eb"
          data={metrics.invoiceChart}
          period={period}
          total={invoiceTotal}
          title="Hóa đơn đã xuất"
          unitLabel="Hóa đơn"
        />
        <InventoryChart period={period} trend={metrics.trend} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <OperationalMetric
          label="Tổng số xe"
          stats={{
            active: metrics.operationalStats.vehicles.total,
            total: metrics.operationalStats.vehicles.total,
          }}
          tone="amber"
        />
        <OperationalMetric
          label="Tổng số tài xế"
          stats={{
            active: metrics.operationalStats.drivers.total,
            total: metrics.operationalStats.drivers.total,
          }}
          tone="blue"
        />
        <OperationalMetric
          label={`Hóa đơn tồn trong ${metrics.stats.label}`}
          stats={metrics.operationalStats.invoices}
          tone="green"
        />
      </div>
    </div>
  );
}
