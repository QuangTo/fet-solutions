"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { AppFooter } from "./app-footer";

export function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  return (
    <main
      className="app-shell grid min-h-screen place-items-center gap-3 p-4"
      data-density="comfortable"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-[10px] font-bold text-white">
              FET
            </div>
            <div>
              <CardTitle>Quản lý vận tải</CardTitle>
              <CardDescription>Đăng nhập bằng số điện thoại</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              setIsPending(true);
              try {
                const user = await apiRequest("/users/login", {
                  body: JSON.stringify({ password, phone: phone.trim() }),
                  method: "POST",
                });
                onLogin(user);
              } catch (error) {
                setMessage(error.message);
              } finally {
                setIsPending(false);
              }
            }}
          >
            <Field>
              Số điện thoại
              <Input
                autoComplete="tel"
                inputMode="tel"
                placeholder="090..."
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field>
              Mật khẩu
              <Input
                autoComplete="current-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {message ? (
              <p className="text-ui-sm font-medium text-red-600">{message}</p>
            ) : null}
            <Button disabled={isPending} type="submit">
              Đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
      <AppFooter className="w-full max-w-md" />
    </main>
  );
}
