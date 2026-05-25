"use client";

import {
  Area,
  AreaChart,
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
import { compactAxisNumber, number } from "../../lib/format";
import { periodLabel } from "../../lib/period-utils";

const CHART_HEIGHT = 288;

export function InventoryChart({ period, trend = [] }) {
  const data = trend;
  const last = data[data.length - 1]?.quantity || 0;
  const yAxisWidth = 48;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Xu hướng tồn kho</CardTitle>
        <CardDescription>
          Tồn cuối {periodLabel(period)}{" "}
          <strong className="text-emerald-700">{number(last)}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] min-w-0">
        <div className="h-[288px] min-w-0">
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <AreaChart
              data={data}
              margin={{ bottom: 6, left: 8, right: 16, top: 18 }}
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
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
