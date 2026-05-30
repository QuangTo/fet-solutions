"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  accountingClosuresQueryOptions,
  dispatchesListQueryOptions,
} from "@/lib/api";
import {
  flattenDispatches,
  formatDate,
  formatDateTime,
  reportRows,
} from "@/lib/fet-domain";
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
import { ExcelDownloadButton } from "../components/excel-download-button";
import { DataTable } from "../components/data-table";
import { DataTableCard } from "../components/data-table-card";
import { EmptyPanel } from "../components/empty-panel";
import { Pagination } from "../components/pagination";
import { useMediaQuery } from "../hooks/use-media-query";
import { operationActionButtonClass } from "../lib/constants";
import { downloadExcel } from "../lib/excel-export";
import { paginate } from "../lib/pagination";
import { DispatchTable } from "./dispatch-table";

function canApproveInvoiceClosure(role) {
  return role === "admin" || role === "accountant";
}

export function ReportsPage({ activeRole, mutation, session, state }) {
  const canApprove = canApproveInvoiceClosure(activeRole);
  const [selected, setSelected] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const shouldPaginateCustomers = useMediaQuery("(max-width: 639px)", false);
  const rows = reportRows(state);
  const customerView = shouldPaginateCustomers
    ? paginate(rows, customerPage, 3)
    : { page: 1, pageCount: 1, rows };
  const current = customerView.rows.some((row) => row.reportKey === selected)
    ? selected
    : customerView.rows[0]?.reportKey || rows[0]?.reportKey || "";
  const currentRow = rows.find((row) => row.reportKey === current) || rows[0];
  const invoiceSearchTerm = invoiceSearch.trim().toLowerCase();
  const dispatchFilters = useMemo(
    () =>
      currentRow?.customerId
        ? {
            customerId: currentRow.customerId,
            periodOpenAt: currentRow.periodOpenAt || undefined,
          }
        : {},
    [currentRow],
  );
  const dispatchHistoryQuery = useQuery({
    ...dispatchesListQueryOptions(session, dispatchFilters, historyPage),
    enabled: Boolean(session?.id && currentRow?.customerId),
  });
  const dispatchHistoryRows = flattenDispatches(
    dispatchHistoryQuery.data?.items || [],
  );
  const closuresQuery = useQuery({
    ...accountingClosuresQueryOptions(session, invoicePage),
    enabled: Boolean(session?.id),
  });
  const invoiceItems = (closuresQuery.data?.items || []).filter((item) => {
    if (!invoiceSearchTerm) return true;
    return [
      formatDate(item.date),
      item.customer,
      formatDateTime(item.createdAt),
      item.approvedByName,
      item.status,
    ]
      .filter(Boolean)
      .some((value) =>
        value.toString().toLowerCase().includes(invoiceSearchTerm),
      );
  });

  useEffect(() => {
    setCustomerPage(1);
  }, [rows.length, shouldPaginateCustomers]);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [current]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Khách hàng đủ điều kiện xuất hóa đơn</CardTitle>
         
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.length ? (
              customerView.rows.map((row) => (
                <article
                  className="relative grid min-h-32 gap-2 rounded-lg border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                  key={row.reportKey}
                >
                  <button
                    aria-label={`Chọn khách hàng ${row.customer} để xem lịch sử xuất hàng`}
                    className="absolute inset-0 z-0 rounded-lg bg-transparent transition-colors active:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
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
                  {canApprove ? (
                    <Button
                      className="relative z-20 w-full"
                      disabled={mutation.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmCustomer(row);
                      }}
                      type="button"
                    >
                      {mutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      Xuất hóa đơn
                    </Button>
                  ) : null}
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
        <DispatchTable rows={dispatchHistoryRows} />
        <Pagination
          page={dispatchHistoryQuery.data?.page || historyPage}
          pageCount={dispatchHistoryQuery.data?.pageCount || 1}
          onPageChange={setHistoryPage}
        />
      </DataTableCard>
      <DataTableCard
        title="Lịch sử xuất hóa đơn"
        actions={
          <div className={operationActionButtonClass}>
            <ExcelDownloadButton
              disabled={!invoiceItems.length}
              onDownload={() =>
                downloadExcel({
                  columns: [
                    { label: "Ngày", value: (row) => formatDate(row.date) },
                    { label: "Khách hàng", value: "customer" },
                    {
                      label: "Thời gian xuất hóa đơn",
                      value: (row) =>
                        formatDateTime(row.createdAt) ||
                        formatDate(row.date) ||
                        "",
                    },
                    { label: "Trạng thái", value: (row) => row.status || "Hoàn thành" },
                  ],
                  filename: `bao-cao-lich-su-xuat-hoa-don-trang-${closuresQuery.data?.page || invoicePage}.xlsx`,
                  rows: invoiceItems,
                })
              }
            />
          </div>
        }
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
              <Th>Thời gian xuất hóa đơn</Th>
              <Th>Trạng thái</Th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.length ? (
              invoiceItems.map((item) => (
                <tr key={item.id}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.customer}</Td>
                  <Td>
                    {formatDateTime(item.createdAt) ||
                      formatDate(item.date) ||
                      "—"}
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
        <Pagination
          page={closuresQuery.data?.page || invoicePage}
          pageCount={closuresQuery.data?.pageCount || 1}
          onPageChange={setInvoicePage}
        />
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
              {mutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              Đồng ý
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
