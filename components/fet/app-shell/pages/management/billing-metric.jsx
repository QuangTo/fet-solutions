"use client";

import {
  billingDetailClass,
  billingLabelClass,
  billingValueClass,
} from "./billing-typography";

export function BillingMetric({ detail, label, value }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
      <p className={billingLabelClass}>{label}</p>
      <p className={`mt-1 truncate ${billingValueClass}`}>{value}</p>
      <p className={`mt-1 truncate ${billingDetailClass}`}>{detail}</p>
    </div>
  );
}
