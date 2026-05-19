"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  FileCheck2,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest, pageQueryOptions } from "@/lib/api";
import {
  allCustomers,
  composeState,
  customerSummaries,
  dateComparator,
  formatDate,
  normalizeRole,
  normalizeSku,
  pages,
  receiptSummaryRows,
  reportRows,
  roles,
  stockRows,
  todayIso,
} from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyRow, Table, Td, Th } from "@/components/ui/table";

const SESSION_KEY = "fet-logistics-session";
const pageOrder = ["tong-quan", "nhap-hang", "xuat-hang", "bao-cao", "quan-ly", "cai-dat"];
const iconMap = {
  FileCheck2,
  LayoutDashboard,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Truck,
};

const emptyState = composeState({});

function number(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function pageFromHash() {
  if (typeof window === "undefined") return "tong-quan";
  const value = window.location.hash.replace("#", "");
  return pages[value] ? value : "tong-quan";
}

function paginate(rows, page, pageSize = 10) {
  const pageCount = Math.max(Math.ceil(rows.length / pageSize), 1);
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pageCount,
    rows: rows.slice(start, start + pageSize),
  };
}

function Pagination({ onPageChange, page, pageCount }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-500">
      <Button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
        variant="secondary"
      >
        Trước
      </Button>
      <span>
        Trang {page} / {pageCount}
      </span>
      <Button
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        type="button"
        variant="secondary"
      >
        Sau
      </Button>
    </div>
  );
}

