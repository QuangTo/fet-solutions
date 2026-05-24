"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  dateComparator,
  formatDate,
  formatDateTime,
  reportRows,
} from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../components/data-table";
import { DataTableCard } from "../components/data-table-card";
import { EmptyPanel } from "../components/empty-panel";
import { Pagination } from "../components/pagination";
import { useMediaQuery } from "../hooks/use-media-query";
import { paginate } from "../lib/pagination";
import { DispatchTable } from "./dispatch-table";

export function ReportsPage({ mutation, session, state }) {
  const [selected, setSelected] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const shouldPaginateCustomers = useMediaQuery("(max-width: 639px)");
  const rows = reportRows(state);
  const customerView = shouldPaginateCustomers
    ? paginate(rows, customerPage, 3)
    : { page: 1, pageCount: 1, rows };
  const current = customerView.rows.some((row) => row.reportKey === selected)
    ? selected
    : customerView.rows[0]?.reportKey || rows[0]?.reportKey || "";
  const currentRow = rows.find((row) => row.reportKey === current) || rows[0];
  const invoiceSearchTerm = invoiceSearch.trim().toLowerCase();
  const currentPeriodOpenTime = new Date(
    currentRow?.periodOpenAt || "",
  ).getTime();
  const currentPeriodClosedTime = new Date(
    currentRow?.periodClosedAt || "",
  ).getTime();

  useEffect(() => {
    setCustomerPage(1);
  }, [rows.length, shouldPaginateCustomers]);

  const history = state.dispatches
    .filter((item) => {
      if (item.customer !== currentRow?.customer) return false;
      const dispatchTime = new Date(item.createdAt || "").getTime();
      if (
        !Number.isNaN(currentPeriodOpenTime) &&
        dispatchTime <= currentPeriodOpenTime
      )
        return false;
      if (
        !Number.isNaN(currentPeriodClosedTime) &&
        dispatchTime > currentPeriodClosedTime
      )
        return false;
      if (!Number.isNaN(dispatchTime)) return true;
      return (
        (!currentRow?.periodStart || item.date >= currentRow.periodStart) &&
        (!currentRow?.periodEnd || item.date <= currentRow.periodEnd)
      );
    })
    .sort(dateComparator("desc"));
  const invoiceHistory = [...state.invoiceApprovals]
    .filter((item) => {
      if (!invoiceSearchTerm) return true;
      return [
        formatDate(item.date),
        item.customer,
        formatDate(item.periodStart || item.date),
        formatDate(item.periodEnd || item.date),
        formatDateTime(item.periodClosedAt),
        item.status,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toString().toLowerCase().includes(invoiceSearchTerm),
        );
    })
    .sort(dateComparator("desc"));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Khách hàng đủ điều kiện xuất hóa đơn</CardTitle>
          <CardDescription>
            Chỉ hiển thị khách hàng đã xuất hết hàng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.length ? (
              customerView.rows.map((row) => (
                <article
                  className={cn(
                    "relative grid min-h-32 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50",
                    current === row.reportKey &&
                      "border-emerald-400 bg-emerald-50",
                  )}
                  key={row.reportKey}
                >
                  <button
                    aria-label={`Chọn khách hàng ${row.customer} để xem lịch sử xuất hàng`}
                    className="absolute inset-0 z-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                    onClick={() => setSelected(row.reportKey)}
                    type="button"
                  />
                  <div className="pointer-events-none relative z-10 grid gap-2">
                    <strong className="text-slate-950">{row.customer}</strong>
                    <span className="text-sm text-slate-500">
                      {row.historyCount} lần xuất hàng
                    </span>
                  </div>
                  <span className="pointer-events-none relative z-10 text-sm text-slate-500">
                    {row.itemTypeCount} loại hàng đã hoàn tất
                  </span>
                  <span className="pointer-events-none relative z-10 text-xs font-semibold text-slate-500">
                    Kỳ hàng {formatDate(row.periodStart)} -{" "}
                    {formatDate(row.periodEnd)}
                  </span>
                  <span className="pointer-events-none relative z-10 text-xs font-semibold text-slate-500">
                    Hoàn thành {formatDateTime(row.periodClosedAt)}
                  </span>
                  <Button
                    className="relative z-20 w-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmCustomer(row);
                    }}
                    type="button"
                  >
                    Xuất hóa đơn
                  </Button>
                </article>
              ))
            ) : (
              <EmptyPanel text="Chưa có khách hàng hoàn thành để xuất hóa đơn." />
            )}
          </div>
          {shouldPaginateCustomers ? (
            <Pagination
              page={customerView.page}
              pageCount={customerView.pageCount}
              onPageChange={setCustomerPage}
            />
          ) : null}
        </CardContent>
      </Card>
      <DataTableCard
        title="Lịch sử xuất hàng"
        description="Dữ liệu phục vụ đối soát hóa đơn."
      >
        <DispatchTable rows={history} />
      </DataTableCard>
      <DataTableCard
        title="Lịch sử xuất hóa đơn"
        description="Các khách hàng đã được ghi nhận."
        descriptionPrefix={
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 pl-9"
              placeholder="Tìm lịch sử xuất hóa đơn"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
            />
          </div>
        }
      >
        <DataTable width="invoice">
          <thead>
            <tr>
              <Th>Ngày</Th>
              <Th>Khách hàng</Th>
              <Th>Kỳ hàng</Th>
              <Th>Trạng thái</Th>
            </tr>
          </thead>
          <tbody>
            {invoiceHistory.length ? (
              invoiceHistory.map((item) => (
                <tr key={item.id}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.customer}</Td>
                  <Td>
                    {formatDate(item.periodStart || item.date)} -{" "}
                    {formatDate(item.periodEnd || item.date)}
                    {item.periodClosedAt
                      ? ` · ${formatDateTime(item.periodClosedAt)}`
                      : ""}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Badge tone="green">{item.status || "Hoàn thành"}</Badge>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>Chưa có lịch sử xuất hóa đơn.</EmptyRow>
            )}
          </tbody>
        </DataTable>
      </DataTableCard>
      <Dialog
        open={Boolean(confirmCustomer)}
        onOpenChange={(open) => !open && setConfirmCustomer(null)}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Xuất hóa đơn cho {confirmCustomer?.customer}?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Sau khi đồng ý, khách hàng sẽ được ghi nhận vào lịch sử xuất hóa
            đơn.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Hủy
              </Button>
            </DialogClose>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate({
                  approvedByName: session?.name || "Kế toán mẫu",
                  customerId:
                    confirmCustomer.customerId ||
                    state.customerIds[confirmCustomer.customer],
                  periodEnd: confirmCustomer.periodEnd,
                  periodStart: confirmCustomer.periodStart,
                  periodClosedAt: confirmCustomer.periodClosedAt,
                  status: "Hoàn thành",
                });
                setConfirmCustomer(null);
              }}
              type="button"
            >
              Đồng ý
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
