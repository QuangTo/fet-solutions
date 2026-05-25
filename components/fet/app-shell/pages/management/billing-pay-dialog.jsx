"use client";

import { AlertCircle, Copy, Lightbulb, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { money } from "../../lib/format";
import { invoiceCopy, paymentCopy } from "./billing-copy";
import {
  billingHighlightClass,
  billingLabelClass,
  billingMutedClass,
  billingValueClass,
} from "./billing-typography";

async function copyText(value) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
}

function CopyButton({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label={`Sao chép ${label}`}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      type="button"
      onClick={async () => {
        await copyText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="h-4 w-4" />
      <span className="sr-only">{copied ? "Đã sao chép" : "Sao chép"}</span>
    </button>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className={cn("w-[7.5rem] shrink-0", billingMutedClass)}>{label}</span>
      <span className={cn("min-w-0 flex-1", billingValueClass)}>{value}</span>
      <CopyButton label={label} value={value} />
    </div>
  );
}

function QrBlock({ alt, label, src }) {
  return (
    <div className="text-center">
      {label ? (
        <p className={cn("mb-2", billingLabelClass)}>{label}</p>
      ) : null}
      <div className="inline-block rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <img
          alt={alt}
          className="h-36 w-36 object-contain sm:h-40 sm:w-40"
          height={160}
          src={src}
          width={160}
        />
      </div>
    </div>
  );
}

export function BillingPayDialog({
  confirmPending,
  onClose,
  onConfirm,
  open,
  paymentView,
}) {
  if (!paymentView) return null;

  const { bankTransfer, invoice, payment } = paymentView;
  const paymentStatus = payment ? paymentCopy(payment.status) : null;
  const invoiceStatus = invoice ? invoiceCopy(invoice.status) : null;
  const canConfirm = payment?.status === "pending";
  const amount = money(
    invoice?.amount || bankTransfer?.amount,
    invoice?.currency,
  );
  const statusBadge =
    payment?.status === "awaiting_review"
      ? paymentStatus
      : invoiceStatus || { label: "Chờ thanh toán", tone: "amber" };
  const hasQr = Boolean(
    bankTransfer?.qrImageUrl || bankTransfer?.momoQrImageUrl,
  );

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-y-auto p-0">
        <div className="border-b border-slate-100 px-5 py-4 pr-12">
          <DialogTitle className={billingValueClass}>Thanh toán chuyển khoản</DialogTitle>
        </div>

        <div className="grid gap-0 px-5 py-4">
          <div>
            <p className={billingMutedClass}>Số tiền cần thanh toán</p>
            <p className={cn("mt-1", billingHighlightClass)}>{amount}</p>
            <Badge
              className={cn(
                "mt-2.5 h-auto px-2.5 py-0.5 text-ui-xs font-semibold",
                statusBadge.tone === "amber" &&
                  "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
                statusBadge.tone === "blue" &&
                  "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
                statusBadge.tone === "green" &&
                  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
              )}
              tone={statusBadge.tone}
            >
              {statusBadge.label}
            </Badge>
          </div>

          <hr className="my-4 border-slate-200" />

          <div>
            <DetailRow label="Ngân hàng" value={bankTransfer?.bankName || ""} />
            <DetailRow
              label="Số tài khoản"
              value={bankTransfer?.accountNumber || ""}
            />
            <DetailRow
              label="Chủ tài khoản"
              value={bankTransfer?.accountName || ""}
            />
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className={cn(billingLabelClass, "text-amber-800")}>
                  Nội dung chuyển khoản (Bắt buộc ghi đúng)
                </p>
                <p className={cn("mt-1.5 break-all", billingValueClass, "text-amber-950")}>
                  {bankTransfer?.transferContent || "—"}
                </p>
              </div>
              {bankTransfer?.transferContent ? (
                <CopyButton
                  label="Nội dung chuyển khoản"
                  value={bankTransfer.transferContent}
                />
              ) : null}
            </div>
          </div>

          {hasQr ? (
            <div className="mt-5">
              <p className={cn("flex items-start gap-2", billingMutedClass)}>
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  Mẹo: Quét mã QR dưới đây để tự động điền thông tin chuyển
                  khoản.
                </span>
              </p>
              <div
                className={cn(
                  "mt-3 flex justify-center",
                  bankTransfer?.qrImageUrl &&
                    bankTransfer?.momoQrImageUrl &&
                    "gap-6 sm:gap-8",
                )}
              >
                {bankTransfer?.qrImageUrl ? (
                  <QrBlock
                    alt="QR chuyển khoản ngân hàng"
                    label={
                      bankTransfer?.momoQrImageUrl ? "Ngân hàng" : undefined
                    }
                    src={bankTransfer.qrImageUrl}
                  />
                ) : null}
                {bankTransfer?.momoQrImageUrl ? (
                  <QrBlock
                    alt="QR MoMo"
                    label={bankTransfer?.qrImageUrl ? "MoMo" : undefined}
                    src={bankTransfer.momoQrImageUrl}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {paymentStatus && payment?.status === "awaiting_review" ? (
            <div
              className={cn(
                "mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-ui-sm font-semibold text-sky-900",
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Đã ghi nhận chuyển khoản. Hóa đơn đang chờ admin duyệt.
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            className="h-9 border-0 bg-transparent shadow-none hover:bg-slate-100 hover:text-slate-700"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Đóng
          </Button>
          {canConfirm ? (
            <Button
              className="h-9"
              disabled={confirmPending}
              type="button"
              onClick={() => onConfirm(payment.id)}
            >
              {confirmPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              Tôi đã chuyển khoản
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
