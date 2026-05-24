"use client";

import { useEffect, useState } from "react";
import { normalizeRole } from "@/lib/fet-domain";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { managedUserRoles } from "@/lib/fet-domain";

export function EditUserForm({ initialUser, isPending, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    role: "driver",
  });

  useEffect(() => {
    setForm({
      name: initialUser?.name || "",
      role: normalizeRole(initialUser?.role || "driver"),
    });
  }, [initialUser]);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.name.trim()) {
          onSubmit({ name: form.name.trim(), role: form.role });
        }
      }}
    >
      <Field>
        Số điện thoại
        <Input disabled value={initialUser?.phone || ""} />
      </Field>
      <Field>
        Tên
        <Input
          autoFocus
          maxLength={30}
          required
          value={form.name}
          onChange={(event) =>
            setForm({ ...form, name: event.target.value.slice(0, 30) })
          }
        />
      </Field>
      <Field>
        Chức vụ
        <Select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
        >
          {managedUserRoles.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
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
