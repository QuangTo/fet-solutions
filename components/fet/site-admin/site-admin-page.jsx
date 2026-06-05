"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { logoutRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyRow, Table, Td, Th } from "@/components/ui/table";
import { LoginScreen, SessionBootstrapScreen } from "../app-shell/components/login-screen";
import { money } from "../app-shell/lib/format";

const SITE_STATUS_OPTIONS = ["active", "suspended", "archived"];
const BILLING_STATUS_OPTIONS = ["trialing", "active", "past_due", "suspended", "canceled"];
const PLAN_OPTIONS = ["plus", "pro", "vip"];

const initialForm = {
  adminPhone: "0373665129",
  billingStatus: "trialing",
  name: "",
  planCode: "plus",
  trialDays: "30",
};

const initialBillingEdit = {
  planCode: "plus",
  siteId: "",
  siteQuery: "",
  trialEndsAt: "",
};

function wordCount(value = "") {
  return value.trim().split(/\s+/).filter(Boolean).length;
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

function inputDateValue(value) {
  if (!value) return "";
  const raw = value.toString();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function dateTimeText(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.toString();
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function paymentReviewCopy(payment) {
  if (payment?.status === "succeeded") {
    return {
      at: payment.meta?.approvedAt || payment.paidAt || payment.createdAt,
      by: payment.meta?.approvedBy || "Platform admin",
      label: "Đã duyệt",
      tone: "green",
    };
  }
  if (payment?.status === "failed") {
    return {
      at: payment.meta?.rejectedAt || payment.createdAt,
      by: payment.meta?.rejectedBy || "Platform admin",
      label: "Từ chối",
      tone: "red",
    };
  }
  return {
    at: payment?.paidAt || payment?.createdAt,
    by: "Platform admin",
    label: payment?.status || "Chưa rõ",
    tone: "default",
  };
}

function normalizeSiteQuery(value = "") {
  return value.toString().trim().replace(/^\/+/, "").toLowerCase();
}

function siteSearchText(site) {
  return [
    site.id,
    site.name,
    site.publicSlug,
    site.organizationName,
    site.organizationSlug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sitePlanCode(site) {
  return site?.subscription?.planCode || "plus";
}

function SiteAdminShell({ children, onLogout }) {
  return (
    <main className="app-shell min-h-screen bg-zinc-50 text-zinc-950" data-density="compact">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-1">
            <p className="text-ui-xs font-semibold uppercase tracking-wide text-zinc-500">
              LMS Platform
            </p>
            <h1 className="text-ui-title font-semibold tracking-tight">Site Admin</h1>
          </div>
          {onLogout ? (
            <Button onClick={onLogout} type="button" variant="outline">
              Đăng xuất
            </Button>
          ) : null}
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
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [billingEdit, setBillingEdit] = useState(initialBillingEdit);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const sitesQuery = useQuery({
    enabled: adminUnlocked,
    queryFn: () => apiRequest("/platform/sites"),
    queryKey: ["platform-sites", authVersion],
    retry: false,
  });
  const billingQuery = useQuery({
    enabled: adminUnlocked,
    queryFn: () => apiRequest("/platform/billing"),
    queryKey: ["platform-billing", authVersion],
    retry: false,
  });

  const sites = sitesQuery.data || [];
  const billing = billingQuery.data || {};
  const billingSummary = billing.summary || {};
  const pendingPayments = billing.pendingPayments || [];
  const recentPayments = billing.recentPayments || [];
  const monthlyRevenue = billing.monthlyRevenue || [];
  const totals = useMemo(
    () => ({
      active: sites.filter((site) => site.status === "active").length,
      total: sites.length,
      trialing: sites.filter((site) => site.billingStatus === "trialing").length,
    }),
    [sites],
  );
  const matchingSites = useMemo(() => {
    const query = normalizeSiteQuery(billingEdit.siteQuery);
    if (!query) return [];
    return sites
      .filter((site) => siteSearchText(site).includes(query))
      .slice(0, 6);
  }, [billingEdit.siteQuery, sites]);
  const selectedBillingSite = useMemo(
    () => sites.find((site) => site.id === billingEdit.siteId) || null,
    [billingEdit.siteId, sites],
  );

  function selectBillingSite(site) {
    setBillingEdit({
      planCode: sitePlanCode(site),
      siteId: site.id,
      siteQuery: site.publicSlug,
      trialEndsAt: inputDateValue(site.trialEndsAt || site.subscription?.trialEndsAt),
    });
    setMessage("");
  }

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
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
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
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ action, paymentId }) =>
      apiRequest(`/platform/payments/${paymentId}/${action}`, {
        body: action === "reject" ? JSON.stringify({ reason: "Site admin reject" }) : undefined,
        method: "PATCH",
      }),
    onError: (error) => setMessage(error.message || "Không xử lý được thanh toán."),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["platform-billing"] });
      queryClient.invalidateQueries({ queryKey: ["platform-sites"] });
    },
  });

  if (!adminUnlocked) {
    return (
      <LoginScreen
        onLogin={(user) => {
          if (!user?.isPlatformAdmin) {
            throw new Error("Tài khoản này không có quyền Site Admin.");
          }
          setAdminUnlocked(true);
          setAuthVersion((value) => value + 1);
        }}
      />
    );
  }

  if (sitesQuery.isPending || billingQuery.isPending) return <SessionBootstrapScreen />;

  if (sitesQuery.error instanceof ApiError && sitesQuery.error.status === 401) {
    return (
      <LoginScreen
        onLogin={(user) => {
          if (!user?.isPlatformAdmin) {
            throw new Error("Tài khoản này không có quyền Site Admin.");
          }
          setAuthVersion((value) => value + 1);
          queryClient.invalidateQueries({ queryKey: ["platform-sites"] });
        }}
      />
    );
  }

  if (sitesQuery.error instanceof ApiError && sitesQuery.error.status === 403) {
    return (
      <SiteAdminShell
        onLogout={async () => {
          await logoutRequest().catch(() => null);
          setAdminUnlocked(false);
          queryClient.removeQueries({ queryKey: ["platform-sites"] });
          queryClient.removeQueries({ queryKey: ["platform-billing"] });
        }}
      >
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
    <SiteAdminShell
      onLogout={async () => {
        await logoutRequest().catch(() => null);
        setAdminUnlocked(false);
        queryClient.removeQueries({ queryKey: ["platform-sites"] });
        queryClient.removeQueries({ queryKey: ["platform-billing"] });
      }}
    >
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
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
        <Card>
          <CardHeader>
            <CardTitle>Chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {billingSummary.pendingReviewCount || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tháng này</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {money(billingSummary.currentMonthPaid || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tổng đã thu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {money(billingSummary.totalPaid || 0)}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Thanh toán chờ duyệt</CardTitle>
              <Button
                disabled={billingQuery.isFetching}
                onClick={() => billingQuery.refetch()}
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
                    <Th>Số tiền</Th>
                    <Th>Gói</Th>
                    <Th>Nội dung CK</Th>
                    <Th>Ngày gửi</Th>
                    <Th>Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.length ? (
                    pendingPayments.map((payment) => (
                      <tr key={payment.id}>
                        <Td>
                          <div className="grid gap-0.5">
                            <span className="font-semibold text-zinc-900">
                              {payment.siteName}
                            </span>
                            <span className="text-ui-xs text-zinc-500">
                              /{payment.siteSlug}
                            </span>
                          </div>
                        </Td>
                        <Td>{money(payment.amount, payment.currency)}</Td>
                        <Td>
                          <Badge tone="amber">
                            {payment.meta?.planCode || "plus"} ·{" "}
                            {payment.meta?.billingInterval || "monthly"}
                          </Badge>
                        </Td>
                        <Td>{payment.meta?.transferContent || payment.id}</Td>
                        <Td>{dateText(payment.createdAt)}</Td>
                        <Td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={paymentMutation.isPending}
                              onClick={() =>
                                paymentMutation.mutate({
                                  action: "approve",
                                  paymentId: payment.id,
                                })
                              }
                              size="sm"
                              type="button"
                            >
                              <Check className="h-4 w-4" />
                              Duyệt
                            </Button>
                            <Button
                              disabled={paymentMutation.isPending}
                              onClick={() =>
                                paymentMutation.mutate({
                                  action: "reject",
                                  paymentId: payment.id,
                                })
                              }
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              <X className="h-4 w-4" />
                              Từ chối
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  ) : (
                    <EmptyRow colSpan={6}>Không có thanh toán chờ duyệt.</EmptyRow>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Lịch sử duyệt thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>Site</Th>
                    <Th>Số tiền</Th>
                    <Th>Gói</Th>
                    <Th>Trạng thái</Th>
                    <Th>Thời gian</Th>
                    <Th>Người xử lý</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length ? (
                    recentPayments.map((payment) => {
                      const review = paymentReviewCopy(payment);
                      return (
                        <tr key={payment.id}>
                          <Td>
                            <div className="grid gap-0.5">
                              <span className="font-semibold text-zinc-900">
                                {payment.siteName}
                              </span>
                              <span className="text-ui-xs text-zinc-500">
                                /{payment.siteSlug}
                              </span>
                            </div>
                          </Td>
                          <Td>{money(payment.amount, payment.currency)}</Td>
                          <Td>
                            <Badge tone="default">
                              {payment.meta?.planCode || "plus"} ·{" "}
                              {payment.meta?.billingInterval || "monthly"}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge tone={review.tone}>{review.label}</Badge>
                          </Td>
                          <Td>{dateTimeText(review.at)}</Td>
                          <Td>{review.by}</Td>
                        </tr>
                      );
                    })
                  ) : (
                    <EmptyRow colSpan={6}>Chưa có lịch sử duyệt thanh toán.</EmptyRow>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Tháng</Th>
                  <Th>Số tiền</Th>
                  <Th>GD</Th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.length ? (
                  monthlyRevenue.map((row) => (
                    <tr key={row.month}>
                      <Td>{row.month}</Td>
                      <Td>{money(row.amount)}</Td>
                      <Td>{row.count}</Td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow colSpan={3}>Chưa có giao dịch đã thanh toán.</EmptyRow>
                )}
              </tbody>
            </Table>
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

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Sửa plan / trial</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedBillingSite) {
                    setMessage("Chọn site khách hàng trước khi cập nhật.");
                    return;
                  }
                  updateMutation.mutate({
                    body: {
                      planCode: billingEdit.planCode,
                      trialEndsAt: billingEdit.trialEndsAt,
                    },
                    siteId: selectedBillingSite.id,
                  });
                }}
              >
                <Field>
                  Site khách hàng
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="nhap slug, ten site hoac id"
                      value={billingEdit.siteQuery}
                      onChange={(event) =>
                        setBillingEdit((current) => ({
                          ...current,
                          siteId: "",
                          siteQuery: event.target.value,
                        }))
                      }
                    />
                  </div>
                </Field>
                {billingEdit.siteQuery ? (
                  <div className="grid max-h-56 gap-2 overflow-y-auto">
                    {matchingSites.length ? (
                      matchingSites.map((site) => (
                        <Button
                          className="h-auto w-full min-w-0 justify-start whitespace-normal px-3 py-2 text-left"
                          key={site.id}
                          onClick={() => selectBillingSite(site)}
                          type="button"
                          variant={site.id === selectedBillingSite?.id ? "secondary" : "outline"}
                        >
                          <span className="grid min-w-0 gap-0.5">
                            <span className="break-words">{site.name}</span>
                            <span className="break-words text-ui-xs font-medium text-slate-500">
                              /{site.publicSlug} · {sitePlanCode(site)} · trial{" "}
                              {dateText(site.trialEndsAt)}
                            </span>
                          </span>
                        </Button>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-ui-sm text-slate-500">
                        Không tìm thấy site khớp.
                      </p>
                    )}
                  </div>
                ) : null}
                {selectedBillingSite ? (
                  <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-ui-sm text-emerald-900">
                    <span className="font-semibold">{selectedBillingSite.name}</span>
                    <span className="text-emerald-700"> /{selectedBillingSite.publicSlug}</span>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    Plan
                    <Select
                      disabled={!selectedBillingSite}
                      value={billingEdit.planCode}
                      onChange={(event) =>
                        setBillingEdit((current) => ({
                          ...current,
                          planCode: event.target.value,
                        }))
                      }
                    >
                      {PLAN_OPTIONS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field>
                    Trial end
                    <Input
                      disabled={!selectedBillingSite}
                      required
                      type="date"
                      value={billingEdit.trialEndsAt}
                      onChange={(event) =>
                        setBillingEdit((current) => ({
                          ...current,
                          trialEndsAt: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                {message ? (
                  <p className="text-ui-sm font-medium text-red-600">{message}</p>
                ) : null}
                <Button disabled={!selectedBillingSite || updateMutation.isPending} type="submit">
                  {updateMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu plan / trial
                </Button>
              </form>
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
                  if (wordCount(form.name) > 15) {
                    setMessage("Tên site tối đa 15 từ.");
                    return;
                  }
                  createMutation.mutate({
                    ...form,
                    trialDays: Number(form.trialDays || 0),
                  });
                }}
              >
                <Field>
                  Tên site (tối đa 15 từ)
                  <Input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
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
                      {PLAN_OPTIONS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
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
        </div>
      </section>
    </SiteAdminShell>
  );
}
