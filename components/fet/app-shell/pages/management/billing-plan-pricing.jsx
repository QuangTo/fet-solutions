"use client";

import { Check, LoaderCircle } from "lucide-react";
import {
  planMonthlyEquivalent,
  yearlyDiscountLabel,
} from "@/lib/billing-pricing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money } from "../../lib/format";
import { billingValueClass } from "./billing-typography";

const PLAN_LIMIT_FIELDS = [
  { key: "maxUsers", label: "Người dùng" },
  { key: "maxCustomers", label: "Đối tác" },
  { key: "maxVehicles", label: "Xe" },
  { key: "maxWarehouses", label: "Kho" },
];

function planLimitItems(plan) {
  return PLAN_LIMIT_FIELDS.flatMap(({ key, label }) => {
    const value = plan[key];
    if (value == null) return [];
    return [`${value} ${label}`];
  });
}

function IntervalToggle({ billingInterval, onChange }) {
  return (
    <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-100/80 p-[calc(var(--spacing)*0.9)]">
      <button
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold transition sm:px-2.5 sm:text-sm",
          billingInterval === "monthly"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-800",
        )}
        type="button"
        onClick={() => onChange("monthly")}
      >
        Hằng tháng
      </button>
      <button
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold transition sm:px-2.5 sm:text-sm",
          billingInterval === "yearly"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-800",
        )}
        type="button"
        onClick={() => onChange("yearly")}
      >
        Hằng năm
        <span className="ml-1 text-emerald-700">-{yearlyDiscountLabel()}</span>
      </button>
    </div>
  );
}

export function BillingPlanPricing({
  billingInterval,
  checkoutPending = false,
  currentPlanCode,
  onCheckout,
  onIntervalChange,
  onSelectPlan,
  plans,
  selectedPlanCode,
}) {
  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="flex justify-center pb-0.5 sm:pb-1">
        <IntervalToggle
          billingInterval={billingInterval}
          onChange={onIntervalChange}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        {plans.map((plan) => {
          const selected = plan.code === selectedPlanCode;
          const active = plan.code === currentPlanCode;
          const buttonPending = checkoutPending && selected;
          const monthlyEquivalent = planMonthlyEquivalent(
            plan.priceMonthly,
            billingInterval,
          );

          return (
            <div
              className={cn(
                "relative flex min-h-0 flex-col rounded-xl border bg-white/90 p-2.5 text-left transition sm:min-h-[220px] sm:p-4",
                selected
                  ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.22),0_10px_24px_rgba(15,23,42,0.07)]"
                  : "border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-sm",
              )}
              key={plan.code}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={billingValueClass}>{plan.name}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {active ? <Badge tone="green">Đang dùng</Badge> : null}
                </div>
              </div>

              <ul className="mt-1.5 grid gap-0.5 text-xs leading-4 text-slate-600 sm:mt-3 sm:gap-1.5 sm:text-sm sm:leading-5">
                {planLimitItems(plan).map((item) => (
                  <li className="flex items-center gap-2" key={item}>
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 sm:h-4 sm:w-4">
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 sm:mt-4">
                <div className="flex flex-wrap items-end gap-1">
                  <span className="text-xl font-bold leading-none text-slate-950 sm:text-[28px]">
                    {money(monthlyEquivalent, plan.currency)}
                  </span>
                  <span className="pb-0.5 text-[10px] font-medium leading-4 text-slate-500 sm:text-[11px] sm:leading-5">
                    /tháng
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-2 sm:pt-4">
                <Button
                  className="h-8 w-full text-xs sm:h-9 sm:text-sm"
                  disabled={checkoutPending}
                  size="sm"
                  type="button"
                  variant={selected ? "default" : "outline"}
                  onClick={() =>
                    selected
                      ? onCheckout?.({ billingInterval, planCode: plan.code })
                      : onSelectPlan(plan.code)
                  }
                >
                  {buttonPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  {selected ? "Tiếp tục thanh toán" : "Chọn"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
