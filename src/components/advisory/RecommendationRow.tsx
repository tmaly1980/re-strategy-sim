"use client";

import type { Recommendation } from "@/advisory/types";
import { fmtDiff } from "@/advisory/formatUtils";

interface Props {
  rec: Recommendation;
  onAccept: () => void;
  onReject: () => void;
}

const TYPE_ICON: Record<Recommendation["type"], string> = {
  warning: "⚠",
  delay:   "⏱",
  sell:    "↓",
  hold:    "↑",
  buy:     "↗",
};
const TYPE_CLS: Record<Recommendation["type"], string> = {
  warning: "text-amber-600",
  delay:   "text-blue-600",
  sell:    "text-red-600",
  hold:    "text-green-600",
  buy:     "text-violet-600",
};

export function RecommendationRow({ rec, onAccept, onReject }: Props) {
  const isDone = rec.status !== "pending";
  const hasChange = rec.proposedChange && rec.proposedChange.kind !== "none";
  const impact = rec.estimatedImpact;
  const nwDiff = impact?.endingNetWorthDifference;
  const cashDiff = impact?.minimumCashDifference;

  return (
    <div className={`text-xs transition-opacity ${isDone ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-2">
        <span className={`font-bold mt-0.5 shrink-0 ${TYPE_CLS[rec.type]}`}>{TYPE_ICON[rec.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">{rec.title}</span>
            {nwDiff !== undefined && (
              <span className={`font-medium ${nwDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                {fmtDiff(nwDiff)} NW
              </span>
            )}
            {cashDiff !== undefined && (
              <span className={`font-medium ${cashDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                {fmtDiff(cashDiff)} cash
              </span>
            )}
            {isDone && <span className="text-slate-400 capitalize">{rec.status}</span>}
          </div>
          <p className="text-slate-500 mt-0.5 leading-snug">{rec.summary}</p>
          <details className="mt-0.5">
            <summary className="cursor-pointer text-blue-500 hover:underline select-none">reasoning</summary>
            <p className="mt-1 text-slate-400 leading-snug">{rec.explanation}</p>
          </details>
        </div>
        {!isDone && (
          <div className="flex gap-1 shrink-0 mt-0.5">
            {hasChange && (
              <button
                onClick={onAccept}
                className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                Accept
              </button>
            )}
            <button
              onClick={onReject}
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {hasChange ? "Reject" : "Dismiss"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
