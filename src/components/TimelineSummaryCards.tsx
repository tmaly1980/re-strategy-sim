import type { SimulationResult, MarketTimeline } from "@/simulation/types";

interface TimelineResult {
  timeline: MarketTimeline;
  result: SimulationResult;
}

interface Props {
  timelineResults: TimelineResult[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const COLORS = ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function TimelineSummaryCards({ timelineResults, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {timelineResults.map(({ timeline, result }, i) => {
        const color = COLORS[i % COLORS.length];
        const isSelected = timeline.id === selectedId;
        return (
          <button
            key={timeline.id}
            onClick={() => onSelect(timeline.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              isSelected
                ? "border-2 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            style={isSelected ? { borderColor: color, backgroundColor: `${color}08` } : {}}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-semibold text-slate-800 truncate">
                {timeline.name}
              </span>
            </div>
            <div className="space-y-1">
              <Row label="Net Worth" value={fmt(result.endingNetWorth)} bold />
              <Row label="Cash" value={fmt(result.endingCash)} />
              <Row label="Equity" value={fmt(result.endingEquity)} />
              <Row label="Mortgage Debt" value={fmt(result.endingMortgageDebt)} />
              <Row label="Properties" value={`${result.propertiesOwned} owned / ${result.propertiesSold} sold`} />
              <Row label="Min Cash" value={fmt(result.minCash)} dim={result.minCash < 5_000} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs tabular-nums ${bold ? "font-semibold text-slate-800" : dim ? "text-red-500" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}
