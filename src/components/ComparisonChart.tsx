"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SimulationResult, MarketTimeline } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";

interface TimelineResult {
  timeline: MarketTimeline;
  result: SimulationResult;
}

interface Props {
  timelineResults: TimelineResult[];
}

// A stable palette — up to 6 timelines legible
const COLORS = ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function ComparisonChart({ timelineResults }: Props) {
  if (timelineResults.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-400">
          Add a property to see portfolio timelines.
        </p>
      </div>
    );
  }

  // Build unified date-keyed chart data from first timeline's snapshots (all share same dates)
  const base = timelineResults[0].result.snapshots;
  const data = base
    .filter((_, i) => i % 3 === 0 || i === base.length - 1)
    .map((snap) => {
      const label = simDateLabel(snap.date);
      const point: Record<string, string | number> = { label };
      for (const { timeline, result } of timelineResults) {
        const match = result.snapshots.find(
          (s) => s.date.year === snap.date.year && s.date.month === snap.date.month
        );
        point[timeline.id] = match ? Math.round(match.netWorth) : 0;
      }
      return point;
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Net Worth Across Timelines</h2>
        <p className="text-xs text-slate-400">Same plan, different market futures.</p>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            width={68}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v)), ""]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {timelineResults.map(({ timeline }, i) => (
            <Line
              key={timeline.id}
              type="monotone"
              dataKey={timeline.id}
              name={timeline.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
