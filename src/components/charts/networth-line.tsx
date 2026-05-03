"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { formatEUR, formatEURCompact } from "@/lib/format";

interface Point {
  date: string;
  net: number;
  assets: number;
  liabilities: number;
  contributions?: number;
}

export function NetWorthLine({ data }: { data: Point[] }) {
  const hasContributions = data.some((p) => (p.contributions ?? 0) > 0);
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Pas encore de données.
      </div>
    );
  }
  const formatLabel = (d: string) => {
    const [y, m] = d.split("-");
    const months = [
      "janv.",
      "févr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "août",
      "sept.",
      "oct.",
      "nov.",
      "déc.",
    ];
    return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatLabel}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatEURCompact(v)}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            width={70}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 13,
              color: "hsl(var(--popover-foreground))",
            }}
            labelFormatter={formatLabel}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                net: "Patrimoine net",
                assets: "Actifs",
                liabilities: "Dettes",
                contributions: "Apports cumulés",
              };
              return [formatEUR(value), labels[name] ?? name];
            }}
          />
          <Area
            type="monotone"
            dataKey="net"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#netGradient)"
          />
          <Line
            type="monotone"
            dataKey="assets"
            stroke="hsl(var(--chart-2))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="liabilities"
            stroke="hsl(var(--chart-5))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          {hasContributions ? (
            <Line
              type="monotone"
              dataKey="contributions"
              stroke="hsl(var(--chart-4))"
              strokeWidth={1.5}
              dot={false}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