export default function FetNextApp() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [activePage, setActivePage] = useState("tong-quan");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState({
    density: "comfortable",
    accent: "emerald",
  });
  const [overviewPeriod, setOverviewPeriod] = useState("week");

  useEffect(() => {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setSession({ ...parsed, role: normalizeRole(parsed.role) });
    }
    setActivePage(pageFromHash());
    const onHashChange = () => setActivePage(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeRole = normalizeRole(session?.role || "warehouse");
  const masterQuery = useQuery({
    ...pageQueryOptions("master", session),
    enabled: Boolean(session),
  });
  const operationsQuery = useQuery({
    ...pageQueryOptions("operations", session),
    enabled: Boolean(session),
  });
  const reportQuery = useQuery({
    ...pageQueryOptions("report", session),
    enabled: Boolean(session) && ["admin", "accountant"].includes(activeRole),
  });

  const state = useMemo(
    () =>
      composeState({
        master: masterQuery.data,
        operations: operationsQuery.data,
        report: reportQuery.data,
      }),
    [masterQuery.data, operationsQuery.data, reportQuery.data],
  );

  const invalidateData = () =>
    queryClient.invalidateQueries({ queryKey: ["page-data"] });

  const mutationOptions = {
    onError: (error) => setToast(error.message),
    onSuccess: () => invalidateData(),
  };
  const receiptMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload) =>
      apiRequest("/receipts", { body: JSON.stringify(payload), method: "POST" }, session),
    onSuccess: () => {
      setToast("Nhập hàng thành công.");
      invalidateData();
    },
  });
  const dispatchMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload) =>
      apiRequest("/dispatches", { body: JSON.stringify(payload), method: "POST" }, session),
    onSuccess: () => {
      setToast("Xuất hàng thành công.");
      invalidateData();
    },
  });
  const masterMutation = useMutation({
    ...mutationOptions,
    mutationFn: ({ body, method, path }) =>
      apiRequest(path, { body: body ? JSON.stringify(body) : undefined, method }, session),
    onSuccess: () => {
      setToast("Danh mục đã được cập nhật.");
      invalidateData();
    },
  });
  const invoiceMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload) =>
      apiRequest(
        "/invoice-approvals",
        { body: JSON.stringify(payload), method: "POST" },
        session,
      ),
    onSuccess: () => {
      setToast("Xuất hóa đơn đã được ghi nhận.");
      invalidateData();
    },
  });

  const saveSession = (nextSession) => {
    const normalized = { ...nextSession, role: normalizeRole(nextSession.role) };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    setSession(normalized);
  };

  const navigate = (page) => {
    setMobileNavOpen(false);
    if (!pages[page]?.roles.includes(activeRole)) return;
    window.history.replaceState(null, "", `#${page}`);
    setActivePage(page);
  };

  if (!session) return <LoginScreen onLogin={saveSession} />;

  const visiblePage = pages[activePage].roles.includes(activeRole)
    ? activePage
    : "tong-quan";
  const page = pages[visiblePage];

  return (
    <main className={cn("app-grid", settings.density === "compact" && "text-[14px]")}>
      {toast ? (
        <div className="fixed right-4 top-4 z-[80] max-w-[calc(100vw-32px)] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
          {toast}
        </div>
      ) : null}
      <button
        aria-label={mobileNavOpen ? "Đóng điều hướng" : "Mở điều hướng"}
        className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-emerald-700 shadow-lg lg:hidden"
        onClick={() => setMobileNavOpen((value) => !value)}
        type="button"
      >
        {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {mobileNavOpen ? (
        <button
          aria-label="Đóng điều hướng"
          className="fixed inset-0 z-20 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}
      <Sidebar
        activePage={activePage}
        activeRole={activeRole}
        mobileNavOpen={mobileNavOpen}
        navigate={navigate}
        session={session}
        onLogout={() => {
          window.localStorage.removeItem(SESSION_KEY);
          setSession(null);
        }}
      />
      <section className="min-w-0 px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-8">
        <header className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-emerald-700">
              FET logistics
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {page.title}
            </h1>
            {visiblePage === "tong-quan" ? (
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  {page.subtitle}
                </p>
                <label className="w-full shrink-0 sm:w-32">
                  <span className="sr-only">Kỳ xem</span>
                  <Select
                    className="h-9 rounded-md px-2 text-sm"
                    value={overviewPeriod}
                    onChange={(event) => setOverviewPeriod(event.target.value)}
                  >
                    <option value="week">Tuần</option>
                    <option value="month">Tháng</option>
                    <option value="quarter">Quý</option>
                  </Select>
                </label>
              </div>
            ) : (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {page.subtitle}
              </p>
            )}
          </div>
          {visiblePage !== "tong-quan" ? (
            <Badge tone={operationsQuery.isFetching ? "amber" : "green"}>
              {operationsQuery.isFetching ? "Đang đồng bộ" : "Dữ liệu mới nhất"}
            </Badge>
          ) : null}
        </header>

        <div className={cn("grid gap-4", settings.density === "compact" ? "gap-3" : "gap-4")}>
          {visiblePage === "tong-quan" ? (
            <OverviewPage
              period={overviewPeriod}
              state={state}
              onSelectCustomer={(customer) => {
                setSelectedCustomer(customer);
                navigate("nhap-hang");
              }}
            />
          ) : null}
          {visiblePage === "nhap-hang" ? (
            <ReceiptPage
              mutation={receiptMutation}
              selectedCustomer={selectedCustomer}
              session={session}
              setSelectedCustomer={setSelectedCustomer}
              state={state}
            />
          ) : null}
          {visiblePage === "xuat-hang" ? (
            <DispatchPage
              mutation={dispatchMutation}
              selectedCustomer={selectedCustomer}
              session={session}
              setSelectedCustomer={setSelectedCustomer}
              state={state}
            />
          ) : null}
          {visiblePage === "bao-cao" ? (
            <ReportsPage mutation={invoiceMutation} session={session} state={state} />
          ) : null}
          {visiblePage === "quan-ly" ? (
            <ManagementPage mutation={masterMutation} state={state} />
          ) : null}
          {visiblePage === "cai-dat" ? (
            <SettingsPage settings={settings} setSettings={setSettings} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("admin");

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20">
              FET
            </div>
            <div>
              <CardTitle>Quản lý vận tải</CardTitle>
              <CardDescription>Đăng nhập thử nghiệm theo vai trò</CardDescription>
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-950">
            Chọn vai trò để vào hệ thống
          </h1>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onLogin({ name: name.trim() || "Người dùng mẫu", role });
            }}
          >
            <Field>
              Vai trò
              <Select value={role} onChange={(event) => setRole(event.target.value)}>
                {Object.entries(roles).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Tên hiển thị
              <Input
                placeholder="Nguyễn A"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Button type="submit">Đăng nhập</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Sidebar({ activePage, activeRole, mobileNavOpen, navigate, onLogout, session }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[min(300px,84vw)] -translate-x-full flex-col bg-slate-950 p-5 text-white shadow-2xl transition lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
        mobileNavOpen && "translate-x-0",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 text-sm font-black shadow-lg shadow-emerald-600/30">
          FET
        </div>
        <div>
          <strong className="block">Fast Effective</strong>
          <span className="text-sm text-white/60">Logistics SaaS</span>
        </div>
      </div>
      <nav className="mt-8 grid gap-1">
        {pageOrder.map((pageName) => {
          const item = pages[pageName];
          const Icon = iconMap[item.icon];
          const canAccess = item.roles.includes(activeRole);
          return (
            <button
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-white/68 transition",
                canAccess && "hover:bg-white/10 hover:text-white",
                activePage === pageName && "bg-white/15 text-white",
                !canAccess && "cursor-not-allowed opacity-40",
              )}
              disabled={!canAccess}
              key={pageName}
              onClick={() => navigate(pageName)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </button>
          );
        })}
      </nav>
      <button
        className="mt-auto grid gap-1 rounded-lg border border-white/10 bg-white/8 p-3 text-left hover:bg-white/12"
        onClick={onLogout}
        type="button"
      >
        <span className="truncate text-sm text-white/60">{session.name}</span>
        <strong className="truncate text-sm">{roles[activeRole]}</strong>
      </button>
    </aside>
  );
}

const overviewPeriodOptions = {
  month: { days: 31, label: "tháng" },
  quarter: { days: 90, label: "quý" },
  week: { days: 7, label: "tuần" },
};

function periodWindow(period) {
  const config = overviewPeriodOptions[period] || overviewPeriodOptions.week;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - config.days + 1);
  start.setHours(0, 0, 0, 0);
  return { ...config, end, start };
}

function dateInWindow(value, window) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(12, 0, 0, 0);
  return date >= window.start && date <= window.end;
}

function dateAtNoon(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(12, 0, 0, 0);
  return date;
}

function overviewStats(state, period) {
  const window = periodWindow(period);
  const received = state.invoice
    .filter((item) => dateInWindow(item.date, window))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const dispatched = state.dispatches
    .filter((item) => dateInWindow(item.date, window))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    dispatched,
    label: window.label,
    received,
    remaining: Math.max(received - dispatched, 0),
    window,
  };
}

