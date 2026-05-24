"use client";



export function BillingMetric({ detail, label, value }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black text-slate-950 sm:mt-1 sm:text-base">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500 sm:mt-1 sm:text-xs">
        {detail}
      </p>
    </div>
  );
}
