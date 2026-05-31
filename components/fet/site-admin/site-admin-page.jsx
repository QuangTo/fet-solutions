"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyRow, Table, Td, Th } from "@/components/ui/table";
import { LoginScreen, SessionBootstrapScreen } from "../app-shell/components/login-screen";

const SITE_STATUS_OPTIONS = ["active", "suspended", "archived"];
const BILLING_STATUS_OPTIONS = ["trialing", "active", "past_due", "suspended", "canceled"];

const initialForm = {
  adminPhone: "123456789",
  billingStatus: "trialing",
  name: "",
  planCode: "plus",
  slug: "",
  trialDays: "30",
};

function slugify(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function statusTone(value = "") {
  if (["active", "trialing"].includes(value)) return "green";
  if (["past_due", "suspended"].includes(value)) return "amber";
  if (["archived", "canceled"].includes(value)) return "red";
  return "default";
}

function dateText(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toString().slice(0, 10);
  return date.toLocaleDateString("vi-VN");
}

function SiteAdminShell({ children }) {
  return (
    <main className="app-shell min-h-screen bg-zinc-50 text-zinc-950" data-density="compact">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-ui-xs font-semibold uppercase tracking-wide text-zinc-500">
            FES Platform
          </p>
          <h1 className="text-ui-title font-semibold tracking-tight">Site Admin</h1>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

export default function SiteAdminPage() {
  const queryClient = useQueryClient();
  const [authVersion, setAuthVersion] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const sitesQuery = useQuery({
    queryFn: () => apiRequest("/platform/sites"),
    queryKey: ["platform-sites", authVersion],
    retry: false,
  });

  const sites = sitesQuery.data || [];
  const totals = useMemo(
    () => ({
      active: sites.filter((site) => site.status === "active").length,
      total: sites.length,
      trialing: sites.filter((site) => site.billingStatus === "trialing").length,
    }),
    [sites],
  );

  const createMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest("/platform/sites", {
        body: JSON.stringify(payload),
        method: "POST",
      }),
    onError: (error) => setMessage(error.message || "Không tạo được site."),
    onSuccess: () => {
      setForm(initialForm);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["platform-sites"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ body, siteId }) =>
      apiRequest(`/platform/sites/${siteId}`, {
        body: JSON.stringify(body),
        method: "PATCH",
      }),
    onError: (error) => setMessage(error.message || "Không cập nhật được site."),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["platform-sites"] });
    },
  });

  if (sitesQuery.isPending) return <SessionBootstrapScreen />;

  if (sitesQuery.error instanceof ApiError && sitesQuery.error.status === 401) {
    return (
      <LoginScreen
        siteSlug="demo"
        onLogin={() => {
          setAuthVersion((value) => value + 1);
          queryClient.invalidateQueries({ queryKey: ["platform-sites"] });
        }}
      />
    );
  }

  if (sitesQuery.error instanceof ApiError && sitesQuery.error.status === 403) {
    return (
      <SiteAdminShell>
        <Card>
          <CardHeader>
            <CardTitle>Không có quyền</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-ui-sm text-zinc-600">
              Tài khoản hiện tại chưa được cấp quyền platform admin.
            </p>
          </CardContent>
        </Card>
      </SiteAdminShell>
    );
  }

  return (
    <SiteAdminShell>
      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tổng site</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đang active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totals.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trialing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totals.trialing}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Sites</CardTitle>
            <Button
              disabled={sitesQuery.isFetching}
              onClick={() => sitesQuery.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Site</Th>
                  <Th>URL</Th>
                  <Th>Status</Th>
                  <Th>Billing</Th>
                  <Th>Plan</Th>
                  <Th>Users</Th>
                  <Th>Ops</Th>
                  <Th>Trial end</Th>
                </tr>
              </thead>
              <tbody>
                {sites.length ? (
                  sites.map((site) => (
                    <tr key={site.id}>
                      <Td>
                        <div className="grid gap-0.5">
                          <span className="font-semibold text-zinc-900">{site.name}</span>
                          <span className="text-ui-xs text-zinc-500">{site.id}</span>
                        </div>
                      </Td>
                      <Td>
                        <a
                          className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                          href={`/${site.publicSlug}`}
                          target="_blank"
                        >
                          /{site.publicSlug}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Td>
                      <Td>
                        <Select
                          aria-label={`Status ${site.publicSlug}`}
                          className="h-8 min-w-28"
                          disabled={updateMutation.isPending}
                          value={site.status}
                          onChange={(event) =>
                            updateMutation.mutate({
                              body: { status: event.target.value },
                              siteId: site.id,
                            })
                          }
                        >
                          {SITE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>
                        <Select
                          aria-label={`Billing ${site.publicSlug}`}
                          className="h-8 min-w-32"
                          disabled={updateMutation.isPending}
                          value={site.billingStatus}
                          onChange={(event) =>
                            updateMutation.mutate({
                              body: { billingStatus: event.target.value },
                              siteId: site.id,
                            })
                          }
                        >
                          {BILLING_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>
                        <Badge tone={statusTone(site.subscription?.status)}>
                          {site.subscription?.planCode || "none"}
                        </Badge>
                      </Td>
                      <Td>{site.userCount}</Td>
                      <Td>
                        {site.customerCount} KH / {site.vehicleCount} xe /{" "}
                        {site.warehouseCount} kho
                      </Td>
                      <Td>{dateText(site.trialEndsAt)}</Td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={8}>Chưa có site.</EmptyRow>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tạo site</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate({
                  ...form,
                  trialDays: Number(form.trialDays || 0),
                });
              }}
            >
              <Field>
                Tên site
                <Input
                  required
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm((current) => ({
                      ...current,
                      name,
                      slug: current.slug ? current.slug : slugify(name),
                    }));
                  }}
                />
              </Field>
              <Field>
                Slug
                <Input
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                />
              </Field>
              <Field>
                Admin phone
                <Input
                  inputMode="tel"
                  required
                  value={form.adminPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      adminPhone: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  Plan
                  <Select
                    value={form.planCode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        planCode: event.target.value,
                      }))
                    }
                  >
                    <option value="plus">plus</option>
                    <option value="pro">pro</option>
                    <option value="vip">vip</option>
                  </Select>
                </Field>
                <Field>
                  Trial days
                  <Input
                    min="0"
                    max="365"
                    required
                    type="number"
                    value={form.trialDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        trialDays: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <Field>
                Billing
                <Select
                  value={form.billingStatus}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      billingStatus: event.target.value,
                    }))
                  }
                >
                  {BILLING_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Field>
              {message ? (
                <p className="text-ui-sm font-medium text-red-600">{message}</p>
              ) : null}
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Tạo site
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </SiteAdminShell>
  );
}
