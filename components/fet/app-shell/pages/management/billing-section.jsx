"use client";

import {
  ChevronRight,
  CreditCard,
  LoaderCircle,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildBillingPaymentView } from "@/lib/billing-payment-view";
import {
  buildPaymentPreview,
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
  activeRole,
  approvePending,
  billing,
  checkout,
  checkoutPending,
  confirmPending,
  isActive,
  onApprove,
  onCheckout,
  onConfirmPayment,
  onCloseCheckout,
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
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);

  const invoicePagination = useMemo(
    () => paginate(invoices, invoicePage, 10),
    [invoicePage, invoices],
  );

  const paymentView = useMemo(
    () => checkout || paymentPreview || buildBillingPaymentView(billing),
    [billing, checkout, paymentPreview],
  );

  useEffect(() => {
    setSelectedPlanCode((current) => current || currentPlanCode || "plus");
  }, [currentPlanCode]);

  useEffect(() => {
    if (checkout) setPaymentDialogOpen(true);
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
  const usageLabel =
    maxUsers || maxVehicles
      ? `${billing?.userCount ?? 0}/${maxUsers ?? "∞"} users · ${billing?.vehicleCount ?? 0}/${maxVehicles ?? "∞"} xe`
      : `${billing?.userCount ?? 0} users · ${billing?.vehicleCount ?? 0} xe`;
  const invoiceAwaitingReview =
    openInvoice?.status === "pending" ||
    pendingPayment?.status === "awaiting_review";
  const showCheckoutButton = !invoiceAwaitingReview;
  const showPaymentInfoButton = Boolean(
    paymentView && openInvoice && bankTransfer.accountNumber,
  );
  const showApproveButton =
    activeRole === "admin" && pendingPayment?.status === "awaiting_review";
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

    setPaymentPreview({
      billingInterval: nextInterval,
      bankTransfer: buildPaymentPreview({
        bankTransfer,
        billingInterval: nextInterval,
        contactPhone: billing?.contactPhone,
        plan: nextPlan,
      }),
      invoice: null,
      payment: null,
      plan: nextPlan,
    });
    setPaymentDialogOpen(true);
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
    setPaymentPreview(null);
    onCloseCheckout?.();
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
                  {plans.length ? (
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
                      className="w-full sm:w-auto"
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
                  {showApproveButton ? (
                    <Button
                      className="w-full sm:w-auto"
                      disabled={approvePending}
                      type="button"
                      variant="secondary"
                      onClick={() => onApprove(pendingPayment.id)}
                    >
                      {approvePending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      Xác nhận thanh toán
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
                      <strong className="font-semibold text-slate-900">Gói:</strong>{" "}
                      {planName}
                    </span>
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
                        const status = invoiceCopy(invoice.status);
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
                              <Badge tone={status.tone}>{status.label}</Badge>
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
        open={paymentDialogOpen && Boolean(paymentView)}
        paymentView={paymentView}
        onClose={handleClosePayment}
        onConfirm={onConfirmPayment}
      />

      <Dialog open={planPickerOpen} onOpenChange={setPlanPickerOpen}>
        <DialogContent className="max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-5xl overflow-y-auto p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <DialogTitle className={billingValueClass}>
              Chọn gói cho {billing?.siteName?.trim() || "khách hàng"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-ui-sm text-slate-500">
              So sánh các gói và chọn gói phù hợp. Sau khi chọn, hệ thống sẽ
              tạo hóa đơn để thanh toán.
            </DialogDescription>
          </div>
          {plans.length ? (
            <div className="p-3 sm:p-4 lg:p-5">
              <BillingPlanPricing
                billingInterval={billingInterval}
                checkoutPending={checkoutPending}
                currentPlanCode={currentPlanCode}
                currentPlanName={
                  subscription.planName ||
                  bankTransfer.effectivePlanName ||
                  "Plus"
                }
                plans={plans}
                selectedPlanCode={selectedPlanCode}
                siteName={billing?.siteName}
                onCheckout={handleCheckout}
                onIntervalChange={setBillingInterval}
                onSelectPlan={setSelectedPlanCode}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
