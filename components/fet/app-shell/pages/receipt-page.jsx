"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { receiptsListQueryOptions } from "@/lib/api";
import {
  allCustomers,
  flattenReceipts,
  formatDate,
  normalizeSku,
  receiptSummaryRows,
  todayIso,
} from "@/lib/fet-domain";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../components/data-table";
import { DataTableCard } from "../components/data-table-card";
import { ExcelDownloadButton } from "../components/excel-download-button";
import { EmptyPanel } from "../components/empty-panel";
import { Pagination } from "../components/pagination";
import { PeriodSelect } from "../components/period-select";
import {
  operationActionButtonClass,
  operationActionButtonShellClass,
} from "../lib/constants";
import { downloadExcel } from "../lib/excel-export";
import { number } from "../lib/format";
import { paginate } from "../lib/pagination";
import { periodDescription, periodToDateRange } from "../lib/period-utils";

export function ReceiptPage({
  mutation,
  selectedCustomer,
  session,
  setSelectedCustomer,
  state,
}) {
  const [form, setForm] = useState({
    customer: selectedCustomer,
    date: todayIso(),
    quantity: 100,
    sku: "",
    unit: "tấn",
    warehouseCode: "",
  });
  const [summaryPage, setSummaryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPeriod, setHistoryPeriod] = useState("week");
  const customers = allCustomers(state);
  const customer = form.customer || selectedCustomer;
  const customerId = state.customerIds[customer] || "";
  const historyFilters = useMemo(
    () => ({
      customerId,
      ...periodToDateRange(historyPeriod),
    }),
    [customerId, historyPeriod],
  );
  const historyQuery = useQuery({
    ...receiptsListQueryOptions(session, historyFilters, historyPage),
    enabled: Boolean(session?.id && customerId),
  });
  const historyRows = flattenReceipts(historyQuery.data?.items || []);
  const summary = paginate(
    receiptSummaryRows(state, customer),
    summaryPage,
    10,
  );
  const hasWarehouses = state.warehouseRecords.length > 0;
  const selectedWarehouseCode =
    form.warehouseCode || state.warehouseRecords[0]?.code || "";

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  useEffect(() => {
    setHistoryPage(1);
  }, [customer, historyPeriod]);

  useEffect(() => {
    setSummaryPage(1);
  }, [customer]);

  useEffect(() => {
    if (form.warehouseCode || !state.warehouseRecords[0]?.code) return;
    setForm((current) => ({
      ...current,
      warehouseCode: state.warehouseRecords[0].code,
    }));
  }, [form.warehouseCode, state.warehouseRecords]);

  return (
    <div className="grid gap-4">
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Ghi nhận hàng nhập</CardTitle>
            <CardDescription>
              Chọn khách hàng và thêm từng loại hàng vào kho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasWarehouses ? (
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const customerName = form.customer.trim();
                  mutation.mutate({
                    customerName,
                    date: form.date,
                    items: [
                      {
                        quantity: Number(form.quantity),
                        sku: normalizeSku(form.sku),
                        unit: form.unit.trim(),
                      },
                    ],
                    receivedByName: session?.name || "Thủ kho mẫu",
                    warehouseCode: selectedWarehouseCode,
                  });
                  setSelectedCustomer(customerName);
                  setForm((current) => ({
                    ...current,
                    quantity: 100,
                    sku: "",
                    unit: "tấn",
                  }));
                }}
              >
                <Field>
                  Ngày nhập kho
                  <Input
                    className="min-w-0"
                    required
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  Khách hàng
                  <Select
                    required
                    value={form.customer}
                    onChange={(event) => {
                      setForm({ ...form, customer: event.target.value });
                      setSelectedCustomer(event.target.value);
                    }}
                  >
                    <option value="">Chọn khách hàng</option>
                    {customers.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  Kho
                  <Select
                    value={selectedWarehouseCode}
                    onChange={(event) =>
                      setForm({ ...form, warehouseCode: event.target.value })
                    }
                  >
                    {state.warehouseRecords.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.code}>
                        {warehouse.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  Loại hàng
                  <Input
                    placeholder="VD: Gạo ST25"
                    required
                    value={form.sku}
                    onChange={(event) =>
                      setForm({ ...form, sku: event.target.value })
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    Số lượng
                    <Input
                      className="min-w-0"
                      min="0"
                      required
                      step="any"
                      type="number"
                      value={form.quantity}
                      onChange={(event) =>
                        setForm({ ...form, quantity: event.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    Đơn vị
                    <Input
                      className="min-w-0"
                      required
                      value={form.unit}
                      onChange={(event) =>
                        setForm({ ...form, unit: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className={operationActionButtonShellClass}>
                  <Button
                    className={operationActionButtonClass}
                    disabled={mutation.isPending}
                    type="submit"
                  >
                    {mutation.isPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : null}
                    Nhập hàng
                  </Button>
                </div>
              </form>
            ) : (
              <EmptyPanel text="Chưa có kho hoạt động. Admin cần tạo kho trong Quản lý trước khi nhập hàng." />
            )}
          </CardContent>
        </Card>
        <DataTableCard
          title="Tổng hợp hàng nhập"
          description="Tồn kho theo loại hàng của khách đang chọn."
        >
          <DataTable width="receiptSummary">
            <thead>
              <tr>
                <Th>Loại hàng</Th>
                <Th>Số lượng</Th>
                <Th>Đơn vị</Th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.length ? (
                summary.rows.map((row) => (
                  <tr key={`${row.customer}-${row.sku}`}>
                    <Td data-label="Loại hàng">
                      <strong>{row.sku}</strong>
                    </Td>
                    <Td
                      data-label="Số lượng"
                      title={`Đã nhập ${number(row.receivedQuantity)} · Đã xuất ${number(row.dispatchedQuantity)}`}
                    >
                      {number(row.remainingQuantity)}
                    </Td>
                    <Td data-label="Đơn vị">{row.unit}</Td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={3}>
                  {customer
                    ? "Khách hàng này chưa có hàng tồn kho."
                    : "Chọn khách hàng để xem tồn kho."}
                </EmptyRow>
              )}
            </tbody>
          </DataTable>
          <Pagination
            page={summary.page}
            pageCount={summary.pageCount}
            onPageChange={setSummaryPage}
          />
        </DataTableCard>
      </div>
      <DataTableCard
        title="Lịch sử nhập hàng"
        description={periodDescription(
          "Ghi nhận đầy đủ mọi lần nhập — không xóa sau xuất hóa đơn",
          historyPeriod,
        )}
        actions={
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <PeriodSelect
              className={operationActionButtonClass}
              value={historyPeriod}
              onChange={setHistoryPeriod}
            />
            <ExcelDownloadButton
              className={operationActionButtonClass}
              disabled={!historyRows.length}
              onDownload={() =>
                downloadExcel({
                  columns: [
                    { label: "Ngày nhập", value: (row) => formatDate(row.date) },
                    { label: "Kho", value: (row) => row.warehouse || "" },
                    { label: "Loại hàng", value: "sku" },
                    { label: "Số lượng", value: (row) => number(row.quantity) },
                    { label: "Đơn vị", value: "unit" },
                  ],
                  filename: `lich-su-nhap-hang-${historyPeriod}-trang-${historyQuery.data?.page || historyPage}.xlsx`,
                  rows: historyRows,
                })
              }
            />
          </div>
        }
      >
        <DataTable width="receiptHistory">
          <thead>
            <tr>
              <Th>Ngày nhập</Th>
              <Th>Kho</Th>
              <Th>Loại hàng</Th>
              <Th>Số lượng</Th>
              <Th>Đơn vị</Th>
            </tr>
          </thead>
          <tbody>
            {historyRows.length ? (
              historyRows.map((row) => (
                <tr key={row.id}>
                  <Td data-label="Ngày nhập">{formatDate(row.date)}</Td>
                  <Td data-label="Kho">{row.warehouse || "—"}</Td>
                  <Td data-label="Loại hàng">
                    <strong>{row.sku}</strong>
                  </Td>
                  <Td data-label="Số lượng">{number(row.quantity)}</Td>
                  <Td data-label="Đơn vị">{row.unit}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={5}>
                {customer
                  ? historyQuery.isPending
                    ? "Đang tải lịch sử..."
                    : "Khách hàng này chưa có lịch sử nhập hàng."
                  : "Chọn khách hàng để xem lịch sử nhập hàng."}
              </EmptyRow>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={historyQuery.data?.page || historyPage}
          pageCount={historyQuery.data?.pageCount || 1}
          onPageChange={setHistoryPage}
        />
      </DataTableCard>
    </div>
  );
}
