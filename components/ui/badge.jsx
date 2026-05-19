import { cn } from "@/lib/utils";

export function Badge({ className, tone = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-black",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "default" && "bg-slate-100 text-slate-700",
        className,
      )}
      {...props}
    />
  );
}
