"use client";

import type { AiRecommendation } from "@/advisory/goals/types";

interface Props {
  rec: AiRecommendation;
  accepted: boolean;
  rejected: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function fmt(n: number): string {
  const abs = Math.abs(Math.round(n));
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${abs.toLocaleString()}`;
}

function diffColor(n: number): string {
  if (n > 0) return "text-green-700";
  if (n < 0) return "text-red-600";
  return "text-slate-500";
}

export function CrossTimelineRecommendation({ rec, accepted, rejected, onAccept, onReject }: Props) {
  if (rejected) return null;

  const isNoChange = rec.proposedChange.kind === "none";

  return (
    <div className={`rounded-lg border px-4 py-3 space-y-3 ${accepted ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-800">{rec.title}</p>
          {accepted && (
            <span className="inline-block mt-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              Accepted
            </span>
          )}
        </div>
        {!accepted && !isNoChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onAccept}
              className="rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={onReject}
              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">{rec.rationale}</p>

      {!isNoChange && rec.crossTimelineImpact.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">Cross-Timeline Impact</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[10px] text-slate-400">
                  <th className="pb-1 pr-4 font-medium">Timeline</th>
                  <th className="pb-1 pr-4 font-medium text-right">Net Worth Δ</th>
                  <th className="pb-1 pr-4 font-medium text-right">Min Cash Δ</th>
                  <th className="pb-1 font-medium text-right">Equity Δ</th>
                </tr>
              </thead>
              <tbody>
                {rec.crossTimelineImpact.map((ct) => (
                  <tr key={ct.timelineId} className="border-t border-slate-100">
                    <td className="py-1 pr-4 text-slate-700">{ct.timelineName}</td>
                    <td className={`py-1 pr-4 text-right font-mono ${diffColor(ct.endingNetWorthDiff)}`}>
                      {fmt(ct.endingNetWorthDiff)}
                    </td>
                    <td className={`py-1 pr-4 text-right font-mono ${diffColor(ct.minCashDiff)}`}>
                      {fmt(ct.minCashDiff)}
                    </td>
                    <td className={`py-1 text-right font-mono ${diffColor(ct.endingEquityDiff)}`}>
                      {fmt(ct.endingEquityDiff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400 italic">
            Numbers from deterministic simulator — based only on your modeled assumptions.
          </p>
        </div>
      )}
    </div>
  );
}
