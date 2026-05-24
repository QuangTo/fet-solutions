"use client";

import {
  BellRing,
  ChevronRight,
  CreditCard,
  QrCode,
  ReceiptText,
} from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/fet-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../../components/data-table";
import { money } from "../../lib/format";
import { billingCopy, invoiceCopy } from "./billing-copy";
import { BillingMetric } from "./billing-metric";

export function BillingSection({ billing, isActive, onToggle }) {
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const subscription = billing?.subscription || {};
  const invoices = billing?.invoices || [];
  const latestInvoice = invoices[0];
  const siteStatus = billingCopy(billing?.billingStatus);
  const subscriptionStatus = billingCopy(subscription.status, "Chưa có gói");
  const paymentStatus = invoiceCopy(latestInvoice?.status);
  const nextPaymentDate =
    subscription.currentPeriodEnd ||
    latestInvoice?.dueDate ||
    billing?.trialEndsAt;
  const planName =
    subscription.planName ||
    (billing?.billingStatus === "trialing" ? "Free Trial" : "Chưa chọn gói");
  const periodLabel =
    subscription.currentPeriodStart && subscription.currentPeriodEnd
      ? `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`
      : "Chưa có kỳ";
  const amountLabel = latestInvoice
    ? money(latestInvoice.amount, latestInvoice.currency)
    : "Chưa phát sinh";
  const paidAtLabel = latestInvoice?.paidAt
    ? formatDate(latestInvoice.paidAt)
    : paymentStatus.label;

  return (
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
                    Gói, kỳ thanh toán và phương thức chi trả.
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <BillingMetric
                detail={subscriptionStatus.label}
                label="Gói"
                value={planName}
              />
              <BillingMetric
                detail={periodLabel}
                label="Kỳ"
                value="Tháng này"
              />
              <BillingMetric
                detail={paidAtLabel}
                label="Đã trả"
                value={amountLabel}
              />
              <BillingMetric
                detail={reminderEnabled ? "Nhắc trước 3 ngày" : "Tắt nhắc hạn"}
                label="Hạn tới"
                value={
                  nextPaymentDate ? formatDate(nextPaymentDate) : "Chưa có"
                }
              />
            </div>

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-slate-300 bg-[linear-gradient(135deg,#0f172a_25%,transparent_25%),linear-gradient(225deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(315deg,#0f172a_25%,#ffffff_25%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] text-white">
                  <QrCode className="h-7 w-7 rounded bg-white p-1 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-slate-950">
                      QR ngân hàng
                    </h3>
                    <Badge tone="default">Mock</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                    FET {billing?.siteName || "Default Site"} · {amountLabel}
                  </p>
                </div>
              </div>
              <label className="flex w-fit max-w-full items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  checked={reminderEnabled}
                  className="h-4 w-4 accent-emerald-600"
                  type="checkbox"
                  onChange={(event) => setReminderEnabled(event.target.checked)}
                />
                <BellRing className="h-4 w-4 text-emerald-700" />
                Nhắc hạn
              </label>
            </div>

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
                  invoices.slice(0, 5).map((invoice) => {
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
  );
}
