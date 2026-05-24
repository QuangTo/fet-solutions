"use client";



export function EmptyPanel({ text }) {
  return (
    <div className="col-span-full grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}
