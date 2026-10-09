"use client";

import type { Recommendation, PlanVariant } from "@/advisory/types";
import type { MarketTimeline } from "@/simulation/types";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  recommendations: Recommendation[];
  timelines: MarketTimeline[];
  selectedTimelineId: string;
  onSelectTimeline: (id: string) => void;
  onAccept: (recId: string) => void;
  onReject: (recId: string) => void;
  onCreateVariant: () => void;
  hasVariant: boolean;
  hasAccepted: boolean;
}

export function AdvisoryPanel({
  recommendations,
  timelines,
  selectedTimelineId,
  onSelectTimeline,
  onAccept,
  onReject,
  onCreateVariant,
  hasVariant,
  hasAccepted,
}: Props) {
  const selectedTimeline = timelines.find((t) => t.id === selectedTimelineId);
  const visible = recommendations.filter((r) => r.status !== "rejected");
  const accepted = recommendations.filter((r) => r.status === "accepted");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Advisory</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Recommendations apply to:{" "}
            <span className="font-medium text-slate-600">
              {selectedTimeline?.name ?? "—"}
            </span>
          </p>
        </div>
        <select
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={selectedTimelineId}
          onChange={(e) => onSelectTimeline(e.target.value)}
        >
          {timelines.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400 italic">
        Scenario analysis only — not real-world financial advice or market prediction.
        Based on current modeled assumptions.
      </p>

      {/* Recommendation cards */}
      {visible.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          No recommendations for this timeline under the current plan.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onAccept={() => onAccept(rec.id)}
              onReject={() => onReject(rec.id)}
            />
          ))}
        </div>
      )}

      {/* Create variant CTA */}
      {hasAccepted && !hasVariant && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">
            {accepted.length} recommendation{accepted.length !== 1 ? "s" : ""} accepted.
            Create a plan variant to apply them without changing your original.
          </p>
          <button
            onClick={onCreateVariant}
            className="rounded border border-blue-300 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Create Recommended Plan
          </button>
        </div>
      )}

      {hasVariant && (
        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Recommended plan created. Compare results below.
        </p>
      )}
    </div>
  );
}
