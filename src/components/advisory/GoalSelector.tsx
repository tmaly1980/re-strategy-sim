"use client";

import { SAVED_ADVISORY_GOALS } from "@/advisory/goals/savedGoals";
import type { SavedAdvisoryGoal } from "@/advisory/goals/types";

interface Props {
  goalText: string;
  selectedGoalId: string;
  onGoalTextChange: (text: string) => void;
  onGoalSelect: (goal: SavedAdvisoryGoal) => void;
}

const EXAMPLE_PROMPTS = [
  "Keep at least $25K cash across all timelines.",
  "Acquire every property without running dangerously low on cash.",
  "Favor the worst-case timeline even if Base Case returns decline.",
];

export function GoalSelector({ goalText, selectedGoalId, onGoalTextChange, onGoalSelect }: Props) {
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) return;
    const goal = SAVED_ADVISORY_GOALS.find((g) => g.id === id);
    if (goal) onGoalSelect(goal);
  }

  return (
    <div className="space-y-3">
      {/* Saved goal selector */}
      <div>
        <label htmlFor="saved-goal-select" className="block text-xs font-medium text-slate-600 mb-1">
          Saved Goal
        </label>
        <select
          id="saved-goal-select"
          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={selectedGoalId}
          onChange={handleSelectChange}
        >
          <option value="">Select a saved goal or type your own…</option>
          {SAVED_ADVISORY_GOALS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} — {g.description}
            </option>
          ))}
        </select>
      </div>

      {/* Goal text input */}
      <div>
        <label htmlFor="goal-textarea" className="block text-xs font-medium text-slate-600 mb-1">
          Goal
        </label>
        <textarea
          id="goal-textarea"
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="Describe your investment goal…"
          value={goalText}
          onChange={(e) => onGoalTextChange(e.target.value)}
        />
      </div>

      {/* Clickable examples */}
      <div>
        <p className="text-[10px] text-slate-400 mb-1.5">Examples — click to use:</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onGoalTextChange(ex)}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-left"
            >
              &ldquo;{ex}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
