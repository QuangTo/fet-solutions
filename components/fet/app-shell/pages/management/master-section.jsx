"use client";

import { LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../../components/data-table";
import { Pagination } from "../../components/pagination";
import { primaryActionButtonShellClass } from "../../lib/constants";
import { paginate } from "../../lib/pagination";
import { EditMasterForm } from "./edit-master-form";

export function MasterSection({
  config,
  mutation,
  onToast,
  planLimits,
  records,
}) {
  const { icon: Icon, label, listName, placeholder } = config;
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const path = {
    customers: "/customers",
    drivers: "/drivers",
    vehicles: "/vehicles",
  }[listName];
  const payload = (nextValue) =>
    listName === "vehicles"
      ? { plate: nextValue.toUpperCase() }
      : { name: nextValue.trim() };
  const filteredRecords = records.filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const recordView = paginate(filteredRecords, page, 10);
  const maxVehicles =
    listName === "vehicles" ? planLimits?.maxVehicles ?? null : null;
  const vehicleLimitReached =
    maxVehicles != null && records.length >= maxVehicles;

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [listName]);

  useEffect(() => {
    setPage(1);
  }, [search, records.length]);

  return (
    <>
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle>Quản lý {label}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <Badge tone={vehicleLimitReached ? "amber" : "green"}>
            {maxVehicles != null
              ? `${records.length} / ${maxVehicles} ${label.toLowerCase()}`
              : `${filteredRecords.length} / ${records.length} mục`}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:p-5">
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(10rem,24%)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!value.trim()) return;
            if (vehicleLimitReached) {
              onToast?.(
                `Gói ${planLimits?.planName || "hiện tại"} chỉ cho phép ${maxVehicles} xe. Nâng cấp gói để thêm.`,
                "error",
              );
              return;
            }
            mutation.mutate({ body: payload(value), method: "POST", path });
            setValue("");
          }}
        >
          <Field>
            Thêm {label.toLowerCase()}
            <Input
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <div className={cn(primaryActionButtonShellClass, "self-end")}>
            <Button
              className="w-full"
              disabled={mutation.isPending || vehicleLimitReached}
              title={
                vehicleLimitReached
                  ? `Đã đạt giới hạn ${maxVehicles} xe của gói ${planLimits?.planName || ""}`.trim()
                  : undefined
              }
              type="submit"
            >
              {mutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Thêm
            </Button>
          </div>
        </form>
        {vehicleLimitReached ? (
          <p className="text-ui-sm font-medium text-amber-700">
            Gói {planLimits?.planName || "hiện tại"} cho phép tối đa {maxVehicles} xe. Nâng cấp gói để mở rộng đội xe.
          </p>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder={`Tìm ${label.toLowerCase()}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {/* <span className="text-sm font-semibold text-slate-500">
            Cập nhật danh mục sẽ đồng bộ dữ liệu.
          </span> */}
        </div>
        <DataTable width="management">
          <thead>
            <tr>
              <Th>{label}</Th>
              <Th>Trạng thái</Th>
              <Th>Cập nhật</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length ? (
              recordView.rows.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <strong className="min-w-0 truncate text-slate-900">
                        {item.label}
                      </strong>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Badge tone="green">Đang dùng</Badge>
                  </Td>
                  <Td>{formatDate(item.updatedAt || item.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button
                        aria-label={`Sửa ${item.label}`}
                        size="icon"
                        title="Sửa"
                        type="button"
                        variant="outline"
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Xóa ${item.label}`}
                        size="icon"
                        title="Xóa"
                        type="button"
                        variant="destructive"
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>
                {records.length
                  ? "Không tìm thấy mục phù hợp."
                  : `Chưa có ${label.toLowerCase()}.`}
              </EmptyRow>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={recordView.page}
          pageCount={recordView.pageCount}
          onPageChange={setPage}
        />
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Sửa {label}
          </DialogTitle>
          <EditMasterForm
            initialValue={editing?.label || ""}
            isPending={mutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(nextValue) => {
              mutation.mutate(
                {
                  body: payload(nextValue),
                  method: "PATCH",
                  path: `${path}/${editing.id}`,
                },
                {
                  onSuccess: () => setEditing(null),
                },
              );
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Xóa {deleting?.label}?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Danh mục này sẽ không còn xuất hiện.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setDeleting(null)}
              type="button"
              variant="secondary"
            >
              Hủy
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate(
                  { method: "DELETE", path: `${path}/${deleting.id}` },
                  { onSuccess: () => setDeleting(null) },
                );
              }}
              type="button"
              variant="destructive"
            >
              Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
