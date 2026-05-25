"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import {
  billingBannerDismissStorageKey,
  isBillingBannerDismissed,
  writeBillingBannerDismissedAt,
} from "@/lib/billing-banner-dismiss";
import {
  billingBannerCanDismiss,
  billingBannerMessage,
  billingBannerTone,
  billingIsLocked,
  billingNeedsPayment,
  canManageBilling,
} from "@/lib/billing-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const toneClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  blue: "border-sky-200 bg-sky-50 text-sky-950",
  red: "border-red-200 bg-red-50 text-red-950",
};

export function BillingBanner({
  activeRole,
  billing,
  onManageBilling,
}) {
  const dismissKey = useMemo(
    () => (billing ? billingBannerDismissStorageKey(billing) : ""),
    [billing],
  );
  const canDismiss = billingBannerCanDismiss(billing);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!canDismiss || !dismissKey) {
      setDismissed(false);
      return;
    }
    setDismissed(isBillingBannerDismissed(dismissKey));
  }, [canDismiss, dismissKey]);

  const message = billingBannerMessage(billing);
  if (!message || (canDismiss && dismissed)) return null;

  const tone = billingBannerTone(billing);
  const locked = billingIsLocked(billing);
  const showAction =
    canManageBilling(activeRole) &&
    (billingNeedsPayment(billing) || locked) &&
    onManageBilling;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
        toneClasses[tone] || toneClasses.amber,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {locked ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p className="text-xs font-medium leading-5 sm:text-sm">{message}</p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {showAction ? (
          <Button
            className="h-8 w-full px-3 text-xs sm:w-auto"
            size="sm"
            type="button"
            variant={locked ? "destructive" : "default"}
            onClick={onManageBilling}
          >
            {locked ? "Thanh toán ngay" : "Quản lý thanh toán"}
          </Button>
        ) : null}
        {canDismiss ? (
          <button
            aria-label="Đóng thông báo (hiện lại sau 24 giờ)"
            className="grid h-8 w-8 place-items-center rounded-md text-amber-900/70 transition hover:bg-amber-100 hover:text-amber-950"
            onClick={() => {
              writeBillingBannerDismissedAt(dismissKey);
              setDismissed(true);
            }}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
