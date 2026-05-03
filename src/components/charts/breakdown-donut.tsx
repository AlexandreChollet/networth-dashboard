"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  ASSET_TYPE_LABELS,
  formatEUR,
} from "@/lib/format";

interface Props {
  data: Record<string, number>;
}

export function BreakdownDonut({ data }: Props) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Pas encore de données.
      </div>
    );
  }

  const labelFor = (k: string) =>
    ACCOUNT_TYPE_LABELS[k] ?? ASSET_TYPE_LABELS[k] ?? k;
  const colorFor = (k: string) =>
    ACCOUNT_TYPE_COLORS[k] ?? ASSET_TYPE_COLORS[k] ?? "hsl(var(--chart-8))";

  const chartData = entries.map(([k, v]) => ({
    name: labelFor(k),
    typeKey: k,
    value: v,
    pct: (v / total) * 100,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.typeKey} fill={colorFor(entry.typeKey)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--popover-foreground))",
              fontSize: 13,
            }}
            formatter={(value: number, _name, item) => [
              `${formatEUR(value)} (${item.payload.pct.toFixed(1)} %)`,
              item.payload.name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={48}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value, entry) => {
              const pct = (entry?.payload as { pct?: number } | undefined)?.pct;
              return (
                <span className="text-foreground">
                  {value}
                  {pct !== undefined ? (
                    <span className="ml-1 text-muted-foreground tabular-nums">
                      {pct.toFixed(1).replace(".", ",")} %
                    </span>
                  ) : null}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
