"use client";

import { CalendarDays } from "lucide-react";
import { Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function PeriodSelect({ value, onChange, className }) {
  return (
    <div className={cn("relative w-full shrink-0 sm:w-36", className)}>
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <Select
        className="h-9 rounded-md py-0 pl-9 pr-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="week">Tuần</option>
        <option value="month">Tháng</option>
        <option value="quarter">Quý</option>
      </Select>
    </div>
  );
}
