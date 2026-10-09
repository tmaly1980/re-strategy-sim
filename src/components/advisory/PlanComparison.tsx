"use client";

import type { TimelineComparison } from "@/advisory/comparePlans";
import { fmtK, fmtDiff } from "@/advisory/formatUtils";

interface Props {
  comparisons: TimelineComparison[];
  originalName: string;
  variantName: string;
}

export function PlanComparison({ comparisons, originalName, variantName }: Props) {
  if (comparisons.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Plan Comparison</h3>
      <p className="text-xs text-slate-400 mb-4">
        {originalName} vs {variantName} — across all timelines
      </p>

      <div className="space-y-3">
        {comparisons.map(({ timeline, originalResult, variantResult, endingNetWorthDiff, minimumCashDiff }) => (
          <div key={timeline.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">{timeline.name}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-400 mb-0.5">{originalName}</p>
                <p className="font-medium text-slate-700">{fmtK(originalResult.endingNetWorth)}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">{variantName}</p>
                <p className="font-medium text-slate-700">{fmtK(variantResult.endingNetWorth)}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Difference</p>
                <p className={`font-semibold ${endingNetWorthDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {fmtDiff(endingNetWorthDiff)}
                </p>
              </div>
            </div>
            {minimumCashDiff !== 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Min. cash: {fmtDiff(minimumCashDiff)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
