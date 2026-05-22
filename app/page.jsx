"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Car,
  ChevronRight,
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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  formatDateTime,
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyRow, Table, Td, Th } from "@/components/ui/table";

const SESSION_KEY = "fet-logistics-session";
const pageOrder = [
  "tong-quan",
  "nhap-hang",
  "xuat-hang",
  "bao-cao",
  "quan-ly",
  "cai-dat",
];
const iconMap = {
  FileCheck2,
  LayoutDashboard,
  PackagePlus,
  Settings2,
  SlidersHorizontal,
  Truck,
};

const emptyState = composeState({});
const primaryActionButtonShellClass =
  "w-[clamp(10rem,34%,14rem)] max-w-full justify-self-center";
const operationActionButtonShellClass =
  "w-[clamp(20rem,68%,28rem)] max-w-full justify-self-center";

function number(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function compactAxisNumber(value) {
  const numericValue = Number(value || 0);
  const absoluteValue = Math.abs(numericValue);

  if (absoluteValue >= 1_000_000) {
    return `${number(Math.round(numericValue / 100_000) / 10)}tr`;
  }
  if (absoluteValue >= 1_000) {
    return `${number(Math.round(numericValue / 100) / 10)}k`;
  }
  return number(numericValue);
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

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        height: Math.floor(entry.contentRect.height),
        width: Math.floor(entry.contentRect.width),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
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

const dataTableConfigs = {
  dispatch: {
    columns: ["13%", "19%", "15%", "16%", "23%", "7%", "7%"],
    width: "min-w-[960px]",
  },
  invoice: {
    columns: ["18%", "30%", "32%", "20%"],
    width: "min-w-[720px]",
  },
  management: {
    columns: ["46%", "18%", "20%", "16%"],
    width: "min-w-[760px]",
  },
  receiptHistory: {
    columns: ["20%", "44%", "18%", "18%"],
    width: "min-w-[720px]",
  },
  receiptSummary: {
    columns: ["45%", "32%", "23%"],
    width: "min-w-[620px]",
  },
};

function DataTable({ children, className, width = "dispatch" }) {
  const config = dataTableConfigs[width] || dataTableConfigs.dispatch;
  return (
    <Table
      className={cn(
        config.width,
        "fixed-data-table table-fixed whitespace-nowrap",
        className,
      )}
    >
      <colgroup>
        {config.columns.map((columnWidth, index) => (
          <col key={`${width}-${index}`} style={{ width: columnWidth }} />
        ))}
      </colgroup>
      {children}
    </Table>
  );
}

function PeriodSelect({ value, onChange, className }) {
  return (
    <div className={cn("relative w-full shrink-0 sm:w-36", className)}>
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
      <Select
        className="h-9 rounded-md py-0 pl-9 pr-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="week">Tuần</option>
        <option value="month">Tháng</option>
        <option value="quarter">Quý</option>
      </Select>
    </div>
  );
}

function LoadingSkeleton({ page }) {
  if (page === "tong-quan") {
    return (
      <>
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-3 h-9 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <Skeleton className="h-32 rounded-lg" key={item} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="h-[320px]">
              <Skeleton className="h-full w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (page === "quan-ly") {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (page === "bao-cao") {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton className="h-40 rounded-lg" key={item} />
              ))}
            </div>
          </CardContent>
        </Card>
        <TableSkeleton columns={6} rows={4} title="Lịch sử xuất hàng" />
        <TableSkeleton columns={3} rows={4} title="Lịch sử xuất hóa đơn" />
      </div>
    );
  }

  if (page === "nhap-hang") {
    return (
      <div className="grid gap-4">
        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <FormSkeleton title="Ghi nhận hàng nhập" fields={5} />
          <TableSkeleton columns={3} rows={5} title="Tổng hợp hàng nhập" />
        </div>
        <TableSkeleton columns={4} rows={5} title="Lịch sử nhập hàng" />
      </div>
    );
  }

  if (page === "xuat-hang") {
    return (
      <div className="grid gap-4">
        <FormSkeleton title="Tạo phiếu xuất hàng" fields={7} />
        <TableSkeleton columns={6} rows={5} title="Lịch sử xuất hàng" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  );
}

