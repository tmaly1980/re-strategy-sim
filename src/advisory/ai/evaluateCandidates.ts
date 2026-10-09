import type { SimulationPlan, PropertyOpportunity, MarketTimeline } from "@/simulation/types";
import type { PlanChange } from "@/advisory/types";
import type { CandidateEvaluation, CrossTimelineImpact } from "@/advisory/goals/types";
import { applyRecommendations } from "@/advisory/applyRecommendation";
import { runSimulation } from "@/simulation/engine";
import { nanoid } from "@/lib/nanoid";

// Generate a set of candidate plan changes to evaluate.
// These are meaningful mutations — date shifts and sell triggers.
export function generateCandidates(
  plan: SimulationPlan,
  properties: PropertyOpportunity[]
): Array<{ change: PlanChange; label: string }> {
  const candidates: Array<{ change: PlanChange; label: string }> = [];

  for (const p of properties) {
    // Delay purchase by 6 months
    const d6 = shiftDate(p.earliestPurchaseDate, 6);
    candidates.push({
      change: { kind: "shiftPurchaseDate", propertyId: p.id, newEarliestPurchaseDate: d6 },
      label: `Delay ${p.name} by 6 months (to ${d6.year}/${String(d6.month).padStart(2, "0")})`,
    });

    // Delay purchase by 12 months
    const d12 = shiftDate(p.earliestPurchaseDate, 12);
    candidates.push({
      change: { kind: "shiftPurchaseDate", propertyId: p.id, newEarliestPurchaseDate: d12 },
      label: `Delay ${p.name} by 12 months (to ${d12.year}/${String(d12.month).padStart(2, "0")})`,
    });

    // Add sell trigger at 40% equity
    if (!p.sellWhenEquityPct) {
      candidates.push({
        change: { kind: "addSellTrigger", propertyId: p.id, newSellWhenEquityPct: 0.40 },
        label: `Add sell trigger for ${p.name} at 40% equity`,
      });
    }

    // Remove sell trigger if one exists
    if (p.sellWhenEquityPct) {
      candidates.push({
        change: { kind: "removeSellTrigger", propertyId: p.id },
        label: `Remove sell trigger for ${p.name}`,
      });
    }
  }

  return candidates;
}

// Evaluate each candidate across all timelines and return impact deltas.
export function evaluateCandidates(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  timelines: MarketTimeline[]
): CandidateEvaluation[] {
  // Run baseline across all timelines
  const baselineResults = timelines.map((timeline) => ({
    timeline,
    result: runSimulation({ plan, properties, timeline }),
  }));

  const candidates = generateCandidates(plan, properties);

  return candidates.map(({ change, label }) => {
    // Apply the candidate change
    const fakeRec = {
      id: nanoid(),
      timelineId: "",
      type: "delay" as const,
      title: "",
      summary: "",
      explanation: "",
      status: "accepted" as const,
      proposedChange: change,
    };
    const { plan: newPlan, properties: newProps } = applyRecommendations(plan, properties, [fakeRec]);

    // Evaluate across all timelines
    const crossTimelineImpact: CrossTimelineImpact[] = timelines.map((timeline) => {
      const candidateResult = runSimulation({ plan: newPlan, properties: newProps, timeline });
      const baseline = baselineResults.find((b) => b.timeline.id === timeline.id)!.result;

      return {
        timelineId: timeline.id,
        timelineName: timeline.name,
        endingNetWorthDiff: candidateResult.endingNetWorth - baseline.endingNetWorth,
        minCashDiff: candidateResult.minCash - baseline.minCash,
        endingEquityDiff: candidateResult.endingEquity - baseline.endingEquity,
      };
    });

    return { change, label, crossTimelineImpact };
  });
}

function shiftDate(date: { year: number; month: number }, months: number): { year: number; month: number } {
  const total = (date.year - 1) * 12 + (date.month - 1) + months;
  return { year: Math.floor(total / 12) + 1, month: (total % 12) + 1 };
}
