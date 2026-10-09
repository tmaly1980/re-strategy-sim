"use client";

import type { Recommendation } from "@/advisory/types";
import { fmtDiff, fmtK } from "@/advisory/formatUtils";

interface Props {
  rec: Recommendation;
  onAccept: () => void;
  onReject: () => void;
}

const TYPE_BADGE: Record<Recommendation["type"], { label: string; cls: string }> = {
  warning: { label: "Warning", cls: "bg-amber-100 text-amber-700" },
  delay:   { label: "Delay",   cls: "bg-blue-100 text-blue-700" },
  sell:    { label: "Sell",    cls: "bg-red-100 text-red-700" },
  hold:    { label: "Hold",    cls: "bg-green-100 text-green-700" },
  buy:     { label: "Buy",     cls: "bg-violet-100 text-violet-700" },
};

export function RecommendationCard({ rec, onAccept, onReject }: Props) {
  const badge = TYPE_BADGE[rec.type];
  const isDone = rec.status !== "pending";
  const hasChange = rec.proposedChange && rec.proposedChange.kind !== "none";
  const impact = rec.estimatedImpact;

  return (
    <div
      className={`rounded-xl border p-4 space-y-2 transition-opacity ${
        isDone ? "opacity-50" : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="text-sm font-semibold text-slate-800">{rec.title}</span>
        </div>
        {isDone && (
          <span className="text-xs text-slate-400 shrink-0 mt-0.5 capitalize">{rec.status}</span>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-600">{rec.summary}</p>

      {/* Expandable explanation */}
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer select-none text-blue-500 hover:underline">
          See reasoning
        </summary>
        <p className="mt-1 leading-snug">{rec.explanation}</p>
      </details>

      {/* Impact */}
      {impact && (
        <div className="flex flex-wrap gap-3 text-xs">
          {impact.endingNetWorthDifference !== undefined && (
            <span className={`font-medium ${impact.endingNetWorthDifference >= 0 ? "text-green-600" : "text-red-500"}`}>
              Net worth: {fmtDiff(impact.endingNetWorthDifference)}
            </span>
          )}
          {impact.minimumCashDifference !== undefined && (
            <span className={`font-medium ${impact.minimumCashDifference >= 0 ? "text-green-600" : "text-red-500"}`}>
              Min. cash: {fmtDiff(impact.minimumCashDifference)}
            </span>
          )}
          {impact.equityDifference !== undefined && (
            <span className="font-medium text-slate-600">
              Equity preserved: {fmtK(impact.equityDifference)}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-2 pt-1">
          {hasChange && (
            <button
              onClick={onAccept}
              className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Accept
            </button>
          )}
          <button
            onClick={onReject}
            className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {hasChange ? "Reject" : "Dismiss"}
          </button>
        </div>
      )}
    </div>
  );
}
