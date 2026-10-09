"use client";

import type { StrategyGoal } from "@/advisory/goals/types";

interface Props {
  goal: StrategyGoal | null;
  loading: boolean;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  "maximize-net-worth": "Maximize Net Worth",
  "preserve-cash": "Preserve Cash",
  "minimize-debt": "Minimize Debt",
  "downturn-resilience": "Downturn Resilience",
  "acquire-properties": "Acquire All Properties",
  "balanced": "Balanced",
  "custom": "Custom",
};

export function GoalInterpretation({ goal, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 space-y-2 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
      </div>
    );
  }

  if (!goal) return null;

  const constraints: string[] = [];
  if (goal.constraints.minimumCashReserve !== undefined)
    constraints.push(`Cash ≥ $${goal.constraints.minimumCashReserve.toLocaleString()}`);
  if (goal.constraints.avoidNegativeCash)
    constraints.push("Avoid negative cash");
  if (goal.constraints.acquireAllProperties)
    constraints.push("Acquire all properties");
  if (goal.constraints.focusWorstTimeline)
    constraints.push("Optimize worst-case timeline");
  if (goal.constraints.maximumDebt !== undefined)
    constraints.push(`Debt ≤ $${goal.constraints.maximumDebt.toLocaleString()}`);

  const topPriorities = Object.entries(goal.priorities)
    .filter(([, v]) => v >= 0.4)
    .sort(([, a], [, b]) => b - a)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase());

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Understood Goal</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-500">Objective</span>
        <span className="font-medium text-slate-800">{OBJECTIVE_LABELS[goal.primaryObjective] ?? goal.primaryObjective}</span>

        {constraints.length > 0 && (
          <>
            <span className="text-slate-500">Hard constraints</span>
            <span className="font-medium text-slate-800">{constraints.join(" · ")}</span>
          </>
        )}

        {topPriorities.length > 0 && (
          <>
            <span className="text-slate-500">Priorities</span>
            <span className="font-medium text-slate-800">{topPriorities.join(", ")}</span>
          </>
        )}
      </div>

      <p className="text-xs text-slate-600 italic">&ldquo;{goal.summary}&rdquo;</p>
    </div>
  );
}
