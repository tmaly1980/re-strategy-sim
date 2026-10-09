import type { PropertyOpportunity, SimulationResult, MarketTimeline } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";

interface TimelineResult {
  timeline: MarketTimeline;
  result: SimulationResult;
}

interface Props {
  properties: PropertyOpportunity[];
  timelineResults: TimelineResult[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

const STATUS_STYLE: Record<string, string> = {
  purchased: "text-blue-700 bg-blue-50",
  sold: "text-green-700 bg-green-50",
  "not-purchased": "text-slate-500 bg-slate-100",
  pending: "text-amber-700 bg-amber-50",
};

export function PropertyOutcomes({ properties, timelineResults }: Props) {
  if (properties.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Property Outcomes</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 pr-4 font-medium text-slate-500">Property</th>
              {timelineResults.map(({ timeline }) => (
                <th key={timeline.id} className="text-left py-2 px-3 font-medium text-slate-500 whitespace-nowrap">
                  {timeline.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {properties.map((prop) => (
              <tr key={prop.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-slate-700 whitespace-nowrap">
                  {prop.name}
                  <div className="font-normal text-slate-400">
                    avail. {simDateLabel(prop.earliestPurchaseDate)}
                  </div>
                </td>
                {timelineResults.map(({ timeline, result }) => {
                  const outcome = result.propertyOutcomes.find(
                    (o) => o.opportunityId === prop.id
                  );
                  if (!outcome) return <td key={timeline.id} className="py-2 px-3 text-slate-300">—</td>;

                  return (
                    <td key={timeline.id} className="py-2 px-3 align-top">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[outcome.status] ?? ""}`}>
                        {outcome.status.replace("-", " ")}
                      </span>
                      {outcome.purchasedDate && (
                        <div className="mt-1 text-slate-600">
                          {simDateLabel(outcome.purchasedDate)}
                          {outcome.delayMonths != null && outcome.delayMonths > 0 && (
                            <span className="text-slate-400"> (+{outcome.delayMonths}mo)</span>
                          )}
                        </div>
                      )}
                      {outcome.status === "not-purchased" && outcome.firstRejectionReason && (
                        <div className="mt-1 text-slate-400 italic">
                          {outcome.firstRejectionReason.replace(/-/g, " ")}
                        </div>
                      )}
                      {outcome.equity != null && (
                        <div className="mt-1 text-slate-500">equity {fmt(outcome.equity)}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
