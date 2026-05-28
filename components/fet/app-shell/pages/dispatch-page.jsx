"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { dispatchesListQueryOptions } from "@/lib/api";
import {
  allCustomers,
  flattenDispatches,
  formatDate,
  normalizeSku,
  stockRows,
  todayIso,
} from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { CsvDownloadButton } from "../components/csv-download-button";
import { DataTableCard } from "../components/data-table-card";
import { EmptyPanel } from "../components/empty-panel";
import { Pagination } from "../components/pagination";
import { PeriodSelect } from "../components/period-select";
import {
  operationActionButtonClass,
  operationActionButtonShellClass,
} from "../lib/constants";
import {
  readDispatchPrefs,
  resolveDispatchPrefs,
  writeDispatchPrefs,
} from "../lib/dispatch-prefs";
import { downloadCsv } from "../lib/csv-export";
import { number } from "../lib/format";
import { periodDescription, periodToDateRange } from "../lib/period-utils";
import { DispatchTable } from "./dispatch-table";

export function DispatchPage({
  mutation,
  selectedCustomer,
  session,
  setSelectedCustomer,
  state,
}) {
  const availableRows = stockRows(state);
  const [form, setForm] = useState(() => {
    const prefs =
      typeof window !== "undefined"
        ? readDispatchPrefs()
        : { driver: "", truck: "" };
    return {
      customer: selectedCustomer,
      date: todayIso(),
      driver: prefs.driver,
      quantity: "",
      sku: "",
      truck: prefs.truck,
      unit: "",
      warehouseCode: "",
    };
  });
  const [filters, setFilters] = useState({
    date: "",
    driver: "",
    period: "week",
    truck: "",
  });
  const [page, setPage] = useState(1);

  const customerStock = availableRows.filter(
    (row) => row.customer === form.customer,
  );
  const selectedStock =
    customerStock.find((row) => row.sku === form.sku) || customerStock[0];
  const hasWarehouses = state.warehouseRecords.length > 0;
  const selectedWarehouseCode =
    form.warehouseCode || state.warehouseRecords[0]?.code || "";

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  const dispatchPrefsHydrated = useRef(false);
  useEffect(() => {
    if (dispatchPrefsHydrated.current) return;
    if (!state.vehicles.length && !state.drivers.length) return;
    dispatchPrefsHydrated.current = true;
    const prefs = resolveDispatchPrefs(readDispatchPrefs(), state);
    setForm((current) => ({
      ...current,
      driver:
        current.driver && state.drivers.includes(current.driver)
          ? current.driver
          : prefs.driver,
      truck:
        current.truck && state.vehicles.includes(current.truck)
          ? current.truck
          : prefs.truck,
    }));
  }, [state.drivers, state.vehicles]);

  useEffect(() => {
    if (!selectedStock) return;
    setForm((current) => ({
      ...current,
      quantity:
        current.sku === selectedStock.sku
          ? current.quantity
          : selectedStock.remainingQuantity,
      sku: current.sku || selectedStock.sku,
      unit:
        current.sku === selectedStock.sku ? current.unit : selectedStock.unit,
    }));
  }, [selectedStock?.sku]);

  useEffect(() => {
    if (form.warehouseCode || !state.warehouseRecords[0]?.code) return;
    setForm((current) => ({
      ...current,
      warehouseCode: state.warehouseRecords[0].code,
    }));
  }, [form.warehouseCode, state.warehouseRecords]);

  const customerId = state.customerIds[form.customer] || "";
  const listFilters = useMemo(() => {
    const base = {
      customerId: customerId || undefined,
      driver: filters.driver || undefined,
      plate: filters.truck || undefined,
    };
    if (filters.date) {
      return { ...base, date: filters.date };
    }
    return { ...base, ...periodToDateRange(filters.period) };
  }, [customerId, filters.date, filters.driver, filters.period, filters.truck]);
  const dispatchListQuery = useQuery({
    ...dispatchesListQueryOptions(session, listFilters, page),
    enabled: Boolean(session?.id),
  });
  const dispatchRows = flattenDispatches(dispatchListQuery.data?.items || []);

  useEffect(() => {
    setPage(1);
  }, [customerId, filters.date, filters.driver, filters.period, filters.truck]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tạo phiếu xuất hàng</CardTitle>
          <CardDescription>
            Chọn khách hàng, xe, tài xế và lượng hàng cần xuất.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasWarehouses ? (
            <form
              className="grid gap-3 lg:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const customerName = form.customer.trim();
                const stock = customerStock.find((row) => row.sku === form.sku);
                writeDispatchPrefs({ driver: form.driver, truck: form.truck });
                mutation.mutate({
                  customerName,
                  date: form.date,
                  driverName: form.driver,
                  items: [
                    {
                      quantity: Number(form.quantity),
                      sku: normalizeSku(form.sku),
                      unit: form.unit.trim() || stock?.unit || "đơn vị",
                    },
                  ],
                  plate: form.truck,
                  warehouseCode: selectedWarehouseCode,
                });
                setSelectedCustomer(customerName);
                setFilters({ date: "", driver: "", period: "week", truck: "" });
                setPage(1);
              }}
            >
              <Field>
                Ngày xuất
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
                    setSelectedCustomer(event.target.value);
                    setForm({
                      ...form,
                      customer: event.target.value,
                      quantity: "",
                      sku: "",
                      unit: "",
                    });
                  }}
                >
                  <option value="">Chọn khách hàng</option>
                  {allCustomers(state).map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Xe
                <Select
                  required
                  value={form.truck}
                  onChange={(event) => {
                    const truck = event.target.value;
                    writeDispatchPrefs({ driver: form.driver, truck });
                    setForm({ ...form, truck });
                  }}
                >
                  <option value="">Chọn xe</option>
                  {state.vehicles.map((truck) => (
                    <option key={truck} value={truck}>
                      {truck}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Tài xế
                <Select
                  required
                  value={form.driver}
                  onChange={(event) => {
                    const driver = event.target.value;
                    writeDispatchPrefs({ driver, truck: form.truck });
                    setForm({ ...form, driver });
                  }}
                >
                  <option value="">Chọn tài xế</option>
                  {state.drivers.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
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
                <Select
                  required
                  value={form.sku}
                  onChange={(event) => {
                    const next = customerStock.find(
                      (row) => row.sku === event.target.value,
                    );
                    setForm({
                      ...form,
                      quantity: next?.remainingQuantity || "",
                      sku: event.target.value,
                      unit: next?.unit || "đơn vị",
                    });
                  }}
                >
                  <option value="">Chọn loại hàng</option>
                  {customerStock.map((row) => (
                    <option key={`${row.customer}-${row.sku}`} value={row.sku}>
                      {row.sku} - còn {number(row.remainingQuantity)} {row.unit}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Số lượng
                <Input
                  max={selectedStock?.remainingQuantity || undefined}
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
              <div
                className={cn(operationActionButtonShellClass, "lg:col-span-2")}
              >
                <Button
                  className={operationActionButtonClass}
                  disabled={mutation.isPending}
                  type="submit"
                >
                  {mutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  Xuất hàng
                </Button>
              </div>
            </form>
          ) : (
            <EmptyPanel text="Chưa có kho hoạt động. Admin cần tạo kho trong Quản lý trước khi xuất hàng." />
          )}
        </CardContent>
      </Card>
      <DataTableCard
        description={periodDescription(
          "Lọc nhanh các chuyến đã xuất",
          filters.period,
        )}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:w-72">
            <PeriodSelect
              className="w-full sm:w-full"
              value={filters.period}
              onChange={(period) => {
                setFilters({ ...filters, period });
                setPage(1);
              }}
            />
            <CsvDownloadButton
              disabled={!dispatchRows.length}
              onDownload={() =>
                downloadCsv({
                  columns: [
                    { label: "Ngày xuất", value: (row) => formatDate(row.date) },
                    { label: "Khách hàng", value: "customer" },
                    { label: "Xe", value: "truck" },
                    { label: "Tài xế", value: "driver" },
                    { label: "Kho", value: (row) => row.warehouse || "" },
                    { label: "Loại hàng", value: "sku" },
                    { label: "Số lượng", value: (row) => number(row.quantity) },
                    { label: "Đơn vị", value: (row) => row.unit || "đơn vị" },
                  ],
                  filename: `lich-su-xuat-hang-${filters.period}-trang-${dispatchListQuery.data?.page || page}.csv`,
                  rows: dispatchRows,
                })
              }
            />
          </div>
        }
        title="Lịch sử xuất hàng"
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Field>
            Ngày xuất
            <Input
              className="min-w-0"
              type="date"
              value={filters.date}
              onChange={(event) => {
                setFilters({ ...filters, date: event.target.value });
                setPage(1);
              }}
            />
          </Field>
          <Field>
            Xe
            <Select
              value={filters.truck}
              onChange={(event) => {
                setFilters({ ...filters, truck: event.target.value });
                setPage(1);
              }}
            >
              <option value="">Tất cả xe</option>
              {state.vehicles.map((truck) => (
                <option key={truck} value={truck}>
                  {truck}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Tài xế
            <Select
              value={filters.driver}
              onChange={(event) => {
                setFilters({ ...filters, driver: event.target.value });
                setPage(1);
              }}
            >
              <option value="">Tất cả tài xế</option>
              {state.drivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </Select>
          </Field>
          <div className={cn(operationActionButtonShellClass, "self-end")}>
            <Button
              className={operationActionButtonClass}
              disabled={dispatchListQuery.isFetching}
              onClick={() => {
                setFilters({ date: "", driver: "", period: "week", truck: "" });
                setSelectedCustomer("");
                setPage(1);
              }}
              type="button"
            >
              {dispatchListQuery.isFetching ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              Xem tất cả
            </Button>
          </div>
        </div>
        <DispatchTable rows={dispatchRows} />
        <Pagination
          page={dispatchListQuery.data?.page || page}
          pageCount={dispatchListQuery.data?.pageCount || 1}
          onPageChange={setPage}
        />
      </DataTableCard>
    </div>
  );
}
