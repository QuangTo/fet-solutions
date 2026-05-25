"use client";

import { ChevronRight, Pencil, Plus, Search, Trash2, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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

function WarehouseForm({ initial, isPending, onCancel, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [code, setCode] = useState(initial?.code || "");

  useEffect(() => {
    setName(initial?.name || "");
    setCode(initial?.code || "");
  }, [initial?.name, initial?.code]);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !code.trim()) return;
        onSubmit({ code: code.trim(), name: name.trim() });
      }}
    >
      <Field>
        Tên kho
        <Input
          placeholder="Kho trung tâm"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field>
        Mã kho
        <Input
          placeholder="MAIN"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="secondary">
          Hủy
        </Button>
        <Button disabled={isPending} type="submit">
          Lưu
        </Button>
      </div>
    </form>
  );
}

const emptyForm = { code: "", name: "" };

export function WarehouseSection({ isActive, mutation, onToggle, records }) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filteredRecords = records.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [item.label, item.name, item.code]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(term));
  });
  const recordView = paginate(filteredRecords, page, 10);

  useEffect(() => {
    setPage(1);
  }, [search, records.length]);

  return (
    <Card className="overflow-hidden">
      <button
        aria-expanded={isActive}
        className={cn(
          "flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-slate-50 sm:px-5",
          isActive && "border-b border-slate-100 bg-slate-50",
        )}
        onClick={onToggle}
        type="button"
      >
        <strong className="text-base font-bold leading-tight text-slate-950">
          Kho hàng
        </strong>
        <ChevronRight
          className={cn(
            "h-6 w-6 shrink-0 text-slate-500 transition",
            isActive && "rotate-90 text-emerald-700",
          )}
        />
      </button>
      {isActive ? (
        <>
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
                  <Warehouse className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle>Quản lý kho</CardTitle>
                  <CardDescription>
                    Danh mục kho dùng cho nhập/xuất và báo cáo theo site.
                  </CardDescription>
                </div>
              </div>
              <Badge tone="green">
                {filteredRecords.length} / {records.length} kho
              </Badge>
            </div>
          </div>
          <div className="grid gap-4 p-4 lg:p-5">
            <form
              className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,18%)]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!form.name.trim() || !form.code.trim()) return;
                mutation.mutate(
                  {
                    body: {
                      code: form.code.trim(),
                      name: form.name.trim(),
                    },
                    method: "POST",
                    path: "/warehouses",
                  },
                  { onSuccess: () => setForm(emptyForm) },
                );
              }}
            >
              <Field>
                Thêm kho
                <Input
                  placeholder="Kho trung tâm"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </Field>
              <Field>
                Mã kho
                <Input
                  placeholder="MAIN"
                  required
                  value={form.code}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                />
              </Field>
              <div className={cn(primaryActionButtonShellClass, "self-end")}>
                <Button
                  className="w-full"
                  disabled={mutation.isPending}
                  type="submit"
                >
                  <Plus className="h-4 w-4" />
                  Thêm
                </Button>
              </div>
            </form>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Tìm kho"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <DataTable width="managementEntity">
              <thead>
                <tr>
                  <Th>Kho</Th>
                  <Th>Mã</Th>
                  <Th className="whitespace-nowrap">Trạng thái</Th>
                  <Th className="whitespace-nowrap">Cập nhật</Th>
                  <Th className="text-right whitespace-nowrap">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length ? (
                  recordView.rows.map((item) => (
                    <tr key={item.id}>
                      <Td>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                            <Warehouse className="h-4 w-4" />
                          </span>
                          <strong className="min-w-0 truncate text-slate-900">
                            {item.name}
                          </strong>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap">{item.code}</Td>
                      <Td className="whitespace-nowrap">
                        <Badge tone="green">Đang dùng</Badge>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex justify-end gap-2">
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
                  <EmptyRow colSpan={5}>
                    {records.length
                      ? "Không tìm thấy kho phù hợp."
                      : "Chưa có kho."}
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
                Sửa kho
              </DialogTitle>
              <WarehouseForm
                initial={editing}
                isPending={mutation.isPending}
                onCancel={() => setEditing(null)}
                onSubmit={(body) => {
                  mutation.mutate(
                    {
                      body,
                      method: "PATCH",
                      path: `/warehouses/${editing.id}`,
                    },
                    { onSuccess: () => setEditing(null) },
                  );
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <DialogContent>
              <DialogTitle className="text-lg font-black text-slate-950">
                Xóa {deleting?.label}?
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-500">
                Kho này sẽ không còn trong danh mục.
              </DialogDescription>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setDeleting(null)} type="button" variant="secondary">
                  Hủy
                </Button>
                <Button
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.mutate(
                      { method: "DELETE", path: `/warehouses/${deleting.id}` },
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
      ) : null}
    </Card>
  );
}
