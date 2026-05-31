"use client";

import {
  ChevronRight,
  CreditCard,
  LoaderCircle,
  ReceiptText,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildBillingPaymentView } from "@/lib/billing-payment-view";
import {
  buildPaymentPreview,
  buildTransferContent,
  resolveDueDates,
} from "@/lib/billing-pricing";
import { trialDaysRemaining } from "@/lib/billing-utils";
import { formatDate } from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../../components/data-table";
import { Pagination } from "../../components/pagination";
import { money } from "../../lib/format";
import { paginate } from "../../lib/pagination";
import { invoiceCopy } from "./billing-copy";
import { BillingPayDialog } from "./billing-pay-dialog";
import { BillingPlanPricing } from "./billing-plan-pricing";
import { billingBodyClass, billingValueClass } from "./billing-typography";

export function BillingSection({
  billing,
  checkout,
  checkoutPending,
  confirmPending,
  isActive,
  onCheckout,
  onConfirmPayment,
  onCloseCheckout,
  onToast,
  onToggle,
}) {
  const subscription = billing?.subscription || {};
  const bankTransfer = billing?.bankTransfer || {};
  const plans = billing?.plans || [];
  const invoices = billing?.invoices || [];
  const openInvoice = billing?.openInvoice;
  const pendingPayment = billing?.pendingPayment;
  const currentPlanCode =
    bankTransfer.effectivePlanCode ||
    subscription.planCode ||
    "plus";

  const [billingInterval, setBillingInterval] = useState("monthly");
  const [selectedPlanCode, setSelectedPlanCode] = useState(currentPlanCode);
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogLoading, setPaymentDialogLoading] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [confirmedPayment, setConfirmedPayment] = useState(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);

  const invoicePagination = useMemo(
    () => paginate(invoices, invoicePage, 10),
    [invoicePage, invoices],
  );

  const paymentView = useMemo(() => {
    const view = checkout || paymentPreview || buildBillingPaymentView(billing);
    if (!view || !confirmedPayment) return view;
    return {
      ...view,
      bankTransfer: {
        ...view.bankTransfer,
        isPreview: false,
      },
      payment: {
        ...(view.payment || {}),
        ...confirmedPayment,
        status: confirmedPayment.status || "awaiting_review",
      },
    };
  }, [billing, checkout, confirmedPayment, paymentPreview]);

  useEffect(() => {
    setSelectedPlanCode((current) => current || currentPlanCode || "plus");
  }, [currentPlanCode]);

  useEffect(() => {
    if (!planPickerOpen) return;
    const preferredUpgrade =
      currentPlanCode === "plus"
        ? plans.find((plan) => plan.code === "pro")?.code
        : null;
    setSelectedPlanCode(
      preferredUpgrade || currentPlanCode || plans[0]?.code || "plus",
    );
  }, [currentPlanCode, planPickerOpen, plans]);

  useEffect(() => {
    if (checkout) {
      setPaymentDialogLoading(false);
      setPaymentDialogOpen(true);
    }
  }, [checkout]);

  const selectedPlan =
    plans.find((plan) => plan.code === selectedPlanCode) ||
    plans.find((plan) => plan.code === currentPlanCode) ||
    plans[0];

  const trialDays = trialDaysRemaining(billing?.trialEndsAt);
  const effectivePlanName =
    bankTransfer.effectivePlanName ||
    subscription.planName ||
    (billing?.billingStatus === "trialing" ? "Plus" : "Chưa chọn gói");
  const planName =
    billing?.billingStatus === "trialing"
      ? `${effectivePlanName} · Dùng thử`
      : effectivePlanName;
  const dueDates = useMemo(
    () =>
      resolveDueDates({
        billingStatus: billing?.billingStatus,
        openInvoice,
        subscription,
        trialEndsAt: billing?.trialEndsAt,
      }),
    [billing?.billingStatus, billing?.trialEndsAt, openInvoice, subscription],
  );
  const periodLabel =
    subscription.currentPeriodStart && subscription.currentPeriodEnd
      ? `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`
      : billing?.billingStatus === "trialing"
        ? "Gói Plus trong trial"
        : "Chưa có kỳ";
  const maxUsers = selectedPlan?.maxUsers ?? subscription.maxUsers;
  const maxVehicles = selectedPlan?.maxVehicles ?? subscription.maxVehicles;
  const maxCustomers = selectedPlan?.maxCustomers ?? subscription.maxCustomers;
  const maxWarehouses =
    selectedPlan?.maxWarehouses ?? subscription.maxWarehouses;
  const usageLabel = [
    `${billing?.userCount ?? 0}/${maxUsers ?? "∞"} Người dùng`,
    `${billing?.customerCount ?? 0}/${maxCustomers ?? "∞"} Đối tác`,
    `${billing?.vehicleCount ?? 0}/${maxVehicles ?? "∞"} Xe`,
    `${billing?.warehouseCount ?? 0}/${maxWarehouses ?? "∞"} Kho`,
  ].join(" · ");
  const invoiceAwaitingReview =
    openInvoice?.status === "pending" ||
    pendingPayment?.status === "awaiting_review";
  const canChangePlan = plans.length > 0 && !invoiceAwaitingReview;
  const showCheckoutButton = !invoiceAwaitingReview;
  const showPaymentInfoButton = Boolean(
    paymentView && openInvoice && bankTransfer.accountNumber,
  );
  const paymentDueLabel = dueDates.paymentDueDate
    ? formatDate(dueDates.paymentDueDate)
    : "Chưa có hóa đơn cần thanh toán";

  const handleCheckout = (payload = {}) => {
    const nextPlanCode = payload.planCode || selectedPlanCode;
    const nextInterval = payload.billingInterval || billingInterval;
    const nextPlan =
      plans.find((plan) => plan.code === nextPlanCode) || selectedPlan;

    if (payload.planCode) setSelectedPlanCode(payload.planCode);
    if (payload.billingInterval) setBillingInterval(payload.billingInterval);
    setPlanPickerOpen(false);
    setConfirmedPayment(null);

    if (pendingPayment?.status === "awaiting_review") {
      setPaymentPreview(null);
      setConfirmedPayment(pendingPayment);
      setPaymentDialogOpen(true);
      return;
    }

    const previewTransferContent = buildTransferContent({
      paymentId: window.crypto?.randomUUID?.() || String(Date.now()),
      planCode: nextPlanCode,
      siteCode: billing?.siteCode,
    });

    setPaymentDialogOpen(true);
    setPaymentDialogLoading(true);

    window.setTimeout(() => {
      setPaymentPreview({
        billingInterval: nextInterval,
        bankTransfer: buildPaymentPreview({
          bankTransfer,
          billingInterval: nextInterval,
          contactPhone: billing?.contactPhone,
          plan: nextPlan,
          siteCode: billing?.siteCode,
          transferContent: previewTransferContent,
        }),
        invoice: null,
        payment: null,
        plan: nextPlan,
      });
      setPaymentDialogLoading(false);
    }, 180);
  };

  const handlePayNow = () => {
    if (
      openInvoice?.status === "open" &&
      pendingPayment &&
      bankTransfer.accountNumber
    ) {
      setPaymentDialogOpen(true);
      return;
    }
    handleCheckout();
  };

  const handleClosePayment = () => {
    setPaymentDialogOpen(false);
    setPaymentDialogLoading(false);
    setPaymentPreview(null);
    setConfirmedPayment(null);
    onCloseCheckout?.();
  };

  const handleConfirmPayment = async (view) => {
    try {
      const confirmed = await onConfirmPayment?.(view);
      if (!confirmed) {
        if (pendingPayment?.status === "awaiting_review") {
          setPaymentPreview(null);
          setConfirmedPayment(pendingPayment);
        }
        return;
      }
      setConfirmedPayment({
        ...confirmed,
        status: confirmed.status || "awaiting_review",
      });
    } catch {
      // Mutation handlers show the parsed API error.
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <button
          aria-expanded={isActive}
          className={cn(
            "flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-slate-50 sm:px-5",
            isActive && "border-b border-slate-100 bg-slate-50",
          )}
          onClick={onToggle}
          type="button"
        >
          <strong className="text-base font-bold leading-tight text-slate-950">
            Thanh toán
          </strong>
          <ChevronRight
            className={cn(
              "h-6 w-6 shrink-0 text-slate-500 transition",
              isActive && "rotate-90 text-emerald-700",
            )}
          />
        </button>
        {isActive ? (
          <>
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-600 text-white shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-ui-base font-bold leading-tight text-slate-950">
                        {planName}
                      </h3>
                    </div>
                    <CardDescription className="mt-1">
                      {invoiceAwaitingReview
                        ? "Đã ghi nhận chuyển khoản, đang chờ admin duyệt."
                        : billing?.billingStatus === "trialing" && trialDays != null
                          ? `Trial gói Plus còn ${trialDays} ngày.`
                          : billing?.billingStatus === "active"
                            ? "Gói đang hoạt động, theo dõi hạn và lịch sử hóa đơn tại đây."
                            : "Chọn gói, tạo hóa đơn và chuyển khoản theo thông tin ngân hàng."}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
                  {canChangePlan ? (
                    <Button
                      className="w-full sm:w-auto"
                      type="button"
                      variant="outline"
                      onClick={() => setPlanPickerOpen(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Thay đổi gói
                    </Button>
                  ) : null}
                  {showPaymentInfoButton ? (
                    <Button
                      className={cn(
                        "w-full sm:w-auto",
                        invoiceAwaitingReview &&
                          "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950",
                      )}
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentDialogOpen(true)}
                    >
                      Thông tin chuyển khoản
                    </Button>
                  ) : null}
                  {showCheckoutButton ? (
                    <Button
                      className="w-full sm:w-auto"
                      disabled={checkoutPending}
                      type="button"
                      onClick={handlePayNow}
                    >
                      {checkoutPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      {openInvoice?.status === "open"
                        ? "Thanh toán ngay"
                        : "Thông tin thanh toán"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-3 sm:p-4 lg:p-5">
              <section className="grid gap-2">
                <div className="grid gap-2 px-1">
                  <div>
                    <h3 className={billingValueClass}>Lịch sử thanh toán</h3>
                    <p className={billingBodyClass}>
                      Theo dõi hóa đơn phát sinh, hạn thanh toán và trạng thái duyệt.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-ui-sm text-slate-600">
                    <span>
                      <strong className="font-semibold text-slate-900">Sử dụng:</strong>{" "}
                      {usageLabel}
                    </span>
                    <span>
                      <strong className="font-semibold text-slate-900">Kỳ:</strong>{" "}
                      {periodLabel}
                    </span>
                    <span>
                      <strong className="font-semibold text-slate-900">Hạn thanh toán:</strong>{" "}
                      {paymentDueLabel}
                    </span>
                  </div>
                </div>
                <DataTable width="billingInvoices">
                  <thead>
                    <tr>
                      <Th>Hóa đơn</Th>
                      <Th>Gói</Th>
                      <Th>Số tiền</Th>
                      <Th>Trạng thái</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length ? (
                      invoicePagination.rows.map((invoice) => {
                        const rejected =
                          invoice.paymentStatus === "failed" ||
                          Boolean(invoice.paymentMeta?.rejectedAt);
                        const status = rejected
                          ? { label: "Đã từ chối", tone: "red" }
                          : invoiceCopy(invoice.status);
                        return (
                          <tr key={invoice.id}>
                            <Td>
                              <span className="inline-flex items-center gap-2">
                                <ReceiptText className="h-4 w-4 text-slate-400" />
                                {formatDate(invoice.createdAt)}
                              </span>
                            </Td>
                            <Td>{invoice.planName || invoice.planCode || "Chưa rõ"}</Td>
                            <Td>{money(invoice.amount, invoice.currency)}</Td>
                            <Td>
                              <Badge
                                className={cn(
                                  status.tone === "amber" &&
                                    "text-amber-900",
                                )}
                                tone={status.tone}
                              >
                                {status.label}
                              </Badge>
                            </Td>
                          </tr>
                        );
                      })
                    ) : (
                      <EmptyRow colSpan={4}>Chưa có hóa đơn billing.</EmptyRow>
                    )}
                  </tbody>
                </DataTable>
                <Pagination
                  page={invoicePagination.page}
                  pageCount={invoicePagination.pageCount}
                  onPageChange={setInvoicePage}
                />
              </section>
            </div>
          </>
        ) : null}
      </Card>

      <BillingPayDialog
        confirmPending={confirmPending || checkoutPending}
        loading={paymentDialogLoading}
        open={paymentDialogOpen && (paymentDialogLoading || Boolean(paymentView))}
        paymentView={paymentView}
        onClose={handleClosePayment}
        onConfirm={handleConfirmPayment}
        onToast={onToast}
      />

      <Dialog
        open={planPickerOpen && canChangePlan}
        onOpenChange={setPlanPickerOpen}
      >
        <DialogContent
          className="max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-4xl gap-0 overflow-hidden rounded-xl border-0 bg-[#faf8ff] p-0 shadow-[0_20px_60px_rgba(19,27,46,0.18)]"
          hideClose
        >
          <div className="grid h-12 grid-cols-[2rem_1fr_2rem] items-center gap-2 bg-[#faf8ff] px-3 sm:px-4">
            <span aria-hidden="true" />
            <DialogTitle className="text-center text-base font-bold leading-tight text-[#263149]">
              Thay đổi gói
            </DialogTitle>
            <DialogDescription className="sr-only">
              Chọn chu kỳ thanh toán và gói dịch vụ phù hợp.
            </DialogDescription>
            <DialogClose asChild>
              <Button
                aria-label="Đóng"
                className="h-8 w-8 rounded-full text-[#00a669] hover:bg-[#f2f3ff]"
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          {plans.length ? (
            <div className="max-h-[calc(100vh-80px)] overflow-y-auto px-2.5 pb-3 sm:px-5 sm:pb-5">
              <div className="overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                <BillingPlanPricing
                  billingInterval={billingInterval}
                  checkoutPending={checkoutPending}
                  currentPlanCode={currentPlanCode}
                  plans={plans}
                  selectedPlanCode={selectedPlanCode}
                  onCheckout={handleCheckout}
                  onIntervalChange={setBillingInterval}
                  onSelectPlan={setSelectedPlanCode}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
