"use client";

import { useState, useEffect, useCallback } from "react";
import type { SimulationPlan, PropertyOpportunity, MarketTimeline, SimulationResult } from "@/simulation/types";
import type { AiRecommendation, StrategyGoal, GlobalEvidence, CandidateEvaluation } from "@/advisory/goals/types";
import type { SavedAdvisoryGoal } from "@/advisory/goals/types";
import { buildGlobalEvidence } from "@/advisory/ai/buildGlobalEvidence";
import { evaluateCandidates } from "@/advisory/ai/evaluateCandidates";
import { GoalSelector } from "./GoalSelector";
import { GoalInterpretation } from "./GoalInterpretation";
import { CrossTimelineRecommendation } from "./CrossTimelineRecommendation";

interface Props {
  timelines: MarketTimeline[];
  timelineResults: { timeline: MarketTimeline; result: SimulationResult }[];
  originalPlan: SimulationPlan;
  originalProperties: PropertyOpportunity[];
  onApplyRecommendations: (recs: AiRecommendation[], goalSummary: string) => void;
}

type Status = "idle" | "loading" | "done" | "error";

export function GlobalAiAdvisor({
  timelines,
  timelineResults,
  originalPlan,
  originalProperties,
  onApplyRecommendations,
}: Props) {
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [goalText, setGoalText] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [interpretedGoal, setInterpretedGoal] = useState<StrategyGoal | null>(null);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  // Check if AI is configured on mount
  useEffect(() => {
    fetch("/api/advisory")
      .then((r) => r.json())
      .then((data: { configured: boolean }) => setAiConfigured(data.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  function handleGoalSelect(goal: SavedAdvisoryGoal) {
    setSelectedGoalId(goal.id);
    setGoalText(goal.prompt);
  }

  const analyze = useCallback(async () => {
    if (!goalText.trim() || timelineResults.length === 0) return;

    setStatus("loading");
    setErrorMessage("");
    setInterpretedGoal(null);
    setRecommendations([]);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());

    try {
      const evidence: GlobalEvidence = buildGlobalEvidence(timelineResults, originalProperties, originalPlan);
      const candidateEvaluations: CandidateEvaluation[] = evaluateCandidates(
        originalPlan,
        originalProperties,
        timelines
      );

      const response = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalText, evidence, candidateEvaluations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      if (!data.configured) {
        setAiConfigured(false);
        setStatus("idle");
        return;
      }

      setInterpretedGoal(data.interpretedGoal as StrategyGoal);
      setRecommendations(data.recommendations as AiRecommendation[]);
      setStatus("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [goalText, timelineResults, originalPlan, originalProperties, timelines]);

  function accept(id: string) {
    setAcceptedIds((s) => new Set([...s, id]));
  }
  function reject(id: string) {
    setRejectedIds((s) => new Set([...s, id]));
  }

  const acceptedRecs = recommendations.filter((r) => acceptedIds.has(r.id));
  const canCreateVariant = acceptedRecs.length > 0;

  function createVariant() {
    onApplyRecommendations(acceptedRecs, interpretedGoal?.summary ?? goalText);
  }

  const isUnconfigured = aiConfigured === false;

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">AI Strategy Advisor</span>
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 uppercase tracking-wide">
            Global — all timelines
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Analyzes your investment plan across all {timelines.length} configured timeline{timelines.length !== 1 ? "s" : ""}.
          Financial results come from the deterministic simulator — the AI interprets tradeoffs and explains them.
        </p>
      </div>

      {/* Unconfigured notice */}
      {isUnconfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs space-y-1.5">
          <p className="font-semibold text-amber-800">AI Advisor is not configured.</p>
          <ol className="list-decimal list-inside text-amber-700 space-y-0.5">
            <li>Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code></li>
            <li>Set <code className="font-mono">AI_PROVIDER</code> (openai, anthropic, or xai)</li>
            <li>Set <code className="font-mono">AI_MODEL</code></li>
            <li>Add the API key for your chosen provider</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      )}

      {/* Goal input */}
      <GoalSelector
        goalText={goalText}
        selectedGoalId={selectedGoalId}
        onGoalTextChange={(t) => { setGoalText(t); setSelectedGoalId(""); }}
        onGoalSelect={handleGoalSelect}
      />

      {/* Analyze button */}
      <button
        onClick={analyze}
        disabled={isUnconfigured || !goalText.trim() || status === "loading"}
        className="w-full rounded border border-violet-300 bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Analyzing…" : `Analyze Across ${timelines.length} Timeline${timelines.length !== 1 ? "s" : ""}`}
      </button>

      {/* Loading skeleton for goal interpretation */}
      {status === "loading" && (
        <GoalInterpretation goal={null} loading={true} />
      )}

      {/* Error */}
      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Results */}
      {status === "done" && (
        <div className="space-y-4">
          <GoalInterpretation goal={interpretedGoal} loading={false} />

          {recommendations.length === 0 ? (
            <p className="text-xs text-slate-400">No recommendations were generated.</p>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <CrossTimelineRecommendation
                  key={rec.id}
                  rec={rec}
                  accepted={acceptedIds.has(rec.id)}
                  rejected={rejectedIds.has(rec.id)}
                  onAccept={() => accept(rec.id)}
                  onReject={() => reject(rec.id)}
                />
              ))}
            </div>
          )}

          {canCreateVariant && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">
                {acceptedRecs.length} recommendation{acceptedRecs.length !== 1 ? "s" : ""} accepted.
                Create an AI Recommended Plan to compare against the original.
              </p>
              <button
                onClick={createVariant}
                className="rounded border border-violet-300 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
              >
                Create AI Recommended Plan
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-300 italic">
        Scenario analysis only — not real-world financial advice. Based on your modeled assumptions.
      </p>
    </div>
  );
}
