"use client";

import { Eye, EyeOff, KeyRound, LogOut, UserRound } from "lucide-react";
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setMessage("");
      setShowCurrent(false);
      setShowNew(false);
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
            <div className="relative">
              <Input
                autoComplete="current-password"
                className="pr-10"
                required
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <button
                aria-label={
                  showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                }
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 transition-colors hover:text-slate-900"
                onClick={() => setShowCurrent((value) => !value)}
                tabIndex={-1}
                type="button"
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>
          <Field>
            Mật khẩu mới
            <div className="relative">
              <Input
                autoComplete="new-password"
                className="pr-10"
                minLength={6}
                required
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <button
                aria-label={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 transition-colors hover:text-slate-900"
                onClick={() => setShowNew((value) => !value)}
                tabIndex={-1}
                type="button"
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
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
