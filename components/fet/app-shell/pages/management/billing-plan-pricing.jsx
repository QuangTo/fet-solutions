"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import {
  planMonthlyEquivalent,
  yearlyDiscountLabel,
} from "@/lib/billing-pricing";
import { cn } from "@/lib/utils";
import { money } from "../../lib/format";

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
    <div className="relative inline-grid shrink-0 grid-cols-2 rounded-full bg-[#eaedff] p-1">
      <span
        className={cn(
          "absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-[#00a669] shadow-sm transition-transform duration-300 ease-out",
          billingInterval === "yearly" && "translate-x-full",
        )}
      />
      <button
        className={cn(
          "relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold leading-5 transition-colors duration-300 sm:px-5 sm:text-sm",
          billingInterval === "monthly"
            ? "text-white"
            : "text-[#3d4a41] hover:text-[#263149]",
        )}
        aria-pressed={billingInterval === "monthly"}
        type="button"
        onClick={() => onChange("monthly")}
      >
        Hằng tháng
      </button>
      <button
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-5 transition-colors duration-300 sm:px-5 sm:text-sm",
          billingInterval === "yearly"
            ? "text-white"
            : "text-[#3d4a41] hover:text-[#263149]",
        )}
        aria-pressed={billingInterval === "yearly"}
        type="button"
        onClick={() => onChange("yearly")}
      >
        Hằng năm
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
            billingInterval === "yearly"
              ? "bg-white/20 text-white"
              : "bg-[#00a669] text-white",
          )}
        >
          Save {yearlyDiscountLabel()}
        </span>
      </button>
    </div>
  );
}

function PlanCard({
  active,
  billingInterval,
  buttonPending,
  plan,
  popular,
  selected,
  onCheckout,
  onSelectPlan,
}) {
  const monthlyEquivalent = planMonthlyEquivalent(
    plan.priceMonthly,
    billingInterval,
  );
  const featured = selected;

  return (
    <div
      className={cn(
        "relative flex min-h-[260px] flex-col rounded-xl bg-white p-3 text-left transition-all duration-300 sm:min-h-[300px] sm:p-4",
        "hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]",
        featured
          ? "border-2 border-[#00a669] shadow-lg md:scale-[1.03]"
          : "border border-[#bccabe]",
      )}
    >
      {popular ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00a669] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          Phổ biến nhất
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between gap-3">
        <h3 className="text-ui-base font-semibold leading-6 text-[#263149]">
          {plan.name}
        </h3>
        {active ? (
          <span className="shrink-0 rounded-full bg-[#00a669] px-3 py-1 text-[12px] font-semibold leading-4 text-white">
            Đang dùng
          </span>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-baseline gap-1">
        <span className="text-xl font-bold leading-none text-[#3b465d] sm:text-[28px]">
          {money(monthlyEquivalent, plan.currency)}
        </span>
        <span className="text-[11px] font-medium leading-5 text-[#3d4a41]">
          /tháng
        </span>
      </div>

      <ul className="mb-6 grid gap-1.5 text-xs leading-4 sm:text-sm sm:leading-5">
        {planLimitItems(plan).map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <CheckCircle2
              aria-hidden="true"
              className="h-4 w-4 shrink-0 fill-[#00a669] text-[#00a669]"
            />
            <span
              className={cn(
                "leading-5",
                featured ? "text-[#263149]" : "text-[#3d4a41]",
              )}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>

      <button
        className={cn(
          "mt-auto inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold leading-5 transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:h-9 sm:text-sm",
          selected
            ? "bg-[#00a669] text-white shadow-md hover:bg-[#008f5b]"
            : "border border-[#bccabe] bg-white text-[#263149] hover:bg-[#eaedff]",
        )}
        disabled={buttonPending}
        type="button"
        onClick={() =>
          selected
            ? onCheckout?.({ billingInterval, planCode: plan.code })
            : onSelectPlan(plan.code)
        }
      >
        {buttonPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {selected ? "Tiếp tục thanh toán" : "Chọn"}
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
    <>
      <div className="grid gap-5 p-3 sm:p-5">
        <div className="flex justify-center">
          <IntervalToggle
            billingInterval={billingInterval}
            onChange={onIntervalChange}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {plans.map((plan) => {
            const selected = plan.code === selectedPlanCode;
            const active = plan.code === currentPlanCode;
            const buttonPending = checkoutPending && selected;
            const popular = plan.code === "pro";

            return (
              <PlanCard
                active={active}
                billingInterval={billingInterval}
                buttonPending={buttonPending}
                key={plan.code}
                plan={plan}
                popular={popular}
                selected={selected}
                onCheckout={onCheckout}
                onSelectPlan={onSelectPlan}
              />
            );
          })}
        </div>
      </div>
      <div className="border-t border-[#bccabe] bg-[#f2f3ff] px-4 py-3 text-center text-xs leading-5 text-[#3d4a41] sm:text-sm">
        Liên hệ để upgrade với nhu cầu lớn hơn hoặc tính năng mới.
      </div>
    </>
  );
}
