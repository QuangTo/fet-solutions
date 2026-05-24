"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export function EditMasterForm({ initialValue, isPending, onCancel, onSubmit }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSubmit(value);
      }}
    >
      <Input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
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
