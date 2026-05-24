"use client";



export function BillingMetric({ detail, label, value }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-black text-slate-950">
        {value}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-slate-500">{detail}</p>
    </div>
  );
}
