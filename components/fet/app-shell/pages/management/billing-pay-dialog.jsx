"use client";

import { Copy, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { billingIntervalLabel, resolveDueDates } from "@/lib/billing-pricing";
import { formatDate } from "@/lib/fet-domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { money } from "../../lib/format";
import { paymentCopy } from "./billing-copy";

async function copyText(value) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
      <Button
        aria-label={`Sao chép ${label}`}
        size="icon"
        type="button"
        variant="ghost"
        onClick={async () => {
          await copyText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Copy className="h-4 w-4" />
        <span className="sr-only">{copied ? "Đã sao chép" : "Sao chép"}</span>
      </Button>
    </div>
  );
}

export function BillingPayDialog({
  checkout,
  confirmPending,
  onClose,
  onConfirm,
  open,
}) {
  if (!checkout) return null;

  const { bankTransfer, billingInterval, invoice, payment, plan } = checkout;
  const paymentStatus = paymentCopy(payment?.status);
  const dueDates = resolveDueDates({ openInvoice: invoice });
  const paymentDueLabel = formatDate(
    dueDates.paymentDueDate || dueDates.previewDueDate,
  );

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Thanh toán chuyển khoản</DialogTitle>
        <DialogDescription>
          Quét QR hoặc chuyển khoản theo thông tin bên dưới, sau đó bấm &quot;Tôi
          đã chuyển&quot;.
        </DialogDescription>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="default">{plan?.name || "Gói hiện tại"}</Badge>
            <Badge tone="default">
              {billingIntervalLabel(billingInterval || bankTransfer?.billingInterval)}
            </Badge>
            <Badge tone={paymentStatus.tone}>{paymentStatus.label}</Badge>
            <span className="text-sm font-bold text-slate-700">
              {money(invoice?.amount, invoice?.currency)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
            {bankTransfer?.qrImageUrl ? (
              <img
                alt="Mã QR chuyển khoản"
                className="mx-auto h-40 w-40 rounded-md border border-slate-200 bg-white object-contain p-2"
                height={160}
                src={bankTransfer.qrImageUrl}
                width={160}
              />
            ) : null}
            <div className="grid gap-2">
              <CopyRow label="Ngân hàng" value={bankTransfer?.bankName || ""} />
              <CopyRow
                label="Số tài khoản"
                value={bankTransfer?.accountNumber || ""}
              />
              <CopyRow
                label="Chủ tài khoản"
                value={bankTransfer?.accountName || ""}
              />
              <CopyRow
                label="Nội dung CK"
                value={bankTransfer?.transferContent || ""}
              />
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500">
            Hạn thanh toán: {paymentDueLabel || "Chưa có"}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            {payment?.status === "pending" ? (
              <Button
                disabled={confirmPending}
                type="button"
                onClick={() => onConfirm(payment.id)}
              >
                {confirmPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Tôi đã chuyển
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
