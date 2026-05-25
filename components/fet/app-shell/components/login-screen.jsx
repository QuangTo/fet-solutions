"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { AppFooter } from "./app-footer";
import { FetBrandMark } from "./fet-brand-mark";

/** Same shell as login; used until client reads session from storage. */
export function SessionBootstrapScreen() {
  return (
    <main
      className="app-shell grid min-h-screen place-items-center gap-3 p-4"
      data-density="comfortable"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 grid justify-items-center gap-3">
            <FetBrandMark size="md" />
            <div className="grid gap-2">
              <Skeleton className="mx-auto h-7 w-48" />
              <Skeleton className="mx-auto h-4 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}

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
        <CardHeader className="text-center">
          <div className="mb-4 grid justify-items-center gap-3">
            <FetBrandMark size="md" />
            <CardTitle className="text-xl font-normal text-zinc-800 sm:text-2xl">
              Quản lý vận tải
            </CardTitle>
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
