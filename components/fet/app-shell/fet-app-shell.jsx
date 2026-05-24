"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { accessQueryOptions, apiRequest, pageQueryOptions, saveAppSetting } from "@/lib/api";
import {
  composeState,
  defaultPageAccess,
  normalizePageAccess,
  normalizeRole,
  pages,
  roleCanAccessPage,
  todayIso,
} from "@/lib/fet-domain";
import { parseApiError } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginScreen } from "./components/login-screen";
import { PeriodSelect } from "./components/period-select";
import { LoadingSkeleton } from "./components/skeletons";
import { Sidebar } from "./components/sidebar";
import { Toast } from "./components/toast";
import {
  pagePaths,
  SELECTED_CUSTOMER_KEY,
  SESSION_KEY,
} from "./lib/constants";
import {
  addMasterRecord,
  applyDispatchInventory,
  applyReceiptInventory,
  dispatchMasterRecords,
  masterListFromPath,
  prependById,
  receiptMasterRecord,
  removeMasterRecord,
  resetCustomerInventory,
} from "./lib/data-mutations";
import { DispatchPage } from "./pages/dispatch-page";
import { ManagementPage } from "./pages/management/management-page";
import { DashboardPage } from "./pages/dashboard/dashboard-page";
import { ReceiptPage } from "./pages/receipt-page";
import { ReportsPage } from "./pages/reports-page";
import { SettingsPage } from "./pages/settings-page";

