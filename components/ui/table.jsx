import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }) {
  return (
    <th
      className={cn(
        "border-b border-slate-200 px-3 py-2 text-left text-xs font-black uppercase text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }) {
  return (
    <td
      className={cn(
        "border-b border-slate-100 px-3 py-2 align-middle text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyRow({ children, colSpan }) {
  return (
    <tr>
      <Td colSpan={colSpan} className="py-8 text-center text-slate-500">
        {children}
      </Td>
    </tr>
  );
}
