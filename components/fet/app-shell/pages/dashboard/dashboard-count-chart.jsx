"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { number } from "../../lib/format";
import { periodLabel } from "../../lib/period-utils";

const CHART_HEIGHT = 288;

export function DashboardCountChart({ color, data, period, title, total, unitLabel }) {
  const maxCount = Math.max(0, ...data.map((item) => Number(item.count || 0)));
  const longestYAxisLabel = [0, maxCount, total].reduce((longest, value) => {
    const label = number(value);
    return label.length > longest.length ? label : longest;
  }, "");
  const yAxisWidth = Math.min(
    Math.max(longestYAxisLabel.length * 8 + 28, 48),
    96,
  );
  const normalizedUnitLabel = unitLabel.toLocaleLowerCase("vi-VN");

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {number(total)} {normalizedUnitLabel} trong {periodLabel(period)}.
            </CardDescription>
          </div>
          <strong className="shrink-0 text-3xl font-black text-slate-950">
            {number(total)}
          </strong>
        </div>
      </CardHeader>
      <CardContent className="h-[320px] min-w-0">
        <div className="h-[288px] min-w-0">
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <BarChart
              data={data}
              margin={{ bottom: 6, left: 8, right: 16, top: 18 }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={period === "week" ? 0 : "preserveStartEnd"}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickFormatter={number}
                tickLine={false}
                tickMargin={10}
                width={yAxisWidth}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                }}
                formatter={(value) => [number(value), unitLabel]}
                labelFormatter={(value, payload) => {
                  const range = payload?.[0]?.payload?.rangeLabel || value;
                  return period === "quarter" ? `Kỳ ${range}` : `Ngày ${range}`;
                }}
              />
              <Bar
                dataKey="count"
                fill={color}
                maxBarSize={44}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
