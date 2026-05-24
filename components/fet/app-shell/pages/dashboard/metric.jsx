"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Metric({ label, tone = "default", value }) {
  return (
    <Card
      className={cn(
        tone === "green" && "border-emerald-200",
        tone === "amber" && "border-amber-200",
      )}
    >
      <CardContent className="p-5">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <strong
          className={cn(
            "mt-2 block text-3xl font-black text-slate-950",
            tone === "green" && "text-emerald-700",
            tone === "amber" && "text-amber-700",
          )}
        >
          {value}
        </strong>
      </CardContent>
    </Card>
  );
}
