"use client";

import { AlertCircle, Copy, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { money } from "../../lib/format";
import { paymentCopy } from "./billing-copy";
import {
  billingLabelClass,
  billingMutedClass,
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
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
    <div className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-b-0">
      <span className="w-28 shrink-0 text-[13px] leading-5 text-slate-500 sm:text-sm">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 text-slate-950 sm:text-sm">
        {value}
      </span>
      <CopyButton label={label} value={value} />
    </div>
  );
}

function QrBlock({ alt, label, src }) {
  return (
    <div className="text-center">
      {label ? (
        <p className={cn("mb-1.5", billingLabelClass)}>{label}</p>
      ) : null}
      <div className="inline-block rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <img
          alt={alt}
          className="h-28 w-28 object-contain sm:h-32 sm:w-32"
          height={128}
          src={src}
          width={128}
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
  const canConfirm = bankTransfer?.isPreview || payment?.status === "pending";
  const amount = money(
    invoice?.amount || bankTransfer?.amount,
    invoice?.currency,
  );
  const hasQr = Boolean(
    bankTransfer?.qrImageUrl || bankTransfer?.momoQrImageUrl,
  );

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent
        className="max-h-[88vh] max-w-md gap-0 overflow-y-auto bg-slate-50 p-0"
        hideClose
      >
        <div className="grid min-h-12 grid-cols-[2rem_1fr_2rem] items-center gap-2 border-b border-slate-200/70 bg-white px-3 sm:px-4">
          <span aria-hidden="true" />
          <div className="min-w-0 text-center">
            <DialogTitle className="text-base font-semibold leading-tight text-slate-950">
              Thông tin chuyển khoản
            </DialogTitle>
            <DialogDescription className="sr-only">
              Thông tin chuyển khoản, mã QR và xác nhận đã thanh toán.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              aria-label="Đóng"
              className="h-8 w-8"
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        <div className="grid gap-3 px-4 py-3">
          <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5">
            <p className={billingMutedClass}>Số tiền</p>
            <p className="mt-0.5 text-ui-base font-bold leading-snug text-slate-950">
              {amount}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3">
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

          <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase leading-4 tracking-wide text-amber-800">
                  Nội dung chuyển khoản
                </p>
                <p className="mt-1 break-all text-[13px] font-semibold leading-5 text-amber-950 sm:text-sm">
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
            <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-3">
              <div
                className={cn(
                  "flex justify-center",
                  bankTransfer?.qrImageUrl &&
                    bankTransfer?.momoQrImageUrl &&
                    "gap-4 sm:gap-6",
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
                "flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-semibold text-amber-950 sm:text-sm",
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Đã ghi nhận chuyển khoản. Hóa đơn đang chờ admin duyệt.
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200/70 px-4 py-3 sm:flex-row sm:justify-end">
          <Button
            className="border-0 bg-transparent text-[13px] shadow-none hover:bg-slate-100 hover:text-slate-700 sm:text-sm"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Đóng
          </Button>
          {canConfirm ? (
            <Button
              className="text-[13px] sm:text-sm"
              disabled={confirmPending}
              type="button"
              onClick={() => onConfirm(paymentView)}
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
