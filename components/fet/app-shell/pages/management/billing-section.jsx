"use client";

import { ChevronRight, CreditCard, LoaderCircle, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  billingIntervalLabel,
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
  CardTitle,
} from "@/components/ui/card";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../../components/data-table";
import { money } from "../../lib/format";
import {
  billingCopy,
  invoiceCopy,
  paymentCopy,
} from "./billing-copy";
import { BillingMetric } from "./billing-metric";
import { BillingPayDialog } from "./billing-pay-dialog";
import { BillingPlanPricing } from "./billing-plan-pricing";

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
  payDialogOpen,
}) {
  const subscription = billing?.subscription || {};
  const bankTransfer = billing?.bankTransfer || {};
  const plans = billing?.plans || [];
  const invoices = billing?.invoices || [];
  const latestPaidInvoice = invoices.find((invoice) => invoice.status === "paid");
  const openInvoice = billing?.openInvoice;
  const pendingPayment = billing?.pendingPayment;
  const currentPlanCode =
    bankTransfer.effectivePlanCode ||
    subscription.planCode ||
    (billing?.billingStatus === "trialing" ? "plus" : "plus");

  const [billingInterval, setBillingInterval] = useState("monthly");
  const [selectedPlanCode, setSelectedPlanCode] = useState(currentPlanCode);

  useEffect(() => {
    setSelectedPlanCode((current) => current || currentPlanCode || "plus");
  }, [currentPlanCode]);

  const selectedPlan =
    plans.find((plan) => plan.code === selectedPlanCode) ||
    plans.find((plan) => plan.code === currentPlanCode) ||
    plans[0];

  const previewTransfer = useMemo(
    () =>
      buildPaymentPreview({
        bankTransfer,
        billingInterval,
        openInvoice,
        pendingPayment,
        plan: selectedPlan,
        siteCode: billing?.siteCode,
      }),
    [
      bankTransfer,
      billing?.siteCode,
      billingInterval,
      openInvoice,
      pendingPayment,
      selectedPlan,
    ],
  );

  const siteStatus = billingCopy(billing?.billingStatus);
  const subscriptionStatus = billingCopy(subscription.status, "Chưa có gói");
  const openInvoiceStatus = openInvoice
    ? invoiceCopy(openInvoice.status)
    : { label: "Preview", tone: "default" };
  const paymentStatus = pendingPayment
    ? paymentCopy(pendingPayment.status)
    : openInvoice
      ? openInvoiceStatus
      : { label: "QR preview", tone: "default" };
  const trialDays = trialDaysRemaining(billing?.trialEndsAt);
  const effectivePlanName =
    previewTransfer.effectivePlanName ||
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
  const paymentDueLabel = dueDates.paymentDueDate
    ? formatDate(dueDates.paymentDueDate)
    : formatDate(dueDates.previewDueDate);
  const periodLabel =
    subscription.currentPeriodStart && subscription.currentPeriodEnd
      ? `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`
      : billing?.billingStatus === "trialing"
        ? "Gói Plus trong trial"
        : "Chưa có kỳ";
  const amountLabel = previewTransfer.amount
    ? money(previewTransfer.amount, previewTransfer.currency || "VND")
    : "Chưa phát sinh";
  const paidLabel = latestPaidInvoice
    ? `${money(latestPaidInvoice.amount, latestPaidInvoice.currency)} · ${formatDate(latestPaidInvoice.paidAt)}`
    : "Chưa thanh toán";
  const maxUsers = selectedPlan?.maxUsers ?? subscription.maxUsers;
  const maxVehicles = selectedPlan?.maxVehicles ?? subscription.maxVehicles;
  const usageLabel =
    maxUsers || maxVehicles
      ? `${billing?.userCount ?? 0}/${maxUsers ?? "∞"} users · ${billing?.vehicleCount ?? 0}/${maxVehicles ?? "∞"} xe`
      : `${billing?.userCount ?? 0} users · ${billing?.vehicleCount ?? 0} xe`;
  const showCheckoutButton =
    !pendingPayment || pendingPayment.status === "pending";
  const showApproveButton =
    activeRole === "admin" && pendingPayment?.status === "awaiting_review";

  const handleCheckout = (payload = {}) => {
    const nextPlanCode = payload.planCode || selectedPlanCode;
    const nextInterval = payload.billingInterval || billingInterval;
    if (payload.planCode) setSelectedPlanCode(payload.planCode);
    if (payload.billingInterval) setBillingInterval(payload.billingInterval);
    onCheckout({
      billingInterval: nextInterval,
      planCode: nextPlanCode,
    });
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
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle>Thanh toán</CardTitle>
                    <CardDescription>
                      Chọn gói, chu kỳ trả phí và quét QR chuyển khoản.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={siteStatus.tone}>{siteStatus.label}</Badge>
                  <Badge tone={paymentStatus.tone}>{paymentStatus.label}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  {billing?.billingStatus === "trialing" && trialDays != null
                    ? `Trial gói Plus · còn ${trialDays} ngày`
                    : billing?.billingStatus === "active"
                      ? "Gói đang hoạt động"
                      : "Cần xử lý thanh toán"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {showCheckoutButton ? (
                    <Button
                      disabled={checkoutPending}
                      size="sm"
                      type="button"
                      onClick={() => handleCheckout()}
                    >
                      {checkoutPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      {openInvoice ? "Thanh toán ngay" : "Tạo mã thanh toán"}
                    </Button>
                  ) : null}
                  {showApproveButton ? (
                    <Button
                      disabled={approvePending}
                      size="sm"
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

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <BillingMetric
                  detail={subscriptionStatus.label}
                  label="Gói"
                  value={planName}
                />
                <BillingMetric detail={usageLabel} label="Sử dụng" value={periodLabel} />
                <BillingMetric
                  detail={paidLabel}
                  label="Lần trả gần nhất"
                  value={amountLabel}
                />
                <BillingMetric
                  detail={
                    dueDates.paymentDueDate
                      ? dueDates.headlineDetail
                      : billing?.billingStatus === "trialing" && trialDays != null
                        ? `Còn ${trialDays} ngày dùng thử`
                        : dueDates.headlineDetail
                  }
                  label="Hạn tới"
                  value={
                    dueDates.headlineDate
                      ? formatDate(dueDates.headlineDate)
                      : "Chưa có"
                  }
                />
              </div>

              {plans.length ? (
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
              ) : null}

              {previewTransfer.accountNumber ? (
                <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    {previewTransfer.qrImageUrl ? (
                      <img
                        alt="QR chuyển khoản"
                        className="h-24 w-24 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1"
                        height={96}
                        src={previewTransfer.qrImageUrl}
                        width={96}
                      />
                    ) : (
                      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-md border border-slate-300 bg-slate-100 text-xs font-bold text-slate-500">
                        QR
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-950">
                          {previewTransfer.bankName}
                        </h3>
                        <Badge tone="default">Chuyển khoản</Badge>
                        <Badge tone="default">
                          {billingIntervalLabel(
                            previewTransfer.billingInterval || billingInterval,
                          )}
                        </Badge>
                        {previewTransfer.isPreview ? (
                          <Badge tone="amber">Preview</Badge>
                        ) : (
                          <Badge tone="green">Hóa đơn mở</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {previewTransfer.accountNumber} · {previewTransfer.accountName}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {amountLabel} · {previewTransfer.transferContent || "Chưa có nội dung CK"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Hạn thanh toán: {paymentDueLabel}
                      </p>
                    </div>
                  </div>
                  {pendingPayment?.status === "pending" ? (
                    <Button
                      disabled={confirmPending}
                      size="sm"
                      type="button"
                      onClick={() => onConfirmPayment(pendingPayment.id)}
                    >
                      Tôi đã chuyển
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <DataTable width="billingInvoices">
                <thead>
                  <tr>
                    <Th>Hóa đơn</Th>
                    <Th>Số tiền</Th>
                    <Th>Hạn</Th>
                    <Th>Trạng thái</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length ? (
                    invoices.slice(0, 8).map((invoice) => {
                      const status = invoiceCopy(invoice.status);
                      return (
                        <tr key={invoice.id}>
                          <Td>
                            <span className="inline-flex items-center gap-2">
                              <ReceiptText className="h-4 w-4 text-slate-400" />
                              {formatDate(invoice.createdAt)}
                            </span>
                          </Td>
                          <Td>{money(invoice.amount, invoice.currency)}</Td>
                          <Td>{formatDate(invoice.dueDate)}</Td>
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
            </div>
          </>
        ) : null}
      </Card>

      <BillingPayDialog
        checkout={checkout}
        confirmPending={confirmPending}
        open={payDialogOpen}
        onClose={onCloseCheckout}
        onConfirm={onConfirmPayment}
      />
    </>
  );
}
