"use client";

import { Check, LoaderCircle } from "lucide-react";
import {
  billingIntervalLabel,
  planChargeAmount,
  planMonthlyEquivalent,
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
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
      <button
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-bold transition",
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
          "rounded-full px-4 py-1.5 text-sm font-bold transition",
          billingInterval === "yearly"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-800",
        )}
        type="button"
        onClick={() => onChange("yearly")}
      >
        Hằng năm
        <span className="ml-1.5 text-emerald-700">-30%</span>
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
  const yearly = billingInterval === "yearly";

  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Bảng giá gói
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            Chọn gói phù hợp kho của bạn
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Trial đang dùng gói Plus. Thanh toán theo{" "}
            {billingIntervalLabel(billingInterval).toLowerCase()}.
          </p>
        </div>
        <IntervalToggle
          billingInterval={billingInterval}
          onChange={onIntervalChange}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {plans.map((plan) => {
          const selected = plan.code === selectedPlanCode;
          const active = plan.code === currentPlanCode;
          const featured = plan.code === "plus";
          const chargeAmount = planChargeAmount(plan.priceMonthly, billingInterval);
          const monthlyEquivalent = planMonthlyEquivalent(
            plan.priceMonthly,
            billingInterval,
          );
          const savings = yearly ? yearlySavingsAmount(plan.priceMonthly) : 0;

          return (
            <div
              className={cn(
                "group relative flex h-full flex-col rounded-xl border p-4 text-left transition",
                selected
                  ? "border-emerald-500 bg-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                featured && !selected && "border-slate-300",
              )}
              key={plan.code}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-black text-slate-950">{plan.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {planLimitLabel(plan)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {active ? <Badge tone="green">Đang dùng</Badge> : null}
                  {featured ? <Badge tone="amber">Trial</Badge> : null}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black tracking-tight text-slate-950">
                    {money(monthlyEquivalent, plan.currency)}
                  </span>
                  <span className="pb-1 text-sm font-semibold text-slate-500">
                    /tháng
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {yearly
                    ? `${money(chargeAmount, plan.currency)} /năm`
                    : `${money(chargeAmount, plan.currency)} mỗi tháng`}
                </p>
                {yearly ? (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Tiết kiệm {money(savings, plan.currency)} so với trả tháng
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Trả năm rẻ hơn 30%
                  </p>
                )}
              </div>

              <ul className="mt-4 grid gap-2 text-sm font-medium text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  Quản lý nhập / xuất hàng
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  Báo cáo tồn kho
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  {plan.maxUsers} tài khoản · {plan.maxVehicles} xe
                </li>
              </ul>

              <div className="mt-5">
                <Button
                  className="w-full"
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
