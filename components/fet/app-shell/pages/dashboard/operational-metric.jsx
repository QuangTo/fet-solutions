"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { number } from "../../lib/format";

export function OperationalMetric({ activeLabel, idleLabel, label, stats, tone }) {
  const activePercent = stats.total
    ? Math.min(Math.round((stats.active / stats.total) * 100), 100)
    : 0;
  const toneClass = {
    amber: "bg-amber-500",
    blue: "bg-blue-600",
    green: "bg-emerald-600",
  }[tone];
  const showBreakdown = Boolean(activeLabel || idleLabel);

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <strong className="mt-2 block text-3xl font-black text-slate-950">
              {number(stats.active)}
            </strong>
          </div>
          {showBreakdown ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {number(stats.total)} tổng
            </span>
          ) : null}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full", toneClass)}
            style={{ width: `${activePercent}%` }}
          />
        </div>
        {showBreakdown ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-bold text-slate-500">{activeLabel}</span>
              <strong className="block text-lg font-black text-slate-950">
                {number(stats.active)}
              </strong>
            </div>
            <div>
              <span className="font-bold text-slate-500">{idleLabel}</span>
              <strong className="block text-lg font-black text-slate-950">
                {number(stats.idle)}
              </strong>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
