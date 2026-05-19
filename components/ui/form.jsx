import { cn } from "@/lib/utils";

export function Field({ className, ...props }) {
  return <label className={cn("grid gap-1.5 text-sm font-semibold text-slate-600", className)} {...props} />;
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
