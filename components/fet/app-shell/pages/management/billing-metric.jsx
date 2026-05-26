"use client";

import {
  billingDetailClass,
  billingLabelClass,
  billingValueClass,
} from "./billing-typography";

export function BillingMetric({ detail, label, value }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/40">
      <p className={billingLabelClass}>{label}</p>
      <p className={`mt-1 break-words ${billingValueClass}`}>{value}</p>
      <p className={`mt-1 break-words ${billingDetailClass}`}>{detail}</p>
    </div>
  );
}