export default function FetAppShell({ initialPage = "dashboard" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [activePage, setActivePage] = useState(initialPage);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({
    density: "comfortable",
    accent: "emerald",
  });
  const [dashboardPeriod, setDashboardPeriod] = useState("week");

  useEffect(() => {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.id) {
        setSession({ ...parsed, role: normalizeRole(parsed.role) });
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  useEffect(() => {
    setActivePage(initialPage);
    const storedCustomer = window.sessionStorage.getItem(
      SELECTED_CUSTOMER_KEY,
    );
    if (storedCustomer) setSelectedCustomer(storedCustomer);
  }, [initialPage]);

  const accessQuery = useQuery(accessQueryOptions(session));
  const pageAccess = useMemo(() => {
    const raw = accessQuery.data?.pageAccess;
    if (raw && typeof raw === "object") return normalizePageAccess(raw);
    return defaultPageAccess();
  }, [accessQuery.data?.pageAccess]);
  const [pageAccessDraft, setPageAccessDraft] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [settingsApplyPending, setSettingsApplyPending] = useState(false);
  const [pageAccessApplyPending, setPageAccessApplyPending] = useState(false);

  useEffect(() => {
    const ui = accessQuery.data?.ui;
    if (!ui) return;
    setSettings({
      accent: ui.accent === "slate" ? "slate" : "emerald",
      density: ui.density === "compact" ? "compact" : "comfortable",
    });
  }, [accessQuery.data?.ui]);

  useEffect(() => {
    if (!session) return;
    const role = normalizeRole(session.role);
    if (roleCanAccessPage(pageAccess, role, activePage)) return;
    router.replace(pagePaths.dashboard);
  }, [session, activePage, pageAccess, router]);

  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
  };

  const activeRole = normalizeRole(session?.role || "warehouse");
  const visiblePage = roleCanAccessPage(pageAccess, activeRole, activePage)
    ? activePage
    : "dashboard";
  const needsMaster = visiblePage !== "cai-dat";
  const needsOperations = [
    "dashboard",
    "nhap-hang",
    "xuat-hang",
    "bao-cao",
  ].includes(visiblePage);
  const needsReport = ["dashboard", "bao-cao"].includes(visiblePage);
  const usesBundledMaster =
    visiblePage === "nhap-hang" || visiblePage === "xuat-hang";
  const canLoadPageData = Boolean(session) && accessQuery.isSuccess;
  const operationsPage =
    visiblePage === "nhap-hang"
      ? "receipt"
      : visiblePage === "xuat-hang"
        ? "dispatch"
        : "operations";
  const masterQuery = useQuery({
    ...pageQueryOptions("master", session),
    enabled: canLoadPageData && needsMaster && !usesBundledMaster,
  });
  const operationsQuery = useQuery({
    ...pageQueryOptions(operationsPage, session),
    enabled: canLoadPageData && needsOperations,
  });
  const reportQuery = useQuery({
    ...pageQueryOptions("report", session),
    enabled: canLoadPageData && needsReport,
  });
  const usersQuery = useQuery({
    queryKey: ["users", session?.id, session?.role, session?.siteId],
    queryFn: () => apiRequest("/users", {}, session),
    enabled:
      Boolean(session) &&
      visiblePage === "quan-ly" &&
      roleCanAccessPage(pageAccess, activeRole, "quan-ly"),
  });
  const billingQuery = useQuery({
    queryKey: ["billing", session?.id, session?.role, session?.siteId],
    queryFn: () => apiRequest("/billing", {}, session),
    enabled: Boolean(session) && visiblePage === "quan-ly",
    staleTime: 60_000,
  });

  useEffect(() => {
    if (visiblePage !== "cai-dat") return;
    setPageAccessDraft(pageAccess);
    setSettingsDraft(settings);
  }, [visiblePage, pageAccess, settings]);

  const bundledMaster = useMemo(() => {
    if (!usesBundledMaster || !operationsQuery.data?.customers) return null;
    return {
      customers: operationsQuery.data.customers,
      drivers: operationsQuery.data.drivers,
      vehicles: operationsQuery.data.vehicles,
    };
  }, [operationsQuery.data, usesBundledMaster]);

  const bundledOperations = useMemo(() => {
    if (!operationsQuery.data) return null;
    if (operationsPage === "receipt") {
      return {
        inventory: operationsQuery.data.inventory,
        receipts: operationsQuery.data.receipts,
      };
    }
    if (operationsPage === "dispatch") {
      return {
        dispatches: operationsQuery.data.dispatches,
        inventory: operationsQuery.data.inventory,
      };
    }
    return operationsQuery.data;
  }, [operationsPage, operationsQuery.data]);

  const isMasterLoading =
    needsMaster &&
    !usesBundledMaster &&
    !masterQuery.data &&
    masterQuery.isPending;
  const isOperationsLoading =
    needsOperations && !operationsQuery.data && operationsQuery.isPending;
  const isReportLoading =
    needsReport && !reportQuery.data && reportQuery.isPending;
  const isUsersLoading =
    roleCanAccessPage(pageAccess, activeRole, "quan-ly") &&
    visiblePage === "quan-ly" &&
    !usersQuery.data &&
    usersQuery.isPending;
  const isBillingLoading =
    visiblePage === "quan-ly" && !billingQuery.data && billingQuery.isPending;
  const isPageLoading =
    isMasterLoading ||
    isOperationsLoading ||
    isReportLoading ||
    isUsersLoading ||
    isBillingLoading;

  const state = useMemo(
    () =>
      composeState({
        master: masterQuery.data || bundledMaster,
        operations: bundledOperations,
        report: reportQuery.data,
      }),
    [
      masterQuery.data,
      bundledMaster,
      bundledOperations,
      reportQuery.data,
    ],
  );

  const pageDataKey = (pageName) => [
    "page-data",
    pageName,
    session?.id,
    session?.role,
    session?.name,
    session?.siteId,
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
    onError: (error) =>
      showToast(parseApiError(error), "error"),
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
      updatePageData("receipt", (data) => {
        const master = addMasterRecord(
          {
            customers: data.customers,
            drivers: data.drivers,
            vehicles: data.vehicles,
          },
          "customers",
          receiptMasterRecord(receipt),
        );
        return {
          ...data,
          ...master,
          inventory: applyReceiptInventory(data.inventory || [], receipt),
          receipts: prependById(data.receipts || [], receipt),
        };
      });
      updatePageData("master", (data) =>
        addMasterRecord(data, "customers", receiptMasterRecord(receipt)),
      );
      markPagesStale(["master", "operations", "receipt", "dispatch", "report"]);
      showToast("Đã nhập hàng");
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
      updatePageData("dispatch", (data) => {
        const master = addMasterRecord(
          addMasterRecord(
            addMasterRecord(
              {
                customers: data.customers,
                drivers: data.drivers,
                vehicles: data.vehicles,
              },
              "customers",
              records.customer,
            ),
            "vehicles",
            records.vehicle,
          ),
          "drivers",
          records.driver,
        );
        return {
          ...data,
          ...master,
          dispatches: prependById(data.dispatches || [], dispatch),
          inventory: applyDispatchInventory(data.inventory || [], dispatch),
        };
      });
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
      showToast("Đã xuất hàng");
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
      showToast("Đã cập nhật danh mục");
    },
  });
  const userMutation = useMutation({
    ...mutationOptions,
    mutationFn: ({ body, method = "POST", path = "/users" }) =>
      apiRequest(
        path,
        { body: body ? JSON.stringify(body) : undefined, method },
        session,
      ),
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["users", session?.id, session?.role, session?.siteId],
      });
      markPagesStale(["master"]);
      const messages = {
        DELETE: "Đã xóa tài khoản",
        PATCH: "Đã cập nhật tài khoản",
        POST: "Đã thêm tài khoản",
      };
      showToast(messages[variables.method || "POST"]);
    },
  });
  const passwordMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload) =>
      apiRequest(
        "/users/me/password",
        { body: JSON.stringify(payload), method: "PATCH" },
        session,
      ),
    onSuccess: () => showToast("Đã đổi mật khẩu"),
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
          approval.approvedByName ||
          payload.approvedByName ||
          session?.name ||
          "Kế toán mẫu",
        customer: approval.customer || customer,
        customerId: payload.customerId,
        createdAt:
          approval.createdAt ||
          approval.created_at ||
          new Date().toISOString(),
        date: approval.date || approval.approval_date || todayIso(),
        id: approval.id,
        periodClosedAt:
          approval.periodClosedAt ||
          approval.period_closed_at ||
          payload.periodClosedAt,
        periodEnd:
          approval.periodEnd ||
          approval.period_end ||
          payload.periodEnd,
        periodStart:
          approval.periodStart ||
          approval.period_start ||
          payload.periodStart,
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
      ["receipt", "dispatch", "operations"].forEach((pageName) => {
        updatePageData(pageName, (data) =>
          resetCustomerInventory(data, payload.customerId, customer),
        );
      });
      markPagesStale(["report", "receipt", "dispatch", "operations"]);
      showToast("Đã ghi nhận hóa đơn");
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
    if (!roleCanAccessPage(pageAccess, activeRole, page)) return;
    router.push(pagePaths[page] || "/dashboard");
    setActivePage(page);
  };

  const applyUiSettings = async () => {
    if (!settingsDraft || !session) return;
    setSettingsApplyPending(true);
    try {
      await saveAppSetting("ui", settingsDraft, session);
      setSettings(settingsDraft);
      queryClient.setQueryData(
        ["access", session.id, session.siteId],
        (current) => (current ? { ...current, ui: settingsDraft } : current),
      );
      showToast("Đã lưu cài đặt");
    } catch (error) {
      showToast(parseApiError(error), "error");
    } finally {
      setSettingsApplyPending(false);
    }
  };

  const applyPageAccess = async () => {
    if (!pageAccessDraft || !session) return;
    setPageAccessApplyPending(true);
    try {
      const saved = await saveAppSetting(
        "pageAccess",
        pageAccessDraft,
        session,
      );
      const nextAccess = normalizePageAccess(saved.value);
      await queryClient.invalidateQueries({ queryKey: ["access"] });
      setPageAccessDraft(nextAccess);
      showToast("Đã lưu cài đặt");
    } catch (error) {
      showToast(parseApiError(error), "error");
    } finally {
      setPageAccessApplyPending(false);
    }
  };

  if (!session) return <LoginScreen onLogin={saveSession} />;

  const page = pages[visiblePage];

  return (
    <>
      <Toast
        message={toast?.message}
        tone={toast?.tone}
        onClose={() => setToast(null)}
      />
      <main
      className={cn(
        "app-grid app-shell",
      )}
      data-density={settings.density}
    >
      <button
        aria-label={mobileNavOpen ? "Đóng điều hướng" : "Mở điều hướng"}
        className={cn(
          "fixed left-3 top-3 z-40 grid h-9 w-9 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm transition lg:hidden",
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
          className="fixed inset-0 z-20 bg-zinc-900/20 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}
      <Sidebar
        activePage={activePage}
        activeRole={activeRole}
        mobileNavOpen={mobileNavOpen}
        navigate={navigate}
        pageAccess={pageAccess}
        session={session}
        onLogout={() => {
          window.localStorage.removeItem(SESSION_KEY);
          setSession(null);
        }}
        onPasswordChange={(payload) => passwordMutation.mutateAsync(payload)}
        passwordPending={passwordMutation.isPending}
      />
      <section className="min-w-0 px-4 pb-8 pt-16 sm:px-6 lg:px-7 lg:pt-6">
        <header className="mb-5 flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-ui-title font-semibold tracking-tight text-zinc-900">
              {page.title}
            </h1>
            {visiblePage === "dashboard" ? (
              <div className="mt-1.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-3xl text-ui-sm leading-5 text-zinc-500">
                  {page.subtitle}
                </p>
                <PeriodSelect
                  value={dashboardPeriod}
                  onChange={setDashboardPeriod}
                />
              </div>
            ) : (
              <p className="mt-1.5 max-w-3xl text-ui-sm leading-5 text-zinc-500">
                {page.subtitle}
              </p>
            )}
          </div>
          {visiblePage !== "dashboard" ? (
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
          {!isPageLoading && visiblePage === "dashboard" ? (
            <DashboardPage
              period={dashboardPeriod}
              state={state}
              onSelectCustomer={(customer) => {
                setSelectedCustomer(customer);
                window.sessionStorage.setItem(
                  SELECTED_CUSTOMER_KEY,
                  customer,
                );
                navigate("nhap-hang");
              }}
            />
          ) : null}
          {!isPageLoading && visiblePage === "nhap-hang" ? (
            <ReceiptPage
              mutation={receiptMutation}
              selectedCustomer={selectedCustomer}
              session={session}
              setSelectedCustomer={(customer) => {
                setSelectedCustomer(customer);
                window.sessionStorage.setItem(
                  SELECTED_CUSTOMER_KEY,
                  customer,
                );
              }}
              state={state}
            />
          ) : null}
          {!isPageLoading && visiblePage === "xuat-hang" ? (
            <DispatchPage
              mutation={dispatchMutation}
              selectedCustomer={selectedCustomer}
              session={session}
              setSelectedCustomer={(customer) => {
                setSelectedCustomer(customer);
                window.sessionStorage.setItem(
                  SELECTED_CUSTOMER_KEY,
                  customer,
                );
              }}
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
            <ManagementPage
              activeRole={activeRole}
              billing={billingQuery.data}
              mutation={masterMutation}
              state={state}
              userMutation={userMutation}
              users={usersQuery.data || []}
            />
          ) : null}
          {!isPageLoading && visiblePage === "cai-dat" ? (
            <SettingsPage
              isPageAccessPending={pageAccessApplyPending}
              isUiPending={settingsApplyPending}
              pageAccessDraft={pageAccessDraft || pageAccess}
              setPageAccessDraft={setPageAccessDraft}
              setSettingsDraft={setSettingsDraft}
              settingsDraft={settingsDraft || settings}
              onApplyPageAccess={applyPageAccess}
              onApplyUi={applyUiSettings}
            />
          ) : null}
        </div>
      </section>
    </main>
    </>
  );
}
