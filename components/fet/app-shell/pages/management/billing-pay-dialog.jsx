"use client";

import {
  AlertCircle,
  Copy,
  Download,
  LoaderCircle,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  if (!value) return false;
  const text = String(value);

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function extensionFromType(type = "") {
  if (type.includes("svg")) return "svg";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("webp")) return "webp";
  return "png";
}

function slug(value = "qr") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchQrFile(src, label) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Không thể tải mã QR.");
  const blob = await response.blob();
  const extension = extensionFromType(blob.type);
  return new File([blob], `lms-${slug(label)}-qr.${extension}`, {
    type: blob.type || "image/png",
  });
}

function CopyButton({ label, onToast, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label={`Sao chép ${label}`}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      type="button"
      onClick={async () => {
        try {
          const didCopy = await copyText(value);
          if (!didCopy) throw new Error("Copy failed.");
          setCopied(true);
          onToast?.("Đã sao chép.");
          window.setTimeout(() => setCopied(false), 1500);
        } catch (_error) {
          onToast?.("Không thể sao chép.", "error");
        }
      }}
    >
      <Copy className="h-4 w-4" />
      <span className="sr-only">{copied ? "Đã sao chép" : "Sao chép"}</span>
    </button>
  );
}

function DetailRow({ label, onToast, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-b-0">
      <span className="w-28 shrink-0 text-[13px] leading-5 text-slate-500 sm:text-sm">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 text-slate-950 sm:text-sm">
        {value}
      </span>
      <CopyButton label={label} value={value} onToast={onToast} />
    </div>
  );
}

function QrBlock({ alt, label = "Mã QR", onToast, src }) {
  const [imageStatus, setImageStatus] = useState(src ? "loading" : "error");
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setImageStatus(src ? "loading" : "error");
  }, [src]);

  const shareQr = async () => {
    if (!src) return;
    setIsSharing(true);
    try {
      if (navigator.share) {
        try {
          const file = await fetchQrFile(src, label);
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              text: "Mã QR chuyển khoản",
              title: label,
            });
            return;
          }
        } catch (_error) {
          // Fallback to sharing the URL below.
        }

        await navigator.share({
          text: "Mã QR chuyển khoản",
          title: label,
          url: src,
        });
        return;
      }

      const didCopy = await copyText(src);
      if (!didCopy) throw new Error("Copy failed.");
      onToast?.("Đã sao chép.");
    } catch (_error) {
      onToast?.("Không thể chia sẻ mã QR.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const saveQr = async () => {
    if (!src) return;
    setIsSaving(true);
    try {
      let url = src;
      let objectUrl = "";
      let filename = `lms-${slug(label)}-qr.png`;
      try {
        const file = await fetchQrFile(src, label);
        objectUrl = URL.createObjectURL(file);
        url = objectUrl;
        filename = file.name;
      } catch (_error) {
        // Cross-origin QR providers may block blob fetches; open the image URL
        // so mobile browsers still offer their native save/share affordances.
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      onToast?.("Đã lưu mã QR.");
    } catch (_error) {
      onToast?.("Không thể lưu mã QR.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid justify-items-center gap-2 text-center">
      {label ? (
        <p className={billingLabelClass}>{label}</p>
      ) : null}
      <div className="inline-block rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
          {imageStatus === "loading" ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : null}
          {imageStatus === "error" ? (
            <div className="grid h-full w-full place-items-center rounded-md border border-red-100 bg-red-50 px-2 text-center text-[11px] font-semibold leading-4 text-red-700">
              Không tải được QR
            </div>
          ) : null}
          {src ? (
            <img
              alt={alt}
              className={cn(
                "h-full w-full object-contain",
                imageStatus !== "loaded" && "hidden",
              )}
              height={128}
              src={src}
              width={128}
              onError={() => setImageStatus("error")}
              onLoad={() => setImageStatus("loaded")}
            />
          ) : null}
        </div>
      </div>
      <div className="grid w-full max-w-64 grid-cols-2 gap-1.5">
        <Button
          className="h-8 min-w-0 px-2 text-[11px] font-semibold sm:text-xs"
          disabled={isSharing}
          type="button"
          variant="outline"
          onClick={shareQr}
        >
          {isSharing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          Chia sẻ mã QR
        </Button>
        <Button
          className="h-8 min-w-0 px-2 text-[11px] font-semibold sm:text-xs"
          disabled={isSaving}
          type="button"
          variant="outline"
          onClick={saveQr}
        >
          {isSaving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Lưu ảnh
        </Button>
      </div>
    </div>
  );
}

function BillingPaySkeleton() {
  return (
    <div className="grid gap-3 px-4 py-3">
      <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-6 w-32" />
      </div>
      <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2">
        {[0, 1, 2].map((item) => (
          <div
            className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-b-0"
            key={item}
          >
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-7 w-7 shrink-0" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5">
        <Skeleton className="h-3 w-36 bg-amber-200/80" />
        <Skeleton className="mt-2 h-5 w-full bg-amber-200/80" />
      </div>
      <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-3">
        <div className="flex justify-center">
          <Skeleton className="h-32 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function BillingPayDialog({
  confirmPending,
  loading = false,
  onClose,
  onConfirm,
  onToast,
  open,
  paymentView,
}) {
  if (!paymentView && !loading) return null;

  const { bankTransfer, invoice, payment } = paymentView || {};
  const paymentStatus = payment ? paymentCopy(payment.status) : null;
  const canConfirm =
    !loading && (bankTransfer?.isPreview || payment?.status === "pending");
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
              className="h-8 w-8 rounded-full text-[#00a669] hover:bg-[#f2f3ff]"
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        {loading ? (
          <BillingPaySkeleton />
        ) : (
          <div className="grid gap-3 px-4 py-3">
            <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5">
              <p className={billingMutedClass}>Số tiền</p>
              <p className="mt-0.5 text-ui-base font-bold leading-snug text-slate-950">
                {amount}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-white/90 px-3">
              <DetailRow
                label="Ngân hàng"
                value={bankTransfer?.bankName || ""}
                onToast={onToast}
              />
              <DetailRow
                label="Số tài khoản"
                value={bankTransfer?.accountNumber || ""}
                onToast={onToast}
              />
              <DetailRow
                label="Chủ tài khoản"
                value={bankTransfer?.accountName || ""}
                onToast={onToast}
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
                    onToast={onToast}
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
                      onToast={onToast}
                    />
                  ) : null}
                  {bankTransfer?.momoQrImageUrl ? (
                    <QrBlock
                      alt="QR MoMo"
                      label={bankTransfer?.qrImageUrl ? "MoMo" : undefined}
                      src={bankTransfer.momoQrImageUrl}
                      onToast={onToast}
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
        )}

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
