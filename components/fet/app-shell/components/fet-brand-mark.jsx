import { cn } from "@/lib/utils";

const pixelSize = {
  sm: 28,
  nav: 34,
  md: 36,
};

/** Inline mark matching app/icon.svg — avoids Tailwind bg quirks inside flex buttons. */
export function FetBrandMark({ className, size = "sm" }) {
  const pixels = pixelSize[size] ?? pixelSize.sm;

  return (
    <svg
      aria-hidden
      className={cn("shrink-0", className)}
      height={pixels}
      role="img"
      viewBox="0 0 32 32"
      width={pixels}
    >
      <rect fill="#18181b" height="32" rx="6" width="32" />
      <text
        fill="#ffffff"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="12"
        fontWeight="700"
        letterSpacing="-0.4"
        textAnchor="middle"
        x="16"
        y="22"
      >
        FET
      </text>
    </svg>
  );
}
