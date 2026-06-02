"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { AppFooter } from "./app-footer";
import { FetBrandMark } from "./fet-brand-mark";

function LoginBackdrop({ children }) {
  return (
    <main
      className="app-shell relative grid min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef7f1_46%,#f4f4f5_100%)] p-4 text-zinc-900"
      data-density="comfortable"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(24,24,27,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.045)_1px,transparent_1px)] bg-[size:44px_44px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-12 h-72 w-72 rounded-full bg-emerald-200/45 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-4 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-full w-[min(900px,92vw)] -translate-x-1/2"
      >
        <div className="absolute left-0 top-[16%] h-px w-full rotate-[-9deg] bg-gradient-to-r from-transparent via-emerald-700/25 to-transparent" />
        <div className="absolute left-[8%] top-[28%] h-px w-[84%] rotate-[-9deg] bg-gradient-to-r from-transparent via-zinc-900/15 to-transparent" />
        <div className="absolute left-[18%] top-[64%] h-px w-[68%] rotate-[-9deg] bg-gradient-to-r from-transparent via-sky-700/20 to-transparent" />
        <div className="absolute right-[8%] top-[18%] hidden w-52 rounded-lg border border-white/70 bg-white/45 p-3 shadow-sm backdrop-blur-sm sm:block">
          <div className="mb-3 h-2 w-24 rounded bg-zinc-300/80" />
          <div className="grid grid-cols-3 gap-2">
            <span className="h-10 rounded bg-emerald-500/20" />
            <span className="h-10 rounded bg-zinc-900/10" />
            <span className="h-10 rounded bg-sky-500/20" />
          </div>
        </div>
        <div className="absolute bottom-[14%] left-[4%] hidden w-44 rounded-lg border border-white/70 bg-white/40 p-3 shadow-sm backdrop-blur-sm md:block">
          <div className="grid gap-2">
            <span className="h-2 w-28 rounded bg-zinc-300/80" />
            <span className="h-2 w-36 rounded bg-emerald-500/30" />
            <span className="h-2 w-24 rounded bg-zinc-300/80" />
          </div>
        </div>
      </div>
      <div className="relative z-10 grid min-h-[calc(100vh-2rem)] place-items-center">
        {children}
      </div>
    </main>
  );
}

/** Same shell as login; used until client reads session from storage. */
export function SessionBootstrapScreen() {
  return (
    <LoginBackdrop>
      <Card className="w-full max-w-md border-white/70 bg-white/90 shadow-xl shadow-zinc-900/10 backdrop-blur">
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
    </LoginBackdrop>
  );
}

export function LoginScreen({ onLogin, siteSlug = "" }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  return (
    <LoginBackdrop>
      <Card className="w-full max-w-md border-white/70 bg-white/90 shadow-xl shadow-zinc-900/10 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mb-4 grid justify-items-center gap-3">
            <FetBrandMark size="md" />
            <CardTitle className="text-xl font-normal text-zinc-800 sm:text-2xl">
              Hệ thống quản lý logistics
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="mx-auto grid w-full max-w-sm gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              setIsPending(true);
              try {
                const user = await apiRequest("/users/login", {
                  body: JSON.stringify({
                    password,
                    phone: phone.trim(),
                    ...(siteSlug ? { siteSlug } : {}),
                  }),
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
              Tài khoản
              <Input
                autoComplete="tel"
                placeholder="0900..."
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
            <Button
              aria-busy={isPending}
              className="mt-2 w-full"
              disabled={isPending}
              type="submit"
            >
              {isPending ? (
                <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
              ) : null}
              {isPending ? "Đang đăng nhập" : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <AppFooter className="absolute bottom-5 left-1/2 w-full max-w-md -translate-x-1/2 text-xs leading-5 text-zinc-500 sm:bottom-7" />
    </LoginBackdrop>
  );
}
