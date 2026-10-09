"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SimulationResult } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";

interface Props {
  result: SimulationResult | null;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// Sample every 3 months for chart readability (keeps underlying monthly data intact)
function sampleSnapshots(result: SimulationResult) {
  return result.snapshots
    .filter((_, i) => i % 3 === 0 || i === result.snapshots.length - 1)
    .map((s) => ({
      label: simDateLabel(s.date),
      netWorth: Math.round(s.netWorth),
      equity: Math.round(s.equity),
      cash: Math.round(s.cash),
    }));
}

// Find market event starts and one-time shocks for reference lines
function getMarkers(result: SimulationResult) {
  return result.events
    .filter(
      (e) =>
        e.type === "purchase" ||
        e.type === "sale" ||
        e.type === "one-time-shock" ||
        e.type === "market-event-start"
    )
    .map((e) => ({ label: simDateLabel(e.date), type: e.type, message: e.message }));
}

export function PortfolioChart({ result }: Props) {
  if (!result || result.snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-400">
          Add a property to see the portfolio timeline.
        </p>
      </div>
    );
  }

  const data = sampleSnapshots(result);
  const markers = getMarkers(result);
  // Only show a few key shock/sale markers to avoid crowding
  const shockMarkers = markers.filter(
    (m) => m.type === "one-time-shock" || m.type === "sale"
  );

  return (
    <div className="space-y-4">
      {/* Primary: Net Worth + Equity */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Net Worth &amp; Equity Over Time
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
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
            {shockMarkers.map((m, i) => (
              <ReferenceLine
                key={i}
                x={m.label}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
            ))}
            <Area
              type="monotone"
              dataKey="equity"
              name="Equity"
              fill="#dbeafe"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              fillOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary: Cash */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Cash Reserves</h2>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
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
              }}
            />
            {shockMarkers.map((m, i) => (
              <ReferenceLine
                key={i}
                x={m.label}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
            ))}
            <Area
              type="monotone"
              dataKey="cash"
              name="Cash"
              fill="#dcfce7"
              stroke="#16a34a"
              strokeWidth={1.5}
              dot={false}
              fillOpacity={0.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
