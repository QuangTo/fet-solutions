"use client";

import { useEffect, useState } from "react";
import {
  allCustomers,
  dateComparator,
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
import { Pagination } from "../components/pagination";
import { PeriodSelect } from "../components/period-select";
import { operationActionButtonShellClass } from "../lib/constants";
import { number } from "../lib/format";
import { paginate } from "../lib/pagination";
import { dateInWindow, periodDescription, periodWindow } from "../lib/period-utils";

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
  });
  const [summaryPage, setSummaryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPeriod, setHistoryPeriod] = useState("week");
  const customers = allCustomers(state);
  const customer = form.customer || selectedCustomer;
  const historyWindow = periodWindow(historyPeriod);
  const summary = paginate(receiptSummaryRows(state, customer), summaryPage);
  const history = paginate(
    state.invoice
      .filter((item) => !customer || item.customer === customer)
      .filter(
        (item) => !historyWindow || dateInWindow(item.date, historyWindow),
      )
      .sort(dateComparator("desc")),
    historyPage,
  );

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  useEffect(() => {
    setHistoryPage(1);
  }, [customer, historyPeriod]);

  useEffect(() => {
    setSummaryPage(1);
  }, [customer]);

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
                Loại hàng
                <Input
                  placeholder="A"
                  required
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  Số lượng nhập
                  <Input
                    min="1"
                    required
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
                  className="w-full"
                  disabled={mutation.isPending}
                  type="submit"
                >
                  Nhập hàng
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <DataTableCard
          className="h-full"
          description={
            customer
              ? "Tồn kho kỳ hiện tại — reset sau khi xuất hóa đơn."
              : "Chọn khách hàng để xem tồn kho kỳ hiện tại."
          }
          title={
            customer ? `Tổng hợp hàng nhập - ${customer}` : "Tổng hợp hàng nhập"
          }
        >
          <DataTable className="text-ui-sm" width="receiptSummary">
            <thead>
              <tr>
                <Th className="px-2">Loại hàng</Th>
                <Th className="px-2 text-right">Tồn kho</Th>
                <Th className="px-2">Đơn vị</Th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.length ? (
                summary.rows.map((row) => (
                  <tr key={`${row.sku}-${row.unit}`}>
                    <Td className="px-2" data-label="Loại hàng">
                      <strong>{row.sku}</strong>
                    </Td>
                    <Td
                      className="px-2 text-right tabular-nums"
                      data-label="Tồn kho"
                      title={`Đã nhập ${number(row.receivedQuantity)} · Đã xuất ${number(row.dispatchedQuantity)}`}
                    >
                      <strong
                        className={
                          row.remainingQuantity > 0
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {number(row.remainingQuantity)}
                      </strong>
                    </Td>
                    <Td className="px-2" data-label="Đơn vị">
                      {row.unit}
                    </Td>
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
          <PeriodSelect value={historyPeriod} onChange={setHistoryPeriod} />
        }
      >
        <DataTable width="receiptHistory">
          <thead>
            <tr>
              <Th>Ngày nhập</Th>
              <Th>Loại hàng</Th>
              <Th>Số lượng</Th>
              <Th>Đơn vị</Th>
            </tr>
          </thead>
          <tbody>
            {history.rows.length ? (
              history.rows.map((row) => (
                <tr key={row.id}>
                  <Td data-label="Ngày nhập">{formatDate(row.date)}</Td>
                  <Td data-label="Loại hàng">
                    <strong>{row.sku}</strong>
                  </Td>
                  <Td data-label="Số lượng">{number(row.quantity)}</Td>
                  <Td data-label="Đơn vị">{row.unit}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>
                Khách hàng này chưa có lịch sử nhập hàng.
              </EmptyRow>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={history.page}
          pageCount={history.pageCount}
          onPageChange={setHistoryPage}
        />
      </DataTableCard>
    </div>
  );
}
