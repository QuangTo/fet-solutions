"use client";

import {
  ChevronRight,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { formatDate, normalizeRole, roles } from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../../components/data-table";
import { Pagination } from "../../components/pagination";
import { managedUserRoles } from "@/lib/fet-domain";
import { primaryActionButtonShellClass } from "../../lib/constants";
import { digitsOnly } from "../../lib/format";
import { EditUserForm } from "./edit-user-form";

export function UserSection({
  isActive,
  mutation,
  onToggle,
  onUsersPageChange,
  users,
  usersPage = 1,
  usersPageCount = 1,
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "driver",
  });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const searchTerm = search.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    [user.name, user.phone, roles[normalizeRole(user.role)]]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(searchTerm)),
  );

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
          Tài khoản
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
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle>Quản lý tài khoản</CardTitle>
                  <CardDescription>
                    Tạo tài khoản cho tài xế, thủ kho, kế toán và admin bằng số
                    điện thoại.
                  </CardDescription>
                </div>
              </div>
              <Badge tone="green">
                {filteredUsers.length} / {users.length} user
              </Badge>
            </div>
          </div>
          <div className="grid gap-4 p-4 lg:p-5">
            <form
              className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,18%)_minmax(10rem,18%)]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!form.name.trim() || !form.phone.trim()) return;
                mutation.mutate(
                  {
                    body: {
                      name: form.name.trim(),
                      phone: form.phone.trim(),
                      role: form.role,
                    },
                    method: "POST",
                    path: "/users",
                  },
                  {
                    onSuccess: () =>
                      setForm({ name: "", phone: "", role: "driver" }),
                  },
                );
              }}
            >
              <Field>
                Tên
                <Input
                  maxLength={30}
                  placeholder="Nguyễn A"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value.slice(0, 30) })
                  }
                />
              </Field>
              <Field>
                Số điện thoại
                <Input
                  inputMode="tel"
                  maxLength={12}
                  pattern="[0-9]*"
                  placeholder="090..."
                  required
                  value={form.phone}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      phone: digitsOnly(event.target.value).slice(0, 12),
                    });
                  }}
                />
              </Field>
              <Field>
                Chức vụ
                <Select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                >
                  {managedUserRoles.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
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
                placeholder="Tìm tài khoản"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <DataTable width="managementEntity">
              <thead>
                <tr>
                  <Th>Tên</Th>
                  <Th>Số điện thoại</Th>
                  <Th className="whitespace-nowrap">Chức vụ</Th>
                  <Th className="whitespace-nowrap">Cập nhật</Th>
                  <Th className="text-right whitespace-nowrap">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <Td>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <strong className="min-w-0 truncate text-slate-900">
                            {user.name}
                          </strong>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {user.phone || "Chưa có"}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <Badge tone="green">
                          {roles[normalizeRole(user.role)] || user.role}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatDate(user.updatedAt || user.createdAt)}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex justify-end gap-2">
                          <Button
                            aria-label={`Sửa ${user.name}`}
                            size="icon"
                            title="Sửa"
                            type="button"
                            variant="outline"
                            onClick={() => setEditing(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label={`Xóa ${user.name}`}
                            size="icon"
                            title="Xóa"
                            type="button"
                            variant="destructive"
                            onClick={() => setDeleting(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={5}>
                    {users.length
                      ? "Không tìm thấy tài khoản phù hợp."
                      : "Chưa có tài khoản vận hành."}
                  </EmptyRow>
                )}
              </tbody>
            </DataTable>
            {onUsersPageChange ? (
              <Pagination
                page={usersPage}
                pageCount={usersPageCount}
                onPageChange={onUsersPageChange}
              />
            ) : null}
          </div>
          <Dialog
            open={Boolean(editing)}
            onOpenChange={(open) => !open && setEditing(null)}
          >
            <DialogContent>
              <DialogTitle className="text-lg font-black text-slate-950">
                Sửa tài khoản
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-500">
                Số điện thoại dùng để đăng nhập nên được giữ nguyên.
              </DialogDescription>
              <EditUserForm
                initialUser={editing}
                isPending={mutation.isPending}
                onCancel={() => setEditing(null)}
                onSubmit={(nextUser) => {
                  mutation.mutate(
                    {
                      body: nextUser,
                      method: "PATCH",
                      path: `/users/${editing.id}`,
                    },
                    { onSuccess: () => setEditing(null) },
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
                Xóa {deleting?.name}?
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-500">
                User này sẽ không đăng nhập được nữa.
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
                      {
                        method: "DELETE",
                        path: `/users/${deleting.id}`,
                      },
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
