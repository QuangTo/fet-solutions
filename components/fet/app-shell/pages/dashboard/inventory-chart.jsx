"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { Skeleton } from "@/components/ui/skeleton";
import { compactAxisNumber, number } from "../../lib/format";
import { overviewStats, overviewTrend } from "../../lib/period-utils";

export function InventoryChart({ period, state }) {
  const chartRef = useRef(null);
  const [chartSize, setChartSize] = useState({ height: 0, width: 0 });
  const data = overviewTrend(state, period);
  const stats = overviewStats(state, period);
  const last = data[data.length - 1]?.quantity || 0;
  const maxQuantity = Math.max(
    0,
    ...data.map((item) => Number(item.quantity || 0)),
  );
  const yAxisWidth = 48;

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setChartSize({
        height: Math.floor(entry.contentRect.height),
        width: Math.floor(entry.contentRect.width),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const canRenderChart = chartSize.height > 0 && chartSize.width > 0;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Xu hướng tồn kho</CardTitle>
        <CardDescription>
          Tồn cuối {stats.label}{" "}
          <strong className="text-emerald-700">{number(last)}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] min-w-0">
        <div className="h-full min-w-0" ref={chartRef}>
          {canRenderChart ? (
            <AreaChart
              data={data}
              height={chartSize.height}
              margin={{ bottom: 6, left: 8, right: 16, top: 18 }}
              width={chartSize.width}
            >
              <defs>
                <linearGradient id="stockGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickFormatter={compactAxisNumber}
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
                formatter={(value) => [number(value), "Tồn kho"]}
                labelFormatter={(value) => `Ngày ${value}`}
              />
              <Area
                dataKey="quantity"
                fill="url(#stockGradient)"
                stroke="#059669"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          ) : (
            <Skeleton className="h-full w-full rounded-lg" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
