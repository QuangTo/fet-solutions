import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4",
        icon: "h-10 w-10 px-0",
        sm: "h-9 px-3 text-xs",
      },
      variant: {
        default: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
        outline:
          "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
        secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
      },
    },
  },
);

export function Button({ asChild = false, className, size, variant, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}
