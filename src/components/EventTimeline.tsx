"use client";

import { useState } from "react";
import type { SimulationEvent, SimEventType } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";

interface Props {
  events: SimulationEvent[];
}

const TYPE_STYLES: Record<SimEventType, { dot: string; badge: string }> = {
  purchase:           { dot: "bg-blue-500",   badge: "text-blue-700 bg-blue-50" },
  "purchase-skipped": { dot: "bg-slate-300",   badge: "text-slate-500 bg-slate-50" },
  sale:               { dot: "bg-green-500",  badge: "text-green-700 bg-green-50" },
  "market-event-start": { dot: "bg-amber-400", badge: "text-amber-700 bg-amber-50" },
  "market-event-end":   { dot: "bg-amber-300", badge: "text-amber-600 bg-amber-50" },
  "one-time-shock":   { dot: "bg-red-500",    badge: "text-red-700 bg-red-50" },
  "property-available": { dot: "bg-indigo-400", badge: "text-indigo-700 bg-indigo-50" },
  info:               { dot: "bg-slate-300",   badge: "text-slate-500 bg-slate-50" },
};

const TYPE_LABELS: Record<SimEventType, string> = {
  purchase:             "Purchased",
  "purchase-skipped":   "Skipped",
  sale:                 "Sold",
  "market-event-start": "Market →",
  "market-event-end":   "Market ←",
  "one-time-shock":     "Shock",
  "property-available": "Available",
  info:                 "Info",
};

type Filter = SimEventType | "all";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "purchase", label: "Purchases" },
  { value: "sale", label: "Sales" },
  { value: "one-time-shock", label: "Shocks" },
  { value: "purchase-skipped", label: "Skipped" },
  { value: "market-event-start", label: "Market" },
];

export function EventTimeline({ events }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Event History</h2>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
        {visible.length === 0 && (
          <p className="text-xs text-slate-400 py-6 text-center">No events to show.</p>
        )}
        {visible.map((e, i) => {
          const s = TYPE_STYLES[e.type];
          return (
            <div key={i} className="flex items-start gap-3 py-1">
              <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                    {simDateLabel(e.date)}
                  </span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${s.badge}`}>
                    {TYPE_LABELS[e.type]}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{e.message}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {visible.length} of {events.length} events
      </p>
    </div>
  );
}
