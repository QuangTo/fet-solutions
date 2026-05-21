import { cn } from "@/lib/utils";
import { Children, isValidElement } from "react";

function textFromChildren(children) {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return child.toString();
      if (isValidElement(child)) return textFromChildren(child.props.children);
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function Table({ className, ...props }) {
  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ children, className, title, ...props }) {
  const tooltip = title ?? textFromChildren(children);
  return (
    <th
      className={cn(
        "border-b border-slate-200 px-3 py-2 text-left text-xs font-black uppercase text-slate-500",
        className,
      )}
      title={tooltip || undefined}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, title, ...props }) {
  const tooltip = title ?? textFromChildren(children);
  return (
    <td
      className={cn(
        "border-b border-slate-100 px-3 py-2 align-middle text-slate-700",
        className,
      )}
      title={tooltip || undefined}
      {...props}
    >
      {children}
    </td>
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
