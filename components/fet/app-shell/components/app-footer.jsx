import { cn } from "@/lib/utils";

export function AppFooter({ className }) {
  return (
    <footer
      className={cn(
        "shrink-0 px-3 py-2 text-center text-[10px] leading-4 text-zinc-400",
        className,
      )}
    >
      Powered by{" "}
      <span className="font-medium text-zinc-500">WooTech</span>
    </footer>
  );
}
