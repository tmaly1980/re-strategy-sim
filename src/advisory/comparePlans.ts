import type { SimulationPlan, PropertyOpportunity } from "@/simulation/types";
import type { MarketTimeline } from "@/simulation/types";
import type { SimulationResult } from "@/simulation/types";
import { runSimulation } from "@/simulation/engine";

export interface TimelineComparison {
  timeline: MarketTimeline;
  originalResult: SimulationResult;
  variantResult: SimulationResult;
  endingNetWorthDiff: number;
  minimumCashDiff: number;
}

// Run both original and variant plans against all timelines and diff them.
export function comparePlans(
  originalPlan: SimulationPlan,
  originalProperties: PropertyOpportunity[],
  variantPlan: SimulationPlan,
  variantProperties: PropertyOpportunity[],
  timelines: MarketTimeline[]
): TimelineComparison[] {
  return timelines.map((timeline) => {
    const originalResult = runSimulation({
      plan: originalPlan,
      properties: originalProperties,
      timeline,
    });
    const variantResult = runSimulation({
      plan: variantPlan,
      properties: variantProperties,
      timeline,
    });
    return {
      timeline,
      originalResult,
      variantResult,
      endingNetWorthDiff: variantResult.endingNetWorth - originalResult.endingNetWorth,
      minimumCashDiff: variantResult.minCash - originalResult.minCash,
    };
  });
}
