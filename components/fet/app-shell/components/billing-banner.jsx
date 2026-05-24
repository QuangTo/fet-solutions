"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import {
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
  const message = billingBannerMessage(billing);
  if (!message) return null;

  const tone = billingBannerTone(billing);
  const locked = billingIsLocked(billing);
  const showAction =
    canManageBilling(activeRole) &&
    (billingNeedsPayment(billing) || locked) &&
    onManageBilling;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        toneClasses[tone] || toneClasses.amber,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {locked ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <p className="text-sm font-semibold leading-5">{message}</p>
      </div>
      {showAction ? (
        <Button
          className="w-full shrink-0 sm:w-auto"
          size="sm"
          type="button"
          variant={locked ? "destructive" : "default"}
          onClick={onManageBilling}
        >
          {locked ? "Thanh toán ngay" : "Quản lý thanh toán"}
        </Button>
      ) : null}
    </div>
  );
}
