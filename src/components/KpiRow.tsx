import type { SimulationResult } from "@/simulation/types";

interface Props {
  results: Array<{ name: string; result: SimulationResult; color: string }>;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function KpiRow({ results }: Props) {
  if (results.length === 0) return null;

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1.5 pr-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">Timeline</th>
              {["Net Worth", "Equity", "Cash", "Debt", "Properties", "Min Cash"].map((h) => (
                <th key={h} className="text-right py-1.5 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map(({ name, result, color }) => (
              <tr key={name} className="border-t border-slate-100">
                <td className="py-1.5 pr-4 font-medium whitespace-nowrap" style={{ color }}>{name}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-800 tabular-nums">{fmt(result.endingNetWorth)}</td>
                <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">{fmt(result.endingEquity)}</td>
                <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">{fmt(result.endingCash)}</td>
                <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">{fmt(result.endingMortgageDebt)}</td>
                <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">{result.propertiesOwned}o / {result.propertiesSold}s</td>
                <td className={`py-1.5 px-2 text-right tabular-nums ${result.minCash < 5_000 ? "text-red-500 font-medium" : "text-slate-600"}`}>
                  {fmt(result.minCash)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: 2-column grid of metric cards per timeline */}
      <div className="sm:hidden space-y-3">
        {results.map(({ name, result, color }) => (
          <div key={name}>
            <p className="text-xs font-semibold mb-1.5" style={{ color }}>{name}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Net Worth", value: fmt(result.endingNetWorth), bold: true },
                { label: "Equity", value: fmt(result.endingEquity) },
                { label: "Cash", value: fmt(result.endingCash) },
                { label: "Debt", value: fmt(result.endingMortgageDebt) },
                { label: "Properties", value: `${result.propertiesOwned}o / ${result.propertiesSold}s` },
                { label: "Min Cash", value: fmt(result.minCash), warn: result.minCash < 5_000 },
              ].map(({ label, value, bold, warn }) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm tabular-nums mt-0.5 ${bold ? "font-semibold text-slate-800" : warn ? "text-red-500 font-medium" : "text-slate-700"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
