"use client";

import { useEffect, useState } from "react";
import { customerSummaries, formatDate } from "@/lib/fet-domain";
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
import {
  completedShipmentChartData,
  issuedInvoiceChartData,
  overviewOperationalStats,
  overviewStats,
} from "../../lib/period-utils";
import { InventoryChart } from "./inventory-chart";
import { Metric } from "./metric";
import { OperationalMetric } from "./operational-metric";
import { DashboardCountChart } from "./dashboard-count-chart";

export function DashboardPage({ onSelectCustomer, period, state }) {
  const [customerPage, setCustomerPage] = useState(1);
  const shouldPaginateCustomers = useMediaQuery("(max-width: 639px)");
  const summaries = customerSummaries(state);
  const stats = overviewStats(state, period);
  const operationalStats = overviewOperationalStats(state, period);
  const customerView = paginate(
    summaries,
    customerPage,
    shouldPaginateCustomers ? 3 : 6,
  );
  const shipmentData = completedShipmentChartData(state, period);
  const invoiceData = issuedInvoiceChartData(state, period);
  const shipmentTotal = shipmentData.reduce((sum, item) => sum + item.count, 0);
  const invoiceTotal = invoiceData.reduce((sum, item) => sum + item.count, 0);

  useEffect(() => {
    setCustomerPage(1);
  }, [summaries.length, shouldPaginateCustomers]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          label={`Tổng hàng đã nhập trong ${stats.label}`}
          value={number(stats.received)}
        />
        <Metric
          label={`Đã xuất lên xe trong ${stats.label}`}
          tone="amber"
          value={number(stats.dispatched)}
        />
        <Metric
          label={`Còn trong kho trong ${stats.label}`}
          tone="green"
          value={number(stats.remaining)}
        />
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Tổng quan khách hàng</CardTitle>
          {/* <CardDescription>
            Lượng hàng còn lại, số loại hàng và lần cập nhật gần nhất.
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.length ? (
              customerView.rows.map((summary) => (
                <button
                  className="grid min-h-32 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
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
          data={shipmentData}
          period={period}
          total={shipmentTotal}
          title="Chuyến hàng hoàn thành"
          unitLabel="Chuyến"
        />
        <DashboardCountChart
          color="#2563eb"
          data={invoiceData}
          period={period}
          total={invoiceTotal}
          title="Hóa đơn đã xuất"
          unitLabel="Hóa đơn"
        />
        <InventoryChart period={period} state={state} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <OperationalMetric
          activeLabel="đang chạy"
          idleLabel="xe rảnh"
          label={`Xe trong ${stats.label}`}
          stats={operationalStats.vehicles}
          tone="amber"
        />
        <OperationalMetric
          activeLabel="đang chạy"
          idleLabel="tài xế rảnh"
          label={`Tài xế trong ${stats.label}`}
          stats={operationalStats.drivers}
          tone="blue"
        />
        <OperationalMetric
          activeLabel="chờ xuất"
          idleLabel="ngoài kỳ"
          label={`Hóa đơn tồn trong ${stats.label}`}
          stats={operationalStats.invoices}
          tone="green"
        />
      </div>
    </>
  );
}