function FormSkeleton({ fields = 4, title }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: fields }).map((_, index) => (
            <div className="grid gap-2" key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton
            className={cn(
              "h-11 lg:col-span-2",
              operationActionButtonShellClass,
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ columns = 4, rows = 5, title }) {
  return (
    <DataTableCard description=" " title={title}>
      <div className="grid max-w-full gap-3 overflow-x-auto overscroll-x-contain">
        <div
          className="grid min-w-max gap-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(88px, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton className="h-4" key={index} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            className="grid min-w-max gap-3 border-t border-slate-100 pt-3"
            key={rowIndex}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(88px, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                className={cn(
                  "h-5",
                  columnIndex === 0 && "w-20",
                  columnIndex === columns - 1 && "w-16",
                )}
                key={columnIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </DataTableCard>
  );
}

function prependById(rows = [], item) {
  if (!item?.id) return rows;
  return [item, ...rows.filter((row) => row.id !== item.id)];
}

function upsertById(rows = [], item) {
  if (!item?.id) return rows;
  const exists = rows.some((row) => row.id === item.id);
  const nextRows = exists
    ? rows.map((row) => (row.id === item.id ? { ...row, ...item } : row))
    : [...rows, item];
  return nextRows.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
}

function normalizeMasterItem(item, listName) {
  const label = item?.label || item?.name || item?.plate || "";
  return {
    createdAt: item?.createdAt || item?.created_at,
    id: item?.id,
    isActive: item?.isActive ?? item?.is_active ?? true,
    label,
    updatedAt:
      item?.updatedAt ||
      item?.updated_at ||
      item?.createdAt ||
      item?.created_at,
  };
}

function masterListFromPath(path = "") {
  return path.split("/").filter(Boolean)[0];
}

function addMasterRecord(master, listName, item) {
  const normalized = normalizeMasterItem(item, listName);
  if (!normalized.id || !normalized.label) return master;
  return {
    ...master,
    [listName]: upsertById(master?.[listName] || [], normalized),
  };
}

function removeMasterRecord(master, listName, id) {
  return {
    ...master,
    [listName]: (master?.[listName] || []).filter((item) => item.id !== id),
  };
}

function applyReceiptInventory(inventory = [], receipt) {
  let nextInventory = inventory;
  (receipt.items || []).forEach((item) => {
    const quantity = Number(item.quantity || 0);
    let touched = false;
    nextInventory = nextInventory.map((row) => {
      const sameCustomer =
        row.customerId === receipt.customerId ||
        row.customer === receipt.customer;
      if (!sameCustomer || row.sku !== item.sku) return row;
      touched = true;
      return {
        ...row,
        receivedQuantity: Number(row.receivedQuantity || 0) + quantity,
        remainingQuantity: Number(row.remainingQuantity || 0) + quantity,
        unit: item.unit || row.unit,
      };
    });
    if (!touched) {
      nextInventory = [
        ...nextInventory,
        {
          customer: receipt.customer,
          customerId: receipt.customerId,
          dispatchedQuantity: 0,
          receivedQuantity: quantity,
          remainingQuantity: quantity,
          sku: item.sku,
          unit: item.unit || "đơn vị",
        },
      ];
    }
  });
  return nextInventory;
}

function applyDispatchInventory(inventory = [], dispatch) {
  let nextInventory = inventory;
  (dispatch.items || []).forEach((item) => {
    const quantity = Number(item.quantity || 0);
    nextInventory = nextInventory.map((row) => {
      const sameCustomer =
        row.customerId === dispatch.customerId ||
        row.customer === dispatch.customer;
      if (!sameCustomer || row.sku !== item.sku) return row;
      return {
        ...row,
        dispatchedQuantity: Number(row.dispatchedQuantity || 0) + quantity,
        remainingQuantity: Math.max(
          Number(row.remainingQuantity || 0) - quantity,
          0,
        ),
      };
    });
  });
  return nextInventory;
}

function receiptMasterRecord(receipt) {
  return {
    createdAt: receipt.createdAt,
    id: receipt.customerId,
    label: receipt.customer,
    updatedAt: receipt.createdAt,
  };
}

function dispatchMasterRecords(dispatch) {
  return {
    customer: {
      createdAt: dispatch.createdAt,
      id: dispatch.customerId,
      label: dispatch.customer,
      updatedAt: dispatch.createdAt,
    },
    driver: {
      createdAt: dispatch.createdAt,
      id: dispatch.driverId,
      label: dispatch.driver,
      updatedAt: dispatch.createdAt,
    },
    vehicle: {
      createdAt: dispatch.createdAt,
      id: dispatch.vehicleId,
      label: dispatch.plate,
      updatedAt: dispatch.createdAt,
    },
  };
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
  const visiblePage = pages[activePage]?.roles.includes(activeRole)
    ? activePage
    : "tong-quan";
  const needsMaster = visiblePage !== "cai-dat";
  const needsOperations = [
    "tong-quan",
    "nhap-hang",
    "xuat-hang",
    "bao-cao",
  ].includes(visiblePage);
  const canReadReport = ["admin", "accountant"].includes(activeRole);
  const needsReport =
    canReadReport && ["tong-quan", "bao-cao"].includes(visiblePage);
  const operationsPage =
    visiblePage === "nhap-hang"
      ? "receipt"
      : visiblePage === "xuat-hang"
        ? "dispatch"
        : "operations";
  const masterQuery = useQuery({
    ...pageQueryOptions("master", session),
    enabled: Boolean(session) && needsMaster,
  });
  const operationsQuery = useQuery({
    ...pageQueryOptions(operationsPage, session),
    enabled: Boolean(session) && needsOperations,
  });
  const reportQuery = useQuery({
    ...pageQueryOptions("report", session),
    enabled: Boolean(session) && needsReport,
  });
  const isMasterLoading =
    needsMaster && !masterQuery.data && masterQuery.isPending;
  const isOperationsLoading =
    needsOperations && !operationsQuery.data && operationsQuery.isPending;
  const isReportLoading =
    needsReport && !reportQuery.data && reportQuery.isPending;
  const isPageLoading =
    isMasterLoading || isOperationsLoading || isReportLoading;

  const state = useMemo(
    () =>
      composeState({
        master: masterQuery.data,
        operations: operationsQuery.data,
        report: reportQuery.data,
      }),
    [masterQuery.data, operationsQuery.data, reportQuery.data],
  );

  const pageDataKey = (pageName) => [
    "page-data",
    pageName,
    session?.role,
    session?.name,
  ];
  const updatePageData = (pageName, updater) => {
    queryClient.setQueryData(pageDataKey(pageName), (current) =>
      current ? updater(current) : current,
    );
  };
  const markPagesStale = (pageNames) => {
    pageNames.forEach((pageName) => {
      queryClient.invalidateQueries({
        queryKey: ["page-data", pageName],
        refetchType: "all",
      });
    });
  };

  const mutationOptions = {
    onError: (error) => setToast(error.message),
  };
  const receiptMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload) =>
      apiRequest(
        "/receipts",
        { body: JSON.stringify(payload), method: "POST" },
        session,
      ),
    onSuccess: (receipt) => {
      updatePageData("operations", (data) => ({
        ...data,
        inventory: applyReceiptInventory(data.inventory || [], receipt),
        receipts: prependById(data.receipts || [], receipt),
      }));
      updatePageData("receipt", (data) => ({
        ...data,
        inventory: applyReceiptInventory(data.inventory || [], receipt),
        receipts: prependById(data.receipts || [], receipt),
      }));
      updatePageData("master", (data) =>
        addMasterRecord(data, "customers", receiptMasterRecord(receipt)),
      );
      markPagesStale(["master", "operations", "receipt", "dispatch", "report"]);
      setToast("Nhập hàng thành công.");
    },
  });
  const dispatchMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload) =>
      apiRequest(
        "/dispatches",
        { body: JSON.stringify(payload), method: "POST" },
        session,
      ),
    onSuccess: (dispatch) => {
      const records = dispatchMasterRecords(dispatch);
      updatePageData("operations", (data) => ({
        ...data,
        dispatches: prependById(data.dispatches || [], dispatch),
        inventory: applyDispatchInventory(data.inventory || [], dispatch),
      }));
      updatePageData("dispatch", (data) => ({
        ...data,
        dispatches: prependById(data.dispatches || [], dispatch),
        inventory: applyDispatchInventory(data.inventory || [], dispatch),
      }));
      updatePageData("master", (data) =>
        addMasterRecord(
          addMasterRecord(
            addMasterRecord(data, "customers", records.customer),
            "vehicles",
            records.vehicle,
          ),
          "drivers",
          records.driver,
        ),
      );
      markPagesStale(["master", "operations", "receipt", "dispatch", "report"]);
      setToast("Xuất hàng thành công.");
    },
  });
  const masterMutation = useMutation({
    ...mutationOptions,
    mutationFn: ({ body, method, path }) =>
      apiRequest(
        path,
        { body: body ? JSON.stringify(body) : undefined, method },
        session,
      ),
    onSuccess: (item, variables) => {
      const listName = masterListFromPath(variables.path);
      updatePageData("master", (data) => {
        if (variables.method === "DELETE") {
          const id = variables.path.split("/").filter(Boolean)[1];
          return removeMasterRecord(data, listName, id);
        }
        return addMasterRecord(data, listName, item);
      });
      markPagesStale(["master", "operations", "receipt", "dispatch", "report"]);
      setToast("Danh mục đã được cập nhật.");
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
    onSuccess: (approval, payload) => {
      const customer =
        state.customerRecords.find((item) => item.id === payload.customerId)
          ?.label ||
        state.billingReady.find(
          (item) => item.customerId === payload.customerId,
        )?.customer ||
        "";
      const invoiceApproval = {
        approvedByName:
          payload.approvedByName || session?.name || "Kế toán mẫu",
        customer,
        customerId: payload.customerId,
        date: approval.approval_date || approval.date || todayIso(),
        id: approval.id,
        periodClosedAt:
          approval.period_closed_at || approval.periodClosedAt || payload.periodClosedAt,
        periodEnd: approval.period_end || approval.periodEnd || payload.periodEnd,
        periodStart:
          approval.period_start || approval.periodStart || payload.periodStart,
        status: approval.status || payload.status,
      };
      updatePageData("report", (data) => ({
        ...data,
        billingReady: (data.billingReady || []).filter(
          (item) =>
            item.customerId !== payload.customerId ||
            new Date(item.periodClosedAt || "").getTime() !==
              new Date(payload.periodClosedAt || "").getTime(),
        ),
        invoiceApprovals: prependById(
          data.invoiceApprovals || [],
          invoiceApproval,
        ),
      }));
      markPagesStale(["report"]);
      setToast("Xuất hóa đơn đã được ghi nhận.");
    },
  });

  const saveSession = (nextSession) => {
    const normalized = {
      ...nextSession,
      role: normalizeRole(nextSession.role),
    };
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

  const page = pages[visiblePage];

  return (
    <main
      className={cn(
        "app-grid",
        settings.density === "compact" && "text-[14px]",
      )}
    >
      {toast ? (
        <div className="fixed right-4 top-4 z-[80] max-w-[calc(100vw-32px)] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
          {toast}
        </div>
      ) : null}
      <button
        aria-label={mobileNavOpen ? "Đóng điều hướng" : "Mở điều hướng"}
        className={cn(
          "fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-emerald-700 shadow-lg transition lg:hidden",
          mobileNavOpen && "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileNavOpen((value) => !value)}
        type="button"
      >
        {mobileNavOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
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
                <p className="max-w-3xl text-sm leading-6 text-slate-500">
                  {page.subtitle}
                </p>
                <PeriodSelect
                  value={overviewPeriod}
                  onChange={setOverviewPeriod}
                />
              </div>
            ) : (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {page.subtitle}
              </p>
            )}
          </div>
          {visiblePage !== "tong-quan" ? (
            isPageLoading ? (
              <Skeleton className="h-7 w-28 justify-self-end self-end rounded-full" />
            ) : (
              <Badge
                className="w-fit justify-self-end self-end"
                tone={operationsQuery.isFetching ? "amber" : "green"}
              >
                {operationsQuery.isFetching
                  ? "Đang đồng bộ"
                  : "Dữ liệu mới nhất"}
              </Badge>
            )
          ) : null}
        </header>

        <div
          className={cn(
            "grid gap-4",
            settings.density === "compact" ? "gap-3" : "gap-4",
          )}
        >
          {isPageLoading ? <LoadingSkeleton page={visiblePage} /> : null}
          {!isPageLoading && visiblePage === "tong-quan" ? (
            <OverviewPage
              period={overviewPeriod}
              state={state}
              onSelectCustomer={(customer) => {
                setSelectedCustomer(customer);
                navigate("nhap-hang");
              }}
            />
          ) : null}
          {!isPageLoading && visiblePage === "nhap-hang" ? (
            <ReceiptPage
              mutation={receiptMutation}
              selectedCustomer={selectedCustomer}
              session={session}
              setSelectedCustomer={setSelectedCustomer}
              state={state}
            />
          ) : null}
          {!isPageLoading && visiblePage === "xuat-hang" ? (
            <DispatchPage
              mutation={dispatchMutation}
              selectedCustomer={selectedCustomer}
              session={session}
              setSelectedCustomer={setSelectedCustomer}
              state={state}
            />
          ) : null}
          {!isPageLoading && visiblePage === "bao-cao" ? (
            <ReportsPage
              mutation={invoiceMutation}
              session={session}
              state={state}
            />
          ) : null}
          {!isPageLoading && visiblePage === "quan-ly" ? (
            <ManagementPage mutation={masterMutation} state={state} />
          ) : null}
          {!isPageLoading && visiblePage === "cai-dat" ? (
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
              <CardDescription>
                Đăng nhập thử nghiệm theo vai trò
              </CardDescription>
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
              <Select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
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

function Sidebar({
  activePage,
  activeRole,
  mobileNavOpen,
  navigate,
  onLogout,
  session,
}) {
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

function periodLabel(period) {
  return (
    overviewPeriodOptions[period]?.label || overviewPeriodOptions.week.label
  );
}

function periodDescription(prefix, period) {
  return `${prefix} trong ${periodLabel(period)}.`;
}

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

function chartDateLabel(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function chartDayLabel(date) {
  return String(date.getDate()).padStart(2, "0");
}

function overviewBuckets(period) {
  const window = periodWindow(period);
  const bucketDays = period === "quarter" ? 7 : 1;
  const buckets = [];
  const cursor = new Date(window.start);

  while (cursor <= window.end) {
    const start = new Date(cursor);
    const end = new Date(start);
    end.setDate(start.getDate() + bucketDays - 1);
    end.setHours(23, 59, 59, 999);
    if (end > window.end) end.setTime(window.end.getTime());

    buckets.push({
      count: 0,
      end,
      label: period === "week" ? chartDayLabel(start) : chartDateLabel(start),
      rangeLabel:
        bucketDays === 1
          ? chartDateLabel(start)
          : `${chartDateLabel(start)} - ${chartDateLabel(end)}`,
      start,
    });
    cursor.setDate(cursor.getDate() + bucketDays);
  }

  return buckets;
}

function addDateToBucket(buckets, value) {
  const date = dateAtNoon(value);
  if (!date) return;
  const bucket = buckets.find((item) => date >= item.start && date <= item.end);
  if (bucket) bucket.count += 1;
}

function completedShipmentChartData(state, period) {
  const buckets = overviewBuckets(period);
  const seenDispatches = new Set();

  state.dispatches.forEach((item) => {
    const key = item.dispatchId || item.id;
    if (!key || seenDispatches.has(key)) return;
    seenDispatches.add(key);
    addDateToBucket(buckets, item.date || item.createdAt);
  });

  return buckets;
}

function issuedInvoiceChartData(state, period) {
  const buckets = overviewBuckets(period);

  state.invoiceApprovals.forEach((item) => {
    addDateToBucket(buckets, item.date || item.createdAt || item.periodClosedAt);
  });

  return buckets;
}

function resourceKey(item, idField, labelField) {
  return item[idField] || item[labelField] || "";
}

function overviewOperationalStats(state, period) {
  const window = periodWindow(period);
  const periodDispatches = state.dispatches.filter((item) =>
    dateInWindow(item.date || item.createdAt, window),
  );
  const activeVehicles = new Set(
    periodDispatches
      .map((item) => resourceKey(item, "vehicleId", "truck"))
      .filter(Boolean),
  );
  const activeDrivers = new Set(
    periodDispatches
      .map((item) => resourceKey(item, "driverId", "driver"))
      .filter(Boolean),
  );
  const pendingInvoices = reportRows(state);
  const pendingInvoicesInPeriod = pendingInvoices.filter((item) =>
    dateInWindow(item.periodClosedAt || item.periodEnd, window),
  );
  const totalVehicles = Math.max(state.vehicleRecords.length, activeVehicles.size);
  const totalDrivers = Math.max(state.driverRecords.length, activeDrivers.size);

  return {
    drivers: {
      active: activeDrivers.size,
      idle: Math.max(totalDrivers - activeDrivers.size, 0),
      total: totalDrivers,
    },
    invoices: {
      active: pendingInvoicesInPeriod.length,
      idle: Math.max(pendingInvoices.length - pendingInvoicesInPeriod.length, 0),
      total: pendingInvoices.length,
    },
    vehicles: {
      active: activeVehicles.size,
      idle: Math.max(totalVehicles - activeVehicles.size, 0),
      total: totalVehicles,
    },
  };
}

function OverviewPage({ onSelectCustomer, period, state }) {
  const [customerPage, setCustomerPage] = useState(1);
  const summaries = customerSummaries(state);
  const stats = overviewStats(state, period);
  const operationalStats = overviewOperationalStats(state, period);
  const customerView = paginate(summaries, customerPage, 6);
  const shipmentData = completedShipmentChartData(state, period);
  const invoiceData = issuedInvoiceChartData(state, period);
  const shipmentTotal = shipmentData.reduce((sum, item) => sum + item.count, 0);
  const invoiceTotal = invoiceData.reduce((sum, item) => sum + item.count, 0);

  useEffect(() => {
    setCustomerPage(1);
  }, [summaries.length]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          label={`Tổng hàng đã nhập trong ${stats.label}`}
          value={number(stats.received)}
        />
        <Metric
          label={`Đã xuất lên xe trong ${stats.label}`}
          tone="amber"
          value={number(stats.dispatched)}
        />
        <Metric
          label={`Còn trong kho trong ${stats.label}`}
          tone="green"
          value={number(stats.remaining)}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <OperationalMetric
          activeLabel="đang chạy"
          idleLabel="xe rảnh"
          label={`Xe trong ${stats.label}`}
          stats={operationalStats.vehicles}
          tone="amber"
        />
        <OperationalMetric
          activeLabel="đang chạy"
          idleLabel="tài xế rảnh"
          label={`Tài xế trong ${stats.label}`}
          stats={operationalStats.drivers}
          tone="blue"
        />
        <OperationalMetric
          activeLabel="chờ xuất"
          idleLabel="ngoài kỳ"
          label={`Hóa đơn chờ trong ${stats.label}`}
          stats={operationalStats.invoices}
          tone="green"
        />
      </div>
      <Card className="min-w-0">
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
                  <span className="font-black text-slate-900">
                    {summary.customer}
                  </span>
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
      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewCountChart
          color="#d97706"
          data={shipmentData}
          period={period}
          total={shipmentTotal}
          title="Chuyến hàng hoàn thành"
          unitLabel="Chuyến"
        />
        <OverviewCountChart
          color="#2563eb"
          data={invoiceData}
          period={period}
          total={invoiceTotal}
          title="Hóa đơn đã xuất"
          unitLabel="Hóa đơn"
        />
        <InventoryChart period={period} state={state} />
      </div>
    </>
  );
}

function OperationalMetric({ activeLabel, idleLabel, label, stats, tone }) {
  const activePercent = stats.total
    ? Math.min(Math.round((stats.active / stats.total) * 100), 100)
    : 0;
  const toneClass = {
    amber: "bg-amber-500",
    blue: "bg-blue-600",
    green: "bg-emerald-600",
  }[tone];

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <strong className="mt-2 block text-3xl font-black text-slate-950">
              {number(stats.active)}
            </strong>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
            {number(stats.total)} tổng
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full", toneClass)}
            style={{ width: `${activePercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-bold text-slate-500">{activeLabel}</span>
            <strong className="block text-lg font-black text-slate-950">
              {number(stats.active)}
            </strong>
          </div>
          <div>
            <span className="font-bold text-slate-500">{idleLabel}</span>
            <strong className="block text-lg font-black text-slate-950">
              {number(stats.idle)}
            </strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, tone = "default", value }) {
  return (
    <Card
      className={cn(
        tone === "green" && "border-emerald-200",
        tone === "amber" && "border-amber-200",
      )}
    >
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

function OverviewCountChart({
  color,
  data,
  period,
  title,
  total,
  unitLabel,
}) {
  const [chartRef, chartSize] = useElementSize();
  const maxCount = Math.max(0, ...data.map((item) => Number(item.count || 0)));
  const longestYAxisLabel = [0, maxCount, total].reduce((longest, value) => {
    const label = number(value);
    return label.length > longest.length ? label : longest;
  }, "");
  const yAxisWidth = Math.min(Math.max(longestYAxisLabel.length * 8 + 28, 48), 96);
  const canRenderChart = chartSize.height > 0 && chartSize.width > 0;
  const normalizedUnitLabel = unitLabel.toLocaleLowerCase("vi-VN");

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {number(total)} {normalizedUnitLabel} trong {periodLabel(period)}.
            </CardDescription>
          </div>
          <strong className="shrink-0 text-3xl font-black text-slate-950">
            {number(total)}
          </strong>
        </div>
      </CardHeader>
      <CardContent className="h-[320px] min-w-0">
        <div className="h-full min-w-0" ref={chartRef}>
          {canRenderChart ? (
            <BarChart
              data={data}
              height={chartSize.height}
              margin={{ bottom: 6, left: 8, right: 16, top: 18 }}
              width={chartSize.width}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={period === "week" ? 0 : "preserveStartEnd"}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickFormatter={number}
                tickLine={false}
                tickMargin={10}
                width={yAxisWidth}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                }}
                formatter={(value) => [number(value), unitLabel]}
                labelFormatter={(value, payload) => {
                  const range = payload?.[0]?.payload?.rangeLabel || value;
                  return period === "quarter" ? `Kỳ ${range}` : `Ngày ${range}`;
                }}
              />
              <Bar
                dataKey="count"
                fill={color}
                maxBarSize={44}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          ) : (
            <Skeleton className="h-full w-full rounded-lg" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryChart({ period, state }) {
  const chartRef = useRef(null);
  const [chartSize, setChartSize] = useState({ height: 0, width: 0 });
  const data = overviewTrend(state, period);
  const stats = overviewStats(state, period);
  const last = data[data.length - 1]?.quantity || 0;
  const maxQuantity = Math.max(0, ...data.map((item) => Number(item.quantity || 0)));
  const yAxisWidth = 48;

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setChartSize({
        height: Math.floor(entry.contentRect.height),
        width: Math.floor(entry.contentRect.width),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const canRenderChart = chartSize.height > 0 && chartSize.width > 0;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Xu hướng tồn kho</CardTitle>
        <CardDescription>
          Tồn cuối {stats.label}{" "}
          <strong className="text-emerald-700">{number(last)}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] min-w-0">
        <div className="h-full min-w-0" ref={chartRef}>
          {canRenderChart ? (
            <AreaChart
              data={data}
              height={chartSize.height}
              margin={{ bottom: 6, left: 8, right: 16, top: 18 }}
              width={chartSize.width}
            >
              <defs>
                <linearGradient id="stockGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickFormatter={compactAxisNumber}
                tickLine={false}
                tickMargin={10}
                width={yAxisWidth}
              />
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
          ) : (
            <Skeleton className="h-full w-full rounded-lg" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiptPage({
  mutation,
  selectedCustomer,
  session,
  setSelectedCustomer,
  state,
}) {
  const [form, setForm] = useState({
    customer: selectedCustomer,
    date: todayIso(),
    quantity: 100,
    sku: "",
    unit: "tấn",
  });
  const [summaryPage, setSummaryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPeriod, setHistoryPeriod] = useState("week");
  const customers = allCustomers(state);
  const customer = form.customer || selectedCustomer;
  const historyWindow = periodWindow(historyPeriod);
  const summary = paginate(receiptSummaryRows(state, customer), summaryPage);
  const history = paginate(
    state.invoice
      .filter((item) => !customer || item.customer === customer)
      .filter(
        (item) => !historyWindow || dateInWindow(item.date, historyWindow),
      )
      .sort(dateComparator("desc")),
    historyPage,
  );

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  useEffect(() => {
    setHistoryPage(1);
  }, [customer, historyPeriod]);

  return (
    <div className="grid gap-4">
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Ghi nhận hàng nhập</CardTitle>
            <CardDescription>
              Chọn khách hàng và thêm từng loại hàng vào kho.
            </CardDescription>
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
                setForm((current) => ({
                  ...current,
                  quantity: 100,
                  sku: "",
                  unit: "tấn",
                }));
              }}
            >
              <Field>
                Ngày nhập kho
                <Input
                  className="min-w-0"
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </Field>
              <Field>
                Khách hàng
                <Select
                  required
                  value={form.customer}
                  onChange={(event) => {
                    setForm({ ...form, customer: event.target.value });
                    setSelectedCustomer(event.target.value);
                  }}
                >
                  <option value="">Chọn khách hàng</option>
                  {customers.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Loại hàng
                <Input
                  placeholder="A"
                  required
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value })
                  }
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
                    onChange={(event) =>
                      setForm({ ...form, quantity: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  Đơn vị
                  <Input
                    required
                    value={form.unit}
                    onChange={(event) =>
                      setForm({ ...form, unit: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className={operationActionButtonShellClass}>
                <Button
                  className="w-full"
                  disabled={mutation.isPending}
                  type="submit"
                >
                  Nhập hàng
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <DataTableCard
          className="h-full"
          description={
            customer
              ? `${summary.rows.length} dòng đang hiển thị`
              : "Chọn khách hàng để xem tổng hợp."
          }
          title={
            customer ? `Tổng hợp hàng nhập - ${customer}` : "Tổng hợp hàng nhập"
          }
        >
          <DataTable width="receiptSummary">
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
                    <Td data-label="Loại hàng">
                      <strong>{row.sku}</strong>
                    </Td>
                    <Td data-label="Tổng số lượng">{number(row.quantity)}</Td>
                    <Td data-label="Đơn vị">{row.unit}</Td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={3}>
                  Khách hàng này chưa có dữ liệu nhập hàng.
                </EmptyRow>
              )}
            </tbody>
          </DataTable>
          <Pagination
            page={summary.page}
            pageCount={summary.pageCount}
            onPageChange={setSummaryPage}
          />
        </DataTableCard>
      </div>
      <DataTableCard
        title="Lịch sử nhập hàng"
        description={periodDescription(
          "Theo dõi từng lần nhập hàng",
          historyPeriod,
        )}
        actions={
          <PeriodSelect value={historyPeriod} onChange={setHistoryPeriod} />
        }
      >
        <DataTable width="receiptHistory">
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
                  <Td data-label="Ngày nhập">{formatDate(row.date)}</Td>
                  <Td data-label="Loại hàng">
                    <strong>{row.sku}</strong>
                  </Td>
                  <Td data-label="Số lượng">{number(row.quantity)}</Td>
                  <Td data-label="Đơn vị">{row.unit}</Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>
                Khách hàng này chưa có lịch sử nhập hàng.
              </EmptyRow>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={history.page}
          pageCount={history.pageCount}
          onPageChange={setHistoryPage}
        />
      </DataTableCard>
    </div>
  );
}

function DispatchPage({
  mutation,
  selectedCustomer,
  session,
  setSelectedCustomer,
  state,
}) {
  const availableRows = stockRows(state);
  const [form, setForm] = useState({
    customer: selectedCustomer,
    date: todayIso(),
    driver: "",
    quantity: "",
    sku: "",
    truck: "",
    unit: "",
  });
  const [filters, setFilters] = useState({
    date: "",
    driver: "",
    period: "week",
    truck: "",
  });
  const [page, setPage] = useState(1);

  const customerStock = availableRows.filter(
    (row) => row.customer === form.customer,
  );
  const selectedStock =
    customerStock.find((row) => row.sku === form.sku) || customerStock[0];

  useEffect(() => {
    setForm((current) => ({ ...current, customer: selectedCustomer }));
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedStock) return;
    setForm((current) => ({
      ...current,
      quantity:
        current.sku === selectedStock.sku
          ? current.quantity
          : selectedStock.remainingQuantity,
      sku: current.sku || selectedStock.sku,
      unit:
        current.sku === selectedStock.sku ? current.unit : selectedStock.unit,
    }));
  }, [selectedStock?.sku]);

  const rows = state.dispatches
    .filter(
      (item) =>
        filters.date || dateInWindow(item.date, periodWindow(filters.period)),
    )
    .filter((item) => !filters.date || item.date === filters.date)
    .filter((item) => !form.customer || item.customer === form.customer)
    .filter((item) => !filters.truck || item.truck === filters.truck)
    .filter((item) => !filters.driver || item.driver === filters.driver)
    .sort(dateComparator("desc"));
  const dispatchPage = paginate(rows, page);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tạo phiếu xuất hàng</CardTitle>
          <CardDescription>
            Chọn khách hàng, xe, tài xế và lượng hàng cần xuất.
          </CardDescription>
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
                    unit: form.unit.trim() || stock?.unit || "đơn vị",
                  },
                ],
                plate: form.truck,
                warehouseName: session?.name || "Thủ kho mẫu",
              });
              setSelectedCustomer(customerName);
              setFilters({ date: "", driver: "", period: "week", truck: "" });
              setPage(1);
            }}
          >
            <Field>
              Ngày xuất
              <Input
                className="min-w-0"
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
              />
            </Field>
            <Field>
              Khách hàng
              <Select
                required
                value={form.customer}
                onChange={(event) => {
                  setSelectedCustomer(event.target.value);
                  setForm({
                    ...form,
                    customer: event.target.value,
                    quantity: "",
                    sku: "",
                    unit: "",
                  });
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
                onChange={(event) =>
                  setForm({ ...form, truck: event.target.value })
                }
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
                onChange={(event) =>
                  setForm({ ...form, driver: event.target.value })
                }
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
                  const next = customerStock.find(
                    (row) => row.sku === event.target.value,
                  );
                  setForm({
                    ...form,
                    quantity: next?.remainingQuantity || "",
                    sku: event.target.value,
                    unit: next?.unit || "đơn vị",
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
                onChange={(event) =>
                  setForm({ ...form, quantity: event.target.value })
                }
              />
            </Field>
            <Field>
              Đơn vị
              <Input
                required
                value={form.unit}
                onChange={(event) =>
                  setForm({ ...form, unit: event.target.value })
                }
              />
            </Field>
            <div
              className={cn(operationActionButtonShellClass, "lg:col-span-2")}
            >
              <Button
                className="w-full"
                disabled={mutation.isPending}
                type="submit"
              >
                Xuất hàng
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <DataTableCard
        description={periodDescription(
          "Lọc nhanh các chuyến đã xuất",
          filters.period,
        )}
        actions={
          <PeriodSelect
            value={filters.period}
            onChange={(period) => {
              setFilters({ ...filters, period });
              setPage(1);
            }}
          />
        }
        title="Lịch sử xuất hàng"
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Field>
            Ngày xuất
            <Input
              className="min-w-0"
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
            className="w-full self-end lg:w-48"
            onClick={() => {
              setFilters({ date: "", driver: "", period: "week", truck: "" });
              setPage(1);
            }}
            type="button"
          >
            Xem tất cả
          </Button>
        </div>
        <DispatchTable rows={dispatchPage.rows} />
        <Pagination
          page={dispatchPage.page}
          pageCount={dispatchPage.pageCount}
          onPageChange={setPage}
        />
      </DataTableCard>
    </div>
  );
}

function DispatchTable({ rows }) {
  return (
    <DataTable width="dispatch">
      <thead>
        <tr>
          <Th>Ngày xuất</Th>
          <Th>Khách hàng</Th>
          <Th>Xe</Th>
          <Th>Tài xế</Th>
          <Th>Loại hàng</Th>
          <Th>Số lượng</Th>
          <Th>Đơn vị</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((item) => (
            <tr key={item.id}>
              <Td data-label="Ngày xuất">{formatDate(item.date)}</Td>
              <Td data-label="Khách hàng">{item.customer}</Td>
              <Td data-label="Xe">
                <strong>{item.truck}</strong>
              </Td>
              <Td data-label="Tài xế">{item.driver}</Td>
              <Td data-label="Loại hàng">{item.sku}</Td>
              <Td data-label="Số lượng">{number(item.quantity)}</Td>
              <Td data-label="Đơn vị">{item.unit || "đơn vị"}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={7}>
            Chưa có lịch sử xuất hàng phù hợp với bộ lọc hiện tại.
          </EmptyRow>
        )}
      </tbody>
    </DataTable>
  );
}

function ReportsPage({ mutation, session, state }) {
  const [selected, setSelected] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const shouldPaginateCustomers = useMediaQuery("(max-width: 639px)");
  const rows = reportRows(state);
  const customerView = shouldPaginateCustomers
    ? paginate(rows, customerPage, 3)
    : { page: 1, pageCount: 1, rows };
  const current = customerView.rows.some((row) => row.reportKey === selected)
    ? selected
    : customerView.rows[0]?.reportKey || rows[0]?.reportKey || "";
  const currentRow = rows.find((row) => row.reportKey === current) || rows[0];
  const invoiceSearchTerm = invoiceSearch.trim().toLowerCase();
  const currentPeriodOpenTime = new Date(currentRow?.periodOpenAt || "").getTime();
  const currentPeriodClosedTime = new Date(currentRow?.periodClosedAt || "").getTime();

  useEffect(() => {
    setCustomerPage(1);
  }, [rows.length, shouldPaginateCustomers]);

  const history = state.dispatches
    .filter(
      (item) => {
        if (item.customer !== currentRow?.customer) return false;
        const dispatchTime = new Date(item.createdAt || "").getTime();
        if (!Number.isNaN(currentPeriodOpenTime) && dispatchTime <= currentPeriodOpenTime) return false;
        if (!Number.isNaN(currentPeriodClosedTime) && dispatchTime > currentPeriodClosedTime) return false;
        if (!Number.isNaN(dispatchTime)) return true;
        return (
          (!currentRow?.periodStart || item.date >= currentRow.periodStart) &&
          (!currentRow?.periodEnd || item.date <= currentRow.periodEnd)
        );
      },
    )
    .sort(dateComparator("desc"));
  const invoiceHistory = [...state.invoiceApprovals]
    .filter((item) => {
      if (!invoiceSearchTerm) return true;
      return [
        formatDate(item.date),
        item.customer,
        formatDate(item.periodStart || item.date),
        formatDate(item.periodEnd || item.date),
        formatDateTime(item.periodClosedAt),
        item.status,
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(invoiceSearchTerm));
    })
    .sort(dateComparator("desc"));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Khách hàng đủ điều kiện xuất hóa đơn</CardTitle>
          <CardDescription>
            Chỉ hiển thị khách hàng đã xuất hết hàng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rows.length ? (
              customerView.rows.map((row) => (
                <article
                  className={cn(
                    "relative grid min-h-32 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50",
                    current === row.reportKey &&
                      "border-emerald-400 bg-emerald-50",
                  )}
                  key={row.reportKey}
                >
                  <button
                    aria-label={`Chọn khách hàng ${row.customer} để xem lịch sử xuất hàng`}
                    className="absolute inset-0 z-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                    onClick={() => setSelected(row.reportKey)}
                    type="button"
                  />
                  <div className="pointer-events-none relative z-10 grid gap-2">
                    <strong className="text-slate-950">{row.customer}</strong>
                    <span className="text-sm text-slate-500">
                      {row.historyCount} lần xuất hàng
                    </span>
                  </div>
                  <span className="pointer-events-none relative z-10 text-sm text-slate-500">
                    {row.itemTypeCount} loại hàng đã hoàn tất
                  </span>
                  <span className="pointer-events-none relative z-10 text-xs font-semibold text-slate-500">
                    Kỳ hàng {formatDate(row.periodStart)} - {formatDate(row.periodEnd)}
                  </span>
                  <span className="pointer-events-none relative z-10 text-xs font-semibold text-slate-500">
                    Chốt lúc {formatDateTime(row.periodClosedAt)}
                  </span>
                  <Button
                    className="relative z-20 w-full"
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
          {shouldPaginateCustomers ? (
            <Pagination
              page={customerView.page}
              pageCount={customerView.pageCount}
              onPageChange={setCustomerPage}
            />
          ) : null}
        </CardContent>
      </Card>
      <DataTableCard
        title="Lịch sử xuất hàng"
        description="Dữ liệu phục vụ đối soát hóa đơn."
      >
        <DispatchTable rows={history} />
      </DataTableCard>
      <DataTableCard
        title="Lịch sử xuất hóa đơn"
        description="Các khách hàng đã được ghi nhận."
        descriptionPrefix={
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 pl-9"
              placeholder="Tìm lịch sử xuất hóa đơn"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
            />
          </div>
        }
      >
        <DataTable width="invoice">
          <thead>
            <tr>
              <Th>Ngày</Th>
              <Th>Khách hàng</Th>
              <Th>Kỳ hàng</Th>
              <Th>Trạng thái</Th>
            </tr>
          </thead>
          <tbody>
            {invoiceHistory.length ? (
              invoiceHistory.map((item) => (
                <tr key={item.id}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td>{item.customer}</Td>
                  <Td>
                    {formatDate(item.periodStart || item.date)} -{" "}
                    {formatDate(item.periodEnd || item.date)}
                    {item.periodClosedAt ? ` · ${formatDateTime(item.periodClosedAt)}` : ""}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Badge tone="green">{item.status || "Hoàn thành"}</Badge>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4}>Chưa có lịch sử xuất hóa đơn.</EmptyRow>
            )}
          </tbody>
        </DataTable>
      </DataTableCard>
      <Dialog
        open={Boolean(confirmCustomer)}
        onOpenChange={(open) => !open && setConfirmCustomer(null)}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Xuất hóa đơn cho {confirmCustomer?.customer}?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Sau khi đồng ý, khách hàng sẽ được ghi nhận vào lịch sử xuất hóa
            đơn.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Hủy
              </Button>
            </DialogClose>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate({
                  approvedByName: session?.name || "Kế toán mẫu",
                  customerId:
                    confirmCustomer.customerId ||
                    state.customerIds[confirmCustomer.customer],
                  periodEnd: confirmCustomer.periodEnd,
                  periodStart: confirmCustomer.periodStart,
                  periodClosedAt: confirmCustomer.periodClosedAt,
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
  const [activeList, setActiveList] = useState("");
  const recordsByList = {
    customers: state.customerRecords,
    drivers: state.driverRecords,
    vehicles: state.vehicleRecords,
  };

  return (
    <div className="grid gap-3">
      {masterSections.map((section) => {
        const isActive = section.listName === activeList;
        return (
          <Card className="overflow-hidden" key={section.listName}>
            <button
              aria-expanded={isActive}
              className={cn(
                "flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-slate-50 sm:px-5",
                isActive && "border-b border-slate-100 bg-slate-50",
              )}
              onClick={() => setActiveList(isActive ? "" : section.listName)}
              type="button"
            >
              <strong className="text-base font-bold leading-tight text-slate-950">
                Quản lý {section.label}
              </strong>
              <ChevronRight
                className={cn(
                  "h-6 w-6 shrink-0 text-slate-500 transition",
                  isActive && "rotate-90 text-emerald-700",
                )}
              />
            </button>
            {isActive ? (
              <MasterSection
                config={section}
                mutation={mutation}
                records={recordsByList[section.listName] || []}
              />
            ) : null}
          </Card>
        );
      })}
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
    listName === "vehicles"
      ? { plate: nextValue.toUpperCase() }
      : { name: nextValue.trim() };
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
    <>
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
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
          <Badge tone="green">
            {filteredRecords.length} / {records.length} mục
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:p-5">
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(10rem,24%)]"
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
          <div className={cn(primaryActionButtonShellClass, "self-end")}>
            <Button
              className="w-full"
              disabled={mutation.isPending}
              type="submit"
            >
              <Plus className="h-4 w-4" />
              Thêm
            </Button>
          </div>
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
        <DataTable width="management">
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
                      <strong className="min-w-0 truncate text-slate-900">
                        {item.label}
                      </strong>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Badge tone="green">Đang dùng</Badge>
                  </Td>
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
        </DataTable>
        <Pagination
          page={recordView.page}
          pageCount={recordView.pageCount}
          onPageChange={setPage}
        />
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Sửa {label}
          </DialogTitle>
          <EditMasterForm
            initialValue={editing?.label || ""}
            isPending={mutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(nextValue) => {
              mutation.mutate(
                {
                  body: payload(nextValue),
                  method: "PATCH",
                  path: `${path}/${editing.id}`,
                },
                {
                  onSuccess: () => setEditing(null),
                },
              );
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-black text-slate-950">
            Xóa {deleting?.label}?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Danh mục này sẽ không còn xuất hiện.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setDeleting(null)}
              type="button"
              variant="secondary"
            >
              Hủy
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate(
                  { method: "DELETE", path: `${path}/${deleting.id}` },
                  { onSuccess: () => setDeleting(null) },
                );
              }}
              type="button"
              variant="destructive"
            >
              Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

function SettingsPage({ settings, setSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tùy chỉnh giao diện</CardTitle>
        <CardDescription>
          Giữ UI sạch, dày dữ liệu và dễ đọc trong kho.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field>
          Mật độ hiển thị
          <Select
            value={settings.density}
            onChange={(event) =>
              setSettings({ ...settings, density: event.target.value })
            }
          >
            <option value="comfortable">Vừa</option>
            <option value="compact">Gọn</option>
          </Select>
        </Field>
        <Field>
          Tông màu
          <Select
            value={settings.accent}
            onChange={(event) =>
              setSettings({ ...settings, accent: event.target.value })
            }
          >
            <option value="emerald">Xanh ngọc</option>
            <option value="slate">Trung tính</option>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}

function DataTableCard({
  actions,
  children,
  className,
  description,
  descriptionPrefix,
  title,
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader
        className={cn(
          actions &&
            "sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {descriptionPrefix ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full shrink-0 sm:w-72">{descriptionPrefix}</div>
              <CardDescription>{description}</CardDescription>
            </div>
          ) : (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
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
