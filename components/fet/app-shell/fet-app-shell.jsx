"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  accountingContextQueryOptions,
  apiRequest,
  logoutRequest,
  appContextPageFor,
  billingQueryOptions,
  dashboardSummaryQueryOptions,
  pageQueryOptions,
  saveAppSetting,
  usersListQueryOptions,
  shellContextQueryOptions,
} from "@/lib/api";
import {
  billingIsLocked,
  billingLockAllowedPage,
  billingLockEnforcePage,
  canManageBilling,
} from "@/lib/billing-utils";
import {
  composeState,
  defaultPageAccess,
  normalizePageAccess,
  normalizeRole,
  pageIdFromPathname,
  pages,
  roleCanAccessPage,
  todayIso,
} from "@/lib/fet-domain";
import { parseApiError } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginScreen, SessionBootstrapScreen } from "./components/login-screen";
import { BillingBanner } from "./components/billing-banner";
import { BillingLockScreen } from "./components/billing-lock-screen";
import { PeriodSelect } from "./components/period-select";
import { LoadingSkeleton } from "./components/skeletons";
import { Sidebar } from "./components/sidebar";
import { Toast } from "./components/toast";
import {
  LOGIN_PATH,
  operationActionButtonClass,
  pagePaths,
  SELECTED_CUSTOMER_KEY,
  SESSION_KEY,
} from "./lib/constants";
import { readStoredSession } from "./lib/session";
import {
  addMasterRecord,
  applyDispatchInventory,
  applyReceiptInventory,
  dispatchMasterRecords,
  masterListFromPath,
  prependById,
  prependToPaginatedList,
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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [activePage, setActivePage] = useState(initialPage);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({
    density: "comfortable",
    accent: "emerald",
  });
  const [dashboardPeriod, setDashboardPeriod] = useState("week");
  const [billingCheckout, setBillingCheckout] = useState(null);
  const [billingOpenRequest, setBillingOpenRequest] = useState(0);
  const [usersPage, setUsersPage] = useState(1);

  useEffect(() => {
    setSession(readStoredSession());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    setActivePage(initialPage);
    const storedCustomer = window.sessionStorage.getItem(
      SELECTED_CUSTOMER_KEY,
    );
    if (storedCustomer) setSelectedCustomer(storedCustomer);
  }, [initialPage]);

  const [pageAccessDraft, setPageAccessDraft] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [settingsApplyPending, setSettingsApplyPending] = useState(false);
  const [pageAccessApplyPending, setPageAccessApplyPending] = useState(false);

  const activeRole = normalizeRole(session?.role || "warehouse");
  const pageAccessFallback = useMemo(() => defaultPageAccess(), []);

  const showToast = (message, tone = "success") => {
    setToast({ message, tone });
  };

  const visiblePage = roleCanAccessPage(pageAccessFallback, activeRole, activePage)
    ? activePage
    : "dashboard";
  const shellContextQuery = useQuery(shellContextQueryOptions(session));
  const pageAccess = useMemo(() => {
    const raw = shellContextQuery.data?.pageAccess;
    if (raw && typeof raw === "object") return normalizePageAccess(raw);
    return pageAccessFallback;
  }, [shellContextQuery.data?.pageAccess, pageAccessFallback]);

  const visiblePageAuthorized = roleCanAccessPage(
    pageAccess,
    activeRole,
    activePage,
  )
    ? activePage
    : "dashboard";

  const billingStatus = shellContextQuery.data?.billingStatus || null;
  const siteBillingLocked = billingIsLocked(billingStatus);
  const canManageBillingSection =
    canManageBilling(activeRole) &&
    roleCanAccessPage(pageAccess, activeRole, "quan-ly");
  const billingLockPage = billingLockAllowedPage(canManageBillingSection);

  const navigate = useCallback(
    (page) => {
      setMobileNavOpen(false);
      if (!roleCanAccessPage(pageAccess, activeRole, page)) return;

      let targetPage = page;
      if (siteBillingLocked) {
        targetPage = billingLockEnforcePage(page, canManageBillingSection);
        if (canManageBillingSection && targetPage === "quan-ly" && page !== "quan-ly") {
          setBillingOpenRequest((count) => count + 1);
        }
      }

      const nextPath = pagePaths[targetPage] || pagePaths.dashboard;
      if (pagePaths[activePage] !== nextPath) {
        router.replace(nextPath);
      }
      setActivePage(targetPage);
    },
    [
      activePage,
      activeRole,
      canManageBillingSection,
      pageAccess,
      router,
      siteBillingLocked,
    ],
  );

  useEffect(() => {
    const ui = shellContextQuery.data?.ui;
    if (!ui) return;
    setSettings({
      accent: ui.accent === "slate" ? "slate" : "emerald",
      density: ui.density === "compact" ? "compact" : "comfortable",
    });
  }, [shellContextQuery.data?.ui]);

  useEffect(() => {
    if (!authReady) return;
    if (!session && pathname !== LOGIN_PATH) {
      router.replace(LOGIN_PATH);
    }
  }, [authReady, session, pathname, router]);

  useEffect(() => {
    if (!authReady || !session) return;
    if (pathname === LOGIN_PATH) {
      router.replace(pagePaths.dashboard);
    }
  }, [authReady, session, pathname, router]);

  useEffect(() => {
    if (!session || !shellContextQuery.isSuccess) return;
    const role = normalizeRole(session.role);
    if (roleCanAccessPage(pageAccess, role, activePage)) return;
    router.replace(pagePaths.dashboard);
  }, [session, activePage, pageAccess, router, shellContextQuery.isSuccess]);

  const hasSession = Boolean(session);
  const shellReady = hasSession && shellContextQuery.isSuccess;

  useEffect(() => {
    if (!shellReady || !siteBillingLocked) return;
    const fromUrl = pageIdFromPathname[pathname] || "dashboard";
    const targetPage = billingLockEnforcePage(fromUrl, canManageBillingSection);
    if (targetPage === "quan-ly" && fromUrl !== "quan-ly") {
      setBillingOpenRequest((count) => count + 1);
    }
    const targetPath = pagePaths[targetPage] || pagePaths.dashboard;
    if (pathname !== targetPath) {
      router.replace(targetPath);
    }
    if (activePage !== targetPage) {
      setActivePage(targetPage);
    }
  }, [
    activePage,
    canManageBillingSection,
    pathname,
    router,
    shellReady,
    siteBillingLocked,
  ]);

  const page = visiblePageAuthorized;
  const contentPage =
    siteBillingLocked && shellReady
      ? billingLockEnforcePage(page, canManageBillingSection)
      : page;
  const showBillingLockScreen =
    siteBillingLocked && shellReady && contentPage !== "quan-ly";

  const dashboardQuery = useQuery({
    ...dashboardSummaryQueryOptions(session),
    enabled: hasSession && contentPage === "dashboard" && !showBillingLockScreen,
  });
  const accountingContextQuery = useQuery({
    ...accountingContextQueryOptions(session),
    enabled: hasSession && contentPage === "bao-cao" && !showBillingLockScreen,
  });
  const needsMaster = contentPage === "quan-ly";
  const masterQuery = useQuery({
    ...pageQueryOptions("master", session),
    enabled: hasSession && needsMaster,
  });
  const receiptQuery = useQuery({
    ...pageQueryOptions("receipt", session),
    enabled: shellReady && contentPage === "nhap-hang" && !showBillingLockScreen,
  });
  const dispatchQuery = useQuery({
    ...pageQueryOptions("dispatch", session),
    enabled: shellReady && contentPage === "xuat-hang" && !showBillingLockScreen,
  });
  const usersQuery = useQuery({
    ...usersListQueryOptions(session, usersPage),
    enabled:
      Boolean(session) &&
      contentPage === "quan-ly" &&
      roleCanAccessPage(pageAccess, activeRole, "quan-ly"),
  });
  const billingQuery = useQuery({
    ...billingQueryOptions(session, { enabled: canManageBillingSection }),
    enabled:
      Boolean(session) && contentPage === "quan-ly" && canManageBillingSection,
  });

  useEffect(() => {
    if (contentPage !== "cai-dat") return;
    setPageAccessDraft(pageAccess);
    setSettingsDraft(settings);
  }, [contentPage, pageAccess, settings]);

  const pageCatalog = useMemo(() => {
    if (contentPage === "nhap-hang" && receiptQuery.data) {
      return {
        customers: receiptQuery.data.customers,
        drivers: receiptQuery.data.drivers,
        vehicles: receiptQuery.data.vehicles,
        warehouses: receiptQuery.data.warehouses || [],
      };
    }
    if (contentPage === "xuat-hang" && dispatchQuery.data) {
      return {
        customers: dispatchQuery.data.customers,
        drivers: dispatchQuery.data.drivers,
        vehicles: dispatchQuery.data.vehicles,
        warehouses: dispatchQuery.data.warehouses || [],
      };
    }
    if (contentPage === "bao-cao" && accountingContextQuery.data?.catalog) {
      return accountingContextQuery.data.catalog;
    }
    return masterQuery.data;
  }, [
    accountingContextQuery.data?.catalog,
    contentPage,
    dispatchQuery.data,
    masterQuery.data,
    receiptQuery.data,
  ]);

  const pageOperations = useMemo(() => {
    if (contentPage === "nhap-hang" && receiptQuery.data) {
      return {
        inventory: receiptQuery.data.inventory,
        receipts: receiptQuery.data.receipts,
      };
    }
    if (contentPage === "xuat-hang" && dispatchQuery.data) {
      return {
        dispatches: dispatchQuery.data.dispatches,
        inventory: dispatchQuery.data.inventory,
      };
    }
    return null;
  }, [contentPage, dispatchQuery.data, receiptQuery.data]);

  const pageAccounting =
    contentPage === "bao-cao" ? accountingContextQuery.data?.accounting : null;

  const isDashboardLoading =
    contentPage === "dashboard" &&
    !dashboardQuery.data &&
    dashboardQuery.isPending;
  const isAccountingLoading =
    contentPage === "bao-cao" &&
    !accountingContextQuery.data?.accounting &&
    accountingContextQuery.isPending;
  const isMasterLoading = needsMaster && !pageCatalog && masterQuery.isPending;
  const isReceiptLoading =
    contentPage === "nhap-hang" &&
    !receiptQuery.data &&
    receiptQuery.isPending;
  const isDispatchLoading =
    contentPage === "xuat-hang" &&
    !dispatchQuery.data &&
    dispatchQuery.isPending;
  const isUsersLoading =
    roleCanAccessPage(pageAccess, activeRole, "quan-ly") &&
    contentPage === "quan-ly" &&
    !usersQuery.data?.items &&
    usersQuery.isPending;
  const isPageLoading =
    shellReady &&
    !showBillingLockScreen &&
    (isDashboardLoading ||
      isAccountingLoading ||
      isMasterLoading ||
      isReceiptLoading ||
      isDispatchLoading ||
      isUsersLoading);

  const prefetchPage = useCallback(
    (pageName) => {
      if (!session?.id) return;
      const role = normalizeRole(session.role);
      if (!roleCanAccessPage(pageAccess, role, pageName)) return;
      switch (pageName) {
        case "dashboard":
          queryClient.prefetchQuery(dashboardSummaryQueryOptions(session));
          break;
        case "nhap-hang":
          queryClient.prefetchQuery(pageQueryOptions("receipt", session));
          break;
        case "xuat-hang":
          queryClient.prefetchQuery(pageQueryOptions("dispatch", session));
          break;
        case "bao-cao":
          queryClient.prefetchQuery(accountingContextQueryOptions(session));
          break;
        case "quan-ly":
          queryClient.prefetchQuery(pageQueryOptions("master", session));
          queryClient.prefetchQuery(usersListQueryOptions(session, 1));
          if (canManageBilling(role)) {
            queryClient.prefetchQuery(billingQueryOptions(session));
          }
          break;
        default:
          break;
      }
    },
    [pageAccess, queryClient, session],
  );

  const state = useMemo(
    () =>
      composeState({
        catalog: pageCatalog,
        master: pageCatalog,
        operations: pageOperations,
        accounting: pageAccounting,
      }),
    [pageAccounting, pageCatalog, pageOperations],
  );

  const invalidateAppContext = (contextPages = []) => {
    const pages = new Set(["shell", ...contextPages]);
    pages.forEach((contextPage) => {
      queryClient.invalidateQueries({
        queryKey: ["app-context", session?.id, session?.siteId, contextPage],
      });
    });
    queryClient.invalidateQueries({
      queryKey: ["dashboard-summary", session?.id, session?.siteId],
    });
    queryClient.invalidateQueries({ queryKey: ["receipts-list"] });
    queryClient.invalidateQueries({ queryKey: ["dispatches-list"] });
    queryClient.invalidateQueries({ queryKey: ["accounting-closures"] });
  };

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
      // Mark stale but only refetch the page currently on screen; hidden
      // pages already received an optimistic cache update and will refetch
      // when navigated to. Avoids background refetch storms after mutations.
      queryClient.invalidateQueries({
        queryKey: ["page-data", pageName],
        refetchType: "active",
      });
    });
  };

  const invalidateBilling = () => {
    queryClient.invalidateQueries({ queryKey: ["billing"] });
    invalidateAppContext(["shell"]);
  };

  const mutationOptions = {
    onError: (error) => {
      if (error?.code === "BILLING_REQUIRED" || error?.status === 402) {
        invalidateBilling();
        if (canManageBillingSection) {
          setBillingOpenRequest((count) => count + 1);
          navigate("quan-ly");
        }
      }
      showToast(parseApiError(error), "error");
    },
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
          receipts: prependToPaginatedList(data.receipts, receipt),
        };
      });
      updatePageData("dispatch", (data) => {
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
        };
      });
      updatePageData("master", (data) =>
        addMasterRecord(data, "customers", receiptMasterRecord(receipt)),
      );
      markPagesStale(["receipt", "dispatch"]);
      queryClient.invalidateQueries({ queryKey: ["receipts-list"] });
      invalidateAppContext(["accounting"]);
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
      const applyMasterToCatalog = (catalog) =>
        addMasterRecord(
          addMasterRecord(
            addMasterRecord(catalog, "customers", records.customer),
            "vehicles",
            records.vehicle,
          ),
          "drivers",
          records.driver,
        );
      updatePageData("dispatch", (data) => {
        const master = applyMasterToCatalog({
          customers: data.customers,
          drivers: data.drivers,
          vehicles: data.vehicles,
        });
        return {
          ...data,
          ...master,
          dispatches: prependToPaginatedList(data.dispatches, dispatch),
          inventory: applyDispatchInventory(data.inventory || [], dispatch),
        };
      });
      updatePageData("receipt", (data) => {
        const master = applyMasterToCatalog({
          customers: data.customers,
          drivers: data.drivers,
          vehicles: data.vehicles,
        });
        return {
          ...data,
          ...master,
          inventory: applyDispatchInventory(data.inventory || [], dispatch),
        };
      });
      updatePageData("master", (data) => applyMasterToCatalog(data));
      markPagesStale(["receipt", "dispatch"]);
      queryClient.invalidateQueries({ queryKey: ["dispatches-list"] });
      invalidateAppContext(["accounting"]);
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
      const patchCatalog = (catalog) => {
        if (variables.method === "DELETE") {
          const id = variables.path.split("/").filter(Boolean)[1];
          return removeMasterRecord(catalog, listName, id);
        }
        return addMasterRecord(catalog, listName, item);
      };
      if (listName === "warehouses") {
        ["accounting", "shell"].forEach((contextPage) => {
          queryClient.setQueryData(
            ["app-context", session?.id, session?.siteId, contextPage],
            (current) =>
              current?.catalog
                ? { ...current, catalog: patchCatalog(current.catalog) }
                : current,
          );
        });
      } else {
        updatePageData("master", (data) => patchCatalog(data));
      }
      markPagesStale(["master", "receipt", "dispatch"]);
      invalidateAppContext(["dashboard", "accounting"]);
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
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
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
        "/accounting/closures",
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
      queryClient.setQueryData(
        ["app-context", session?.id, session?.siteId, "accounting"],
        (current) => {
          if (!current?.accounting) return current;
          const closuresPage = current.accounting.closuresPage;
          return {
            ...current,
            accounting: {
              ...current.accounting,
              billingReady: (current.accounting.billingReady || []).filter(
                (item) =>
                  item.customerId !== payload.customerId ||
                  new Date(item.periodClosedAt || "").getTime() !==
                    new Date(payload.periodClosedAt || "").getTime(),
              ),
              closures: prependById(
                current.accounting.closures || [],
                invoiceApproval,
              ),
              closuresPage:
                closuresPage && (closuresPage.page ?? 1) === 1
                  ? prependToPaginatedList(closuresPage, invoiceApproval)
                  : closuresPage,
              invoiceApprovals: prependById(
                current.accounting.invoiceApprovals || [],
                invoiceApproval,
              ),
              ready: (current.accounting.ready || []).filter(
                (item) =>
                  item.customerId !== payload.customerId ||
                  new Date(item.periodClosedAt || "").getTime() !==
                    new Date(payload.periodClosedAt || "").getTime(),
              ),
            },
          };
        },
      );
      queryClient.setQueriesData(
        {
          queryKey: ["accounting-closures", session?.id, session?.siteId],
        },
        (current) => {
          if (!current || (current.page ?? 1) !== 1) return current;
          return prependToPaginatedList(current, invoiceApproval);
        },
      );
      ["receipt", "dispatch"].forEach((pageName) => {
        updatePageData(pageName, (data) =>
          resetCustomerInventory(data, payload.customerId, customer),
        );
      });
      invalidateAppContext(["dashboard", "accounting"]);
      void queryClient.refetchQueries({
        queryKey: ["accounting-closures", session?.id, session?.siteId],
        type: "active",
      });
      queryClient.invalidateQueries({ queryKey: ["dispatches-list"] });
      showToast("Đã ghi nhận hóa đơn");
    },
  });
  const billingCheckoutMutation = useMutation({
    ...mutationOptions,
    mutationFn: (payload = {}) =>
      apiRequest(
        "/billing/checkout",
        { body: JSON.stringify(payload), method: "POST" },
        session,
      ),
    onSuccess: (checkout) => {
      setBillingCheckout(checkout);
      invalidateBilling();
    },
  });
  const billingConfirmMutation = useMutation({
    ...mutationOptions,
    mutationFn: (paymentId) =>
      apiRequest(
        `/billing/payments/${paymentId}/confirm`,
        { method: "POST" },
        session,
      ),
    onSuccess: () => {
      setBillingCheckout(null);
      invalidateBilling();
      showToast("Đã ghi nhận chuyển khoản. Hóa đơn đang chờ admin duyệt.");
    },
  });
  const openBillingManagement = () => {
    setBillingOpenRequest((count) => count + 1);
    navigate("quan-ly");
  };
  const handleBillingCheckout = (payload) => {
    billingCheckoutMutation.mutate(payload || {});
  };
  const handleConfirmPayment = async (paymentRequest) => {
    const paymentId =
      typeof paymentRequest === "string"
        ? paymentRequest
        : paymentRequest?.payment?.id;

    if (paymentId) {
      return billingConfirmMutation.mutateAsync(paymentId);
    }

    if (paymentRequest?.bankTransfer?.isPreview) {
      try {
        const checkout = await billingCheckoutMutation.mutateAsync({
          billingInterval: paymentRequest.billingInterval,
          planCode: paymentRequest.plan?.code,
          transferContent: paymentRequest.bankTransfer.transferContent,
        });
        if (checkout?.payment?.id) {
          return await billingConfirmMutation.mutateAsync(checkout.payment.id);
        }
      } catch {
        // Mutation handlers show the parsed API error.
      }
    }
    return null;
  };
  const saveSession = (nextSession) => {
    const normalized = {
      ...nextSession,
      role: normalizeRole(nextSession.role),
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    setSession(normalized);
    setActivePage("dashboard");
    router.replace(pagePaths.dashboard);
  };

  const applyUiSettings = async () => {
    if (!settingsDraft || !session) return;
    setSettingsApplyPending(true);
    try {
      await saveAppSetting("ui", settingsDraft, session);
      setSettings(settingsDraft);
      queryClient.setQueryData(
        ["app-context", session.id, session.siteId, appContextPageFor(page)],
        (current) => (current ? { ...current, ui: settingsDraft } : current),
      );
      invalidateAppContext(["shell"]);
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
      await invalidateAppContext();
      setPageAccessDraft(nextAccess);
      showToast("Đã lưu cài đặt");
    } catch (error) {
      showToast(parseApiError(error), "error");
    } finally {
      setPageAccessApplyPending(false);
    }
  };

  if (!authReady) return <SessionBootstrapScreen />;
  if (!session) return <LoginScreen onLogin={saveSession} />;

  const pageMeta = pages[contentPage];

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
        billingLockPage={billingLockPage}
        mobileNavOpen={mobileNavOpen}
        navigate={navigate}
        onPrefetchPage={prefetchPage}
        pageAccess={pageAccess}
        session={session}
        siteBillingLocked={siteBillingLocked}
        onLogout={async () => {
          try {
            await logoutRequest();
          } catch {
            // Clear local session even if the API call fails.
          }
          window.localStorage.removeItem(SESSION_KEY);
          setSession(null);
          setMobileNavOpen(false);
          router.replace(LOGIN_PATH);
        }}
        onPasswordChange={(payload) => passwordMutation.mutateAsync(payload)}
        passwordPending={passwordMutation.isPending}
      />
      <section className="min-w-0 px-4 pb-8 pt-16 sm:px-6 lg:px-7 lg:pt-6">
        <header className="mb-5 flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-ui-title font-semibold tracking-tight text-zinc-900">
              {pageMeta.title}
            </h1>
            <p className="mt-1.5 max-w-3xl text-ui-sm leading-5 text-zinc-500">
              {pageMeta.subtitle}
            </p>
          </div>
          {contentPage === "dashboard" ? (
            <div className={operationActionButtonClass}>
              <PeriodSelect
                value={dashboardPeriod}
                onChange={setDashboardPeriod}
              />
            </div>
          ) : isPageLoading ? (
            <Skeleton className="h-7 w-28 justify-self-end self-end rounded-full" />
          ) : (
            <Badge
              className="w-fit justify-self-end self-end"
              tone={
                receiptQuery.isFetching || dispatchQuery.isFetching
                  ? "amber"
                  : "green"
              }
            >
              {receiptQuery.isFetching || dispatchQuery.isFetching
                ? "Đang đồng bộ"
                : "Dữ liệu mới nhất"}
            </Badge>
          )}
        </header>

        <div
          className={cn(
            "grid gap-4",
            settings.density === "compact" ? "gap-3" : "gap-4",
          )}
        >
          <div className="min-h-0">
          {billingStatus && !siteBillingLocked ? (
            <BillingBanner
              activeRole={activeRole}
              billing={billingStatus}
              onManageBilling={
                canManageBillingSection ? openBillingManagement : undefined
              }
            />
          ) : null}
          </div>
          <div
            className={cn(
              "grid min-h-[480px] content-start",
              settings.density === "compact" ? "gap-3" : "gap-4",
            )}
          >
          {isPageLoading ? <LoadingSkeleton page={contentPage} /> : null}
          {!isPageLoading && showBillingLockScreen ? (
            <BillingLockScreen />
          ) : null}
          {!isPageLoading &&
          !showBillingLockScreen &&
          contentPage === "dashboard" &&
          dashboardQuery.data ? (
            <DashboardPage
              dashboard={dashboardQuery.data}
              period={dashboardPeriod}
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
          {!isPageLoading && !showBillingLockScreen && contentPage === "nhap-hang" ? (
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
          {!isPageLoading && !showBillingLockScreen && contentPage === "xuat-hang" ? (
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
          {!isPageLoading && !showBillingLockScreen && contentPage === "bao-cao" ? (
            <ReportsPage
              activeRole={activeRole}
              mutation={invoiceMutation}
              session={session}
              state={state}
            />
          ) : null}
          {!isPageLoading && contentPage === "quan-ly" ? (
            <ManagementPage
              activeRole={activeRole}
              billing={billingQuery.data}
              billingOpenRequest={billingOpenRequest}
              sitePaywallLocked={siteBillingLocked}
              checkout={billingCheckout}
              checkoutPending={billingCheckoutMutation.isPending}
              confirmPending={billingConfirmMutation.isPending}
              mutation={masterMutation}
              state={state}
              userMutation={userMutation}
              users={usersQuery.data?.items || []}
              usersPage={usersQuery.data?.page || 1}
              usersPageCount={usersQuery.data?.pageCount || 1}
              usersTotal={usersQuery.data?.total || 0}
              onUsersPageChange={setUsersPage}
              onBillingCheckout={handleBillingCheckout}
              onCloseCheckout={() => setBillingCheckout(null)}
              onConfirmPayment={handleConfirmPayment}
              onToast={showToast}
            />
          ) : null}
          {!isPageLoading && !showBillingLockScreen && contentPage === "cai-dat" ? (
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
        </div>
      </section>
    </main>
    </>
  );
}
