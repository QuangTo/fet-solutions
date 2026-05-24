"use client";

import { KeyRound, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeRole, roles } from "@/lib/fet-domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";

export function AccountDialog({
  isPending,
  onLogout,
  onOpenChange,
  onPasswordChange,
  open,
  session,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setMessage("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black text-slate-950">
                Tài khoản
              </DialogTitle>
              <DialogDescription className="truncate text-sm font-semibold text-slate-500">
                {session.name} · {roles[normalizeRole(session.role)]}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <span className="font-semibold text-slate-500">Số điện thoại</span>
            <strong className="text-slate-950">
              {session.phone || "Chưa có SĐT"}
            </strong>
            {session.siteName ? (
              <>
                <span className="mt-2 font-semibold text-slate-500">Site</span>
                <strong className="text-slate-950">{session.siteName}</strong>
              </>
            ) : null}
          </div>
        </div>
        <form
          className="grid gap-4 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            try {
              await onPasswordChange({ currentPassword, newPassword });
              setCurrentPassword("");
              setNewPassword("");
              onOpenChange(false);
            } catch (error) {
              setMessage(error.message);
            }
          }}
        >
          <Field>
            Mật khẩu hiện tại
            <Input
              autoComplete="current-password"
              required
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field>
            Mật khẩu mới
            <Input
              autoComplete="new-password"
              minLength={6}
              required
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          {message ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <Button onClick={onLogout} type="button" variant="secondary">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
            <div className="flex gap-2">
              {/* <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="secondary"
              >
                Đóng
              </Button> */}
              <Button disabled={isPending} type="submit">
                <KeyRound className="h-4 w-4" />
                Đổi mật khẩu
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