function overviewTrend(state, period) {
  const window = periodWindow(period);
  const points = Array.from({ length: window.days }, (_, index) => {
    const date = new Date(window.start);
    date.setDate(window.start.getDate() + index);
    return {
      date,
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      quantity: 0,
    };
  });

  return points.map((point) => {
    const pointEnd = new Date(point.date);
    pointEnd.setHours(23, 59, 59, 999);
    const received = state.invoice
      .filter((item) => {
        const date = dateAtNoon(item.date);
        return date && date >= window.start && date <= pointEnd;
      })
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const dispatched = state.dispatches
      .filter((item) => {
        const date = dateAtNoon(item.date);
        return date && date >= window.start && date <= pointEnd;
      })
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    return {
      ...point,
      quantity: Math.max(received - dispatched, 0),
    };
  });
}

function OverviewPage({ onSelectCustomer, period, state }) {
  const [customerPage, setCustomerPage] = useState(1);
  const summaries = customerSummaries(state);
  const stats = overviewStats(state, period);
  const customerView = paginate(summaries, customerPage, 6);

  useEffect(() => {
    setCustomerPage(1);
  }, [summaries.length]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label={`Tổng hàng đã nhập trong ${stats.label}`} value={number(stats.received)} />
        <Metric label={`Đã xuất lên xe trong ${stats.label}`} tone="amber" value={number(stats.dispatched)} />
        <Metric label={`Còn trong kho trong ${stats.label}`} tone="green" value={number(stats.remaining)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan khách hàng</CardTitle>
            <CardDescription>
              Lượng hàng còn lại, số loại hàng và lần cập nhật gần nhất.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summaries.length ? (
                customerView.rows.map((summary) => (
                  <button
                    className="grid min-h-32 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                    key={summary.customer}
                    onClick={() => onSelectCustomer(summary.customer)}
                    type="button"
                  >
                    <span className="font-black text-slate-900">{summary.customer}</span>
                    <strong className="text-2xl font-black text-emerald-700">
                      {number(summary.totalQuantity)}
                    </strong>
                    <small className="text-sm leading-5 text-slate-500">
                      {summary.latestDate
                        ? `${summary.itemTypeCount} loại hàng - cập nhật ${formatDate(summary.latestDate)}`
                        : "Chưa có hàng trong kho"}
                    </small>
                  </button>
                ))
              ) : (
                <EmptyPanel text="Chưa có khách hàng đang có hàng trong kho." />
              )}
            </div>
            <Pagination
              page={customerView.page}
              pageCount={customerView.pageCount}
              onPageChange={setCustomerPage}
            />
          </CardContent>
        </Card>
        <InventoryChart period={period} state={state} />
      </div>
    </>
  );
}

