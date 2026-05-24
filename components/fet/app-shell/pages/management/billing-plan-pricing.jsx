"use client";

import { LoaderCircle } from "lucide-react";
import {
  billingIntervalLabel,
  planChargeAmount,
  planMonthlyEquivalent,
  yearlyDiscountLabel,
  yearlySavingsAmount,
} from "@/lib/billing-pricing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money } from "../../lib/format";

function planLimitLabel(plan) {
  return `${plan.maxUsers} user · ${plan.maxVehicles} xe`;
}

function IntervalToggle({ billingInterval, onChange }) {
  return (
    <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-100 p-0.5">
      <button
        className={cn(
          "rounded-full px-3 py-1 text-xs font-bold transition",
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
          "rounded-full px-3 py-1 text-xs font-bold transition",
          billingInterval === "yearly"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-800",
        )}
        type="button"
        onClick={() => onChange("yearly")}
      >
        Hằng năm
        <span className="ml-1 text-emerald-700">-15%</span>
      </button>
    </div>
  );
}

function usageSummary({ billingInterval, currentPlanName, siteName }) {
  const interval = billingIntervalLabel(billingInterval).toLowerCase();
  const customer = siteName?.trim() || "này";
  const plan = currentPlanName?.trim() || "Plus";
  return `Khách hàng ${customer} đang dùng gói ${plan} ${interval}.`;
}

export function BillingPlanPricing({
  billingInterval,
  checkoutPending = false,
  currentPlanCode,
  currentPlanName,
  onCheckout,
  onIntervalChange,
  onSelectPlan,
  plans,
  selectedPlanCode,
  siteName,
}) {
  const yearly = billingInterval === "yearly";

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:gap-4 sm:p-4 lg:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            Bảng giá gói
          </p>
          <h3 className="mt-1 text-base font-black text-slate-950 sm:text-lg">
            Chọn gói phù hợp kho của bạn
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            {usageSummary({ billingInterval, currentPlanName, siteName })}
          </p>
        </div>
        <div className="self-end sm:shrink-0">
          <IntervalToggle
            billingInterval={billingInterval}
            onChange={onIntervalChange}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const selected = plan.code === selectedPlanCode;
          const active = plan.code === currentPlanCode;
          const featured = plan.code === "plus";
          const discountLabel = yearlyDiscountLabel();
          const chargeAmount = planChargeAmount(plan.priceMonthly, billingInterval);
          const monthlyEquivalent = planMonthlyEquivalent(
            plan.priceMonthly,
            billingInterval,
          );
          const savings = yearly ? yearlySavingsAmount(plan.priceMonthly) : 0;

          return (
            <div
              className={cn(
                "relative flex h-full flex-col rounded-xl border p-3 text-left transition sm:p-4",
                selected
                  ? "border-emerald-500 bg-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                featured && !selected && "border-slate-300",
              )}
              key={plan.code}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 sm:text-base">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {planLimitLabel(plan)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {active ? <Badge tone="green">Đang dùng</Badge> : null}
                  {featured ? <Badge tone="amber">Trial</Badge> : null}
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <div className="flex items-end gap-1">
                  <span className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    {money(monthlyEquivalent, plan.currency)}
                  </span>
                  <span className="pb-0.5 text-xs font-semibold text-slate-500 sm:pb-1 sm:text-sm">
                    /tháng
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-600 sm:text-sm">
                  {yearly
                    ? `${money(chargeAmount, plan.currency)} /năm`
                    : `${money(chargeAmount, plan.currency)} mỗi tháng`}
                </p>
                {yearly ? (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700 sm:text-xs">
                    Giảm {discountLabel} · tiết kiệm {money(savings, plan.currency)}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] font-semibold text-slate-400 sm:text-xs">
                    Trả năm giảm {discountLabel}
                  </p>
                )}
              </div>

              <div className="mt-4 sm:mt-5">
                <Button
                  className="h-9 w-full text-xs sm:text-sm"
                  disabled={checkoutPending}
                  size="sm"
                  type="button"
                  variant={selected ? "default" : "outline"}
                  onClick={() => {
                    onSelectPlan(plan.code);
                    onCheckout?.({ billingInterval, planCode: plan.code });
                  }}
                >
                  {checkoutPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  {selected ? "Chọn gói này" : "Chọn"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
