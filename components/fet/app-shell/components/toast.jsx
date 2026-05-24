"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Toast({ message, onClose, tone = "success" }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed right-3 z-[9999] max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md border px-3 py-2 text-ui-sm font-medium shadow-lg",
        "top-[calc(0.75rem+env(safe-area-inset-top,0px))]",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-900",
      )}
      role="status"
    >
      {message}
    </div>,
    document.body,
  );
}