function Metric({ label, tone = "default", value }) {
  return (
    <Card className={cn(tone === "green" && "border-emerald-200", tone === "amber" && "border-amber-200")}>
      <CardContent className="p-5">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <strong
          className={cn(
            "mt-2 block text-3xl font-black text-slate-950",
            tone === "green" && "text-emerald-700",
            tone === "amber" && "text-amber-700",
          )}
        >
          {value}
        </strong>
      </CardContent>
    </Card>
  );
}

function InventoryChart({ period, state }) {
  const data = overviewTrend(state, period);
  const stats = overviewStats(state, period);
  const last = data[data.length - 1]?.quantity || 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng tồn kho</CardTitle>
        <CardDescription>
          Tồn cuối {stats.label} <strong className="text-emerald-700">{number(last)}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data} margin={{ bottom: 6, left: -18, right: 10, top: 10 }}>
            <defs>
              <linearGradient id="stockGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} />
            <YAxis tickLine={false} />
            <Tooltip
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
              }}
              formatter={(value) => [number(value), "Tồn kho"]}
              labelFormatter={(value) => `Ngày ${value}`}
            />
            <Area
              dataKey="quantity"
              fill="url(#stockGradient)"
              stroke="#059669"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ReceiptPage({ mutation, selectedCustomer, session, setSelectedCustomer, state }) {
  const [form, setForm] = useState({
    customer: selectedCustomer,
    date: todayIso(),
    quantity: 100,
    sku: "",
    unit: "tấn",
  });
  const [summaryPage, setSummaryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const customers = allCustomers(state);
  const customer = form.customer || selectedCustomer;
  const summary = paginate(receiptSummaryRows(state, customer), summaryPage);
  const history = paginate(
    state.invoice.filter((item) => item.customer === customer).sort(dateComparator("desc")),
    historyPage,
  );

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  return (
    <div className="grid gap-4">
      <div className="grid items-stretch gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Ghi nhận hàng nhập</CardTitle>
          <CardDescription>Chọn khách hàng và thêm từng loại hàng vào kho.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const customerName = form.customer.trim();
              mutation.mutate({
                customerName,
                date: form.date,
                items: [
                  {
                    quantity: Number(form.quantity),
                    sku: normalizeSku(form.sku),
                    unit: form.unit.trim(),
                  },
                ],
                receivedByName: session?.name || "Thủ kho mẫu",
              });
              setSelectedCustomer(customerName);
              setForm((current) => ({ ...current, quantity: 100, sku: "", unit: "tấn" }));
            }}
          >
            <Field>
              Ngày nhập kho
              <Input
                required
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </Field>
            <Field>
              Khách hàng
              <Input
                list="customers"
                required
                value={form.customer}
                onChange={(event) => {
                  setForm({ ...form, customer: event.target.value });
                  setSelectedCustomer(event.target.value);
                }}
              />
              <datalist id="customers">
                {customers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
            <Field>
              Loại hàng
              <Input
                placeholder="A"
                required
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                Số lượng nhập
                <Input
                  min="1"
                  required
                  type="number"
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                />
              </Field>
              <Field>
                Đơn vị
                <Input
                  required
                  value={form.unit}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                />
              </Field>
            </div>
            <Button disabled={mutation.isPending} type="submit">
              Nhập hàng
            </Button>
          </form>
        </CardContent>
      </Card>
        <DataTableCard
          className="h-full"
          description={customer ? `${summary.rows.length} dòng đang hiển thị` : "Chọn khách hàng để xem tổng hợp."}
          title={customer ? `Tổng hợp hàng nhập - ${customer}` : "Tổng hợp hàng nhập"}
        >
          <Table>
            <thead>
              <tr>
                <Th>Loại hàng</Th>
                <Th>Tổng số lượng</Th>
                <Th>Đơn vị</Th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.length ? (
                summary.rows.map((row) => (
                  <tr key={`${row.sku}-${row.unit}`}>
                    <Td><strong>{row.sku}</strong></Td>
                    <Td>{number(row.quantity)}</Td>
                    <Td>{row.unit}</Td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={3}>Khách hàng này chưa có dữ liệu nhập hàng.</EmptyRow>
              )}
            </tbody>
          </Table>
          <Pagination page={summary.page} pageCount={summary.pageCount} onPageChange={setSummaryPage} />
        </DataTableCard>
      </div>
        <DataTableCard title="Lịch sử nhập hàng" description="Theo dõi từng lần nhập hàng.">
          <Table>
            <thead>
              <tr>
                <Th>Ngày nhập</Th>
                <Th>Loại hàng</Th>
                <Th>Số lượng</Th>
                <Th>Đơn vị</Th>
              </tr>
            </thead>
            <tbody>
              {history.rows.length ? (
                history.rows.map((row) => (
                  <tr key={row.id}>
                    <Td>{formatDate(row.date)}</Td>
                    <Td><strong>{row.sku}</strong></Td>
                    <Td>{number(row.quantity)}</Td>
                    <Td>{row.unit}</Td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={4}>Khách hàng này chưa có lịch sử nhập hàng.</EmptyRow>
              )}
            </tbody>
          </Table>
          <Pagination page={history.page} pageCount={history.pageCount} onPageChange={setHistoryPage} />
        </DataTableCard>
    </div>
  );
}

function DispatchPage({ mutation, selectedCustomer, session, setSelectedCustomer, state }) {
  const availableRows = stockRows(state);
  const [form, setForm] = useState({
    customer: selectedCustomer,
    date: todayIso(),
    driver: "",
    quantity: "",
    sku: "",
    truck: "",
  });
  const [filters, setFilters] = useState({ date: "", driver: "", truck: "" });
  const [page, setPage] = useState(1);

  const customerStock = availableRows.filter((row) => row.customer === form.customer);
  const selectedStock =
    customerStock.find((row) => row.sku === form.sku) || customerStock[0];

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedStock) return;
    setForm((current) => ({
      ...current,
      quantity: current.sku === selectedStock.sku ? current.quantity : selectedStock.remainingQuantity,
      sku: current.sku || selectedStock.sku,
    }));
  }, [selectedStock?.sku]);

  const rows = state.dispatches
    .filter((item) => !filters.date || item.date === filters.date)
    .filter((item) => !filters.truck || item.truck === filters.truck)
    .filter((item) => !filters.driver || item.driver === filters.driver)
    .sort(dateComparator("desc"));
  const dispatchPage = paginate(rows, page);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tạo phiếu xuất hàng</CardTitle>
          <CardDescription>Chọn khách hàng, xe, tài xế và lượng hàng cần xuất.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 lg:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const customerName = form.customer.trim();
              const stock = customerStock.find((row) => row.sku === form.sku);
              mutation.mutate({
                customerName,
                date: form.date,
                driverName: form.driver,
                items: [
                  {
                    quantity: Number(form.quantity),
                    sku: normalizeSku(form.sku),
                    unit: stock?.unit || "đơn vị",
                  },
                ],
                plate: form.truck,
                warehouseName: session?.name || "Thủ kho mẫu",
              });
              setSelectedCustomer(customerName);
              setFilters({ date: "", driver: "", truck: "" });
              setPage(1);
            }}
          >
            <Field>
              Ngày xuất
              <Input
                required
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </Field>
            <Field>
              Khách hàng
              <Select
                required
                value={form.customer}
                onChange={(event) => {
                  setSelectedCustomer(event.target.value);
                  setForm({ ...form, customer: event.target.value, quantity: "", sku: "" });
                }}
              >
                <option value="">Chọn khách hàng</option>
                {allCustomers(state).map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Xe
              <Select
                required
                value={form.truck}
                onChange={(event) => setForm({ ...form, truck: event.target.value })}
              >
                <option value="">Chọn xe</option>
                {state.vehicles.map((truck) => (
                  <option key={truck} value={truck}>
                    {truck}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Tài xế
              <Select
                required
                value={form.driver}
                onChange={(event) => setForm({ ...form, driver: event.target.value })}
              >
                <option value="">Chọn tài xế</option>
                {state.drivers.map((driver) => (
                  <option key={driver} value={driver}>
                    {driver}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Loại hàng
              <Select
                required
                value={form.sku}
                onChange={(event) => {
                  const next = customerStock.find((row) => row.sku === event.target.value);
                  setForm({
                    ...form,
                    quantity: next?.remainingQuantity || "",
                    sku: event.target.value,
                  });
                }}
              >
                <option value="">Chọn loại hàng</option>
                {customerStock.map((row) => (
                  <option key={`${row.customer}-${row.sku}`} value={row.sku}>
                    {row.sku} - còn {number(row.remainingQuantity)} {row.unit}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Số lượng
              <Input
                max={selectedStock?.remainingQuantity || undefined}
                min="1"
                required
                type="number"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              />
            </Field>
            <Button className="lg:col-span-2" disabled={mutation.isPending} type="submit">
              Xuất hàng
            </Button>
          </form>
        </CardContent>
      </Card>
      <DataTableCard
        description="Lọc nhanh các chuyến đã xuất theo ngày, xe và tài xế."
        title="Lịch sử xuất hàng"
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Field>
            Ngày xuất
            <Input
              type="date"
              value={filters.date}
              onChange={(event) => {
                setFilters({ ...filters, date: event.target.value });
                setPage(1);
              }}
            />
          </Field>
          <Field>
            Xe
            <Select
              value={filters.truck}
              onChange={(event) => {
                setFilters({ ...filters, truck: event.target.value });
                setPage(1);
              }}
            >
              <option value="">Tất cả xe</option>
              {state.vehicles.map((truck) => (
                <option key={truck} value={truck}>
                  {truck}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Tài xế
            <Select
              value={filters.driver}
              onChange={(event) => {
                setFilters({ ...filters, driver: event.target.value });
                setPage(1);
              }}
            >
              <option value="">Tất cả tài xế</option>
              {state.drivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            className="self-end"
            onClick={() => {
              setFilters({ date: "", driver: "", truck: "" });
              setPage(1);
            }}
            type="button"
          >
            Xem tất cả
          </Button>
        </div>
        <DispatchTable rows={dispatchPage.rows} />
        <Pagination page={dispatchPage.page} pageCount={dispatchPage.pageCount} onPageChange={setPage} />
      </DataTableCard>
    </div>
  );
}

function DispatchTable({ rows }) {
  return (
    <Table className="responsive-record-table">
      <thead>
        <tr>
          <Th>Ngày xuất</Th>
          <Th>Khách hàng</Th>
          <Th>Xe</Th>
          <Th>Tài xế</Th>
          <Th>Loại hàng</Th>
          <Th>Số lượng</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((item) => (
            <tr key={item.id}>
              <Td data-label="Ngày xuất">{formatDate(item.date)}</Td>
              <Td data-label="Khách hàng">{item.customer}</Td>
              <Td data-label="Xe"><strong>{item.truck}</strong></Td>
              <Td data-label="Tài xế">{item.driver}</Td>
              <Td data-label="Loại hàng">{item.sku}</Td>
              <Td data-label="Số lượng">{number(item.quantity)}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={6}>Chưa có lịch sử xuất hàng phù hợp với bộ lọc hiện tại.</EmptyRow>
        )}
      </tbody>
    </Table>
  );
}

function ReportsPage({ mutation, session, state }) {
  const [selected, setSelected] = useState("");
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const rows = reportRows(state);
  const current = selected || rows[0]?.customer || "";
  const history = state.dispatches
    .filter((item) => item.customer === current)
    .sort(dateComparator("desc"));
  const invoiceHistory = [...state.invoiceApprovals].sort(dateComparator("desc"));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Khách hàng đủ điều kiện xuất hóa đơn</CardTitle>
          <CardDescription>Chỉ hiển thị khách hàng đã xuất hết hàng.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.length ? (
              rows.map((row) => (
                <article
                  className={cn(
                    "grid min-h-32 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50",
                    current === row.customer && "border-emerald-400 bg-emerald-50",
                  )}
                  key={row.customer}
                >
                  <button
                    className="grid gap-2 text-left"
                    onClick={() => setSelected(row.customer)}
                    type="button"
                  >
                    <strong className="text-slate-950">{row.customer}</strong>
                    <span className="text-sm text-slate-500">
                      {row.historyCount} lần xuất hàng
                    </span>
                  </button>
                  <span className="text-sm text-slate-500">
                    {row.itemTypeCount} loại hàng đã hoàn tất
                  </span>
                  <Button
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmCustomer(row);
                    }}
                    type="button"
                  >
                    Xuất hóa đơn
                  </Button>
                </article>
              ))
            ) : (
              <EmptyPanel text="Chưa có khách hàng hoàn thành để xuất hóa đơn." />
            )}
          </div>
        </CardContent>
      </Card>
      <DataTableCard title="Lịch sử xuất hàng" description="Dữ liệu phục vụ đối soát hóa đơn.">
        <DispatchTable rows={history} />
      </DataTableCard>
      <DataTableCard title="Lịch sử xuất hóa đơn" description="Các khách hàng đã được ghi nhận.">
        <Table>
          <thead>
            <tr>
              <Th>Ngày</Th>
              <Th>Khách hàng</Th>
              <Th>Trạng thái</Th>
            </tr>
          </thead>
          <tbody>
            {invoiceHistory.length ? (
              invoiceHistory.map((item) => (
                <tr key={item.id}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.customer}</Td>
                  <Td><Badge tone="green">{item.status || "Hoàn thành"}</Badge></Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={3}>Chưa có lịch sử xuất hóa đơn.</EmptyRow>
            )}
          </tbody>
        </Table>
      </DataTableCard>
      <Dialog open={Boolean(confirmCustomer)} onOpenChange={(open) => !open && setConfirmCustomer(null)}>
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Xuất hóa đơn cho {confirmCustomer?.customer}?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Sau khi đồng ý, khách hàng sẽ được ghi nhận vào lịch sử xuất hóa đơn.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Hủy</Button>
            </DialogClose>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate({
                  approvedByName: session?.name || "Kế toán mẫu",
                  customerId:
                    confirmCustomer.customerId ||
                    state.customerIds[confirmCustomer.customer],
                  status: "Hoàn thành",
                });
                setConfirmCustomer(null);
              }}
              type="button"
            >
              Đồng ý
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const masterSections = [
  {
    description: "Nguồn chọn khách hàng cho nhập kho, xuất hàng và báo cáo.",
    icon: Users,
    label: "Khách hàng",
    listName: "customers",
    placeholder: "Tên khách hàng",
  },
  {
    description: "Danh sách biển số xe dùng khi tạo phiếu xuất hàng.",
    icon: Car,
    label: "Xe vận chuyển",
    listName: "vehicles",
    placeholder: "Biển số xe",
  },
  {
    description: "Danh sách tài xế được đồng bộ vào phiếu xuất hàng.",
    icon: UserRound,
    label: "Tài xế",
    listName: "drivers",
    placeholder: "Tên tài xế",
  },
];

function ManagementPage({ mutation, state }) {
  const [activeList, setActiveList] = useState("customers");
  const activeSection = masterSections.find((item) => item.listName === activeList);
  const recordsByList = {
    customers: state.customerRecords,
    drivers: state.driverRecords,
    vehicles: state.vehicleRecords,
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {masterSections.map((section) => {
          const Icon = section.icon;
          const count = recordsByList[section.listName]?.length || 0;
          const isActive = section.listName === activeList;
          return (
            <button
              className={cn(
                "grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50",
                isActive && "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100",
              )}
              key={section.listName}
              onClick={() => setActiveList(section.listName)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge tone={isActive ? "green" : "default"}>{count} mục</Badge>
              </div>
              <div>
                <strong className="block text-base font-black text-slate-950">
                  {section.label}
                </strong>
                <span className="mt-1 block text-sm leading-5 text-slate-500">
                  {section.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <MasterSection
        config={activeSection}
        mutation={mutation}
        records={recordsByList[activeSection.listName] || []}
      />
    </div>
  );
}

function MasterSection({ config, mutation, records }) {
  const { icon: Icon, label, listName, placeholder } = config;
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const path = {
    customers: "/customers",
    drivers: "/drivers",
    vehicles: "/vehicles",
  }[listName];
  const payload = (nextValue) =>
    listName === "vehicles" ? { plate: nextValue.toUpperCase() } : { name: nextValue.trim() };
  const filteredRecords = records.filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const recordView = paginate(filteredRecords, page, 10);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [listName]);

  useEffect(() => {
    setPage(1);
  }, [search, records.length]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle>Quản lý {label}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <Badge tone="green">{filteredRecords.length} / {records.length} mục</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:p-5">
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!value.trim()) return;
            mutation.mutate({ body: payload(value), method: "POST", path });
            setValue("");
          }}
        >
          <Field>
            Thêm {label.toLowerCase()}
            <Input
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <Button className="self-end" disabled={mutation.isPending} type="submit">
            <Plus className="h-4 w-4" />
            Thêm
          </Button>
        </form>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder={`Tìm ${label.toLowerCase()}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <span className="text-sm font-semibold text-slate-500">
            Cập nhật danh mục sẽ đồng bộ vào dropdown nghiệp vụ.
          </span>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>{label}</Th>
              <Th>Trạng thái</Th>
              <Th>Cập nhật</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length ? (
              recordView.rows.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <strong className="min-w-0 truncate text-slate-900">{item.label}</strong>
                    </div>
                  </Td>
                  <Td><Badge tone="green">Đang dùng</Badge></Td>
                  <Td>{formatDate(item.updatedAt || item.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button
                        aria-label={`Sửa ${item.label}`}
                        size="icon"
                        title="Sửa"
                        type="button"
                        variant="outline"
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Xóa ${item.label}`}
                        size="icon"
                        title="Xóa"
                        type="button"
                        variant="destructive"
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>
                {records.length
                  ? "Không tìm thấy mục phù hợp."
                  : `Chưa có ${label.toLowerCase()}.`}
              </EmptyRow>
            )}
          </tbody>
        </Table>
        <Pagination
          page={recordView.page}
          pageCount={recordView.pageCount}
          onPageChange={setPage}
        />
      </CardContent>
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">Sửa {label}</DialogTitle>
          <EditMasterForm
            initialValue={editing?.label || ""}
            isPending={mutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(nextValue) => {
              mutation.mutate({
                body: payload(nextValue),
                method: "PATCH",
                path: `${path}/${editing.id}`,
              });
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">Xóa {deleting?.label}?</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Danh mục này sẽ không còn xuất hiện trong dropdown mới.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeleting(null)} type="button" variant="secondary">Hủy</Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate({ method: "DELETE", path: `${path}/${deleting.id}` });
                setDeleting(null);
              }}
              type="button"
              variant="destructive"
            >
              Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditMasterForm({ initialValue, isPending, onCancel, onSubmit }) {
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
      <Input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="secondary">Hủy</Button>
        <Button disabled={isPending} type="submit">Lưu</Button>
      </div>
    </form>
  );
}

function SettingsPage({ settings, setSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tùy chỉnh giao diện</CardTitle>
        <CardDescription>Giữ UI sạch, dày dữ liệu và dễ đọc trong kho.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field>
          Mật độ hiển thị
          <Select
            value={settings.density}
            onChange={(event) => setSettings({ ...settings, density: event.target.value })}
          >
            <option value="comfortable">Vừa</option>
            <option value="compact">Gọn</option>
          </Select>
        </Field>
        <Field>
          Tông màu
          <Select
            value={settings.accent}
            onChange={(event) => setSettings({ ...settings, accent: event.target.value })}
          >
            <option value="emerald">Xanh ngọc</option>
            <option value="slate">Trung tính</option>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}

function DataTableCard({ children, className, description, title }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyPanel({ text }) {
  return (
    <div className="col-span-full grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}
