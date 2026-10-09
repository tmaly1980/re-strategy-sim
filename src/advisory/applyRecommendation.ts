import type { SimulationPlan, PropertyOpportunity } from "@/simulation/types";
import type { Recommendation } from "./types";

export interface ApplyResult {
  plan: SimulationPlan;
  properties: PropertyOpportunity[];
}

// Pure function — returns new plan + properties, never mutates inputs.
export function applyRecommendation(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  rec: Recommendation
): ApplyResult {
  const change = rec.proposedChange;
  if (!change || change.kind === "none") {
    return { plan, properties };
  }

  const updatedProperties = properties.map((p) => {
    if (p.id !== change.propertyId) return p;

    switch (change.kind) {
      case "shiftPurchaseDate":
        return change.newEarliestPurchaseDate
          ? { ...p, earliestPurchaseDate: change.newEarliestPurchaseDate }
          : p;

      case "addSellTrigger":
        return {
          ...p,
          ...(change.newSellWhenEquityPct !== undefined
            ? { sellWhenEquityPct: change.newSellWhenEquityPct }
            : {}),
          ...(change.newMinHoldYears !== undefined
            ? { minHoldYears: change.newMinHoldYears }
            : {}),
        };

      case "removeSellTrigger":
        return { ...p, sellWhenEquityPct: undefined };

      default:
        return p;
    }
  });

  return { plan, properties: updatedProperties };
}

// Apply multiple accepted recommendations in sequence.
export function applyRecommendations(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  recs: Recommendation[]
): ApplyResult {
  let current: ApplyResult = { plan, properties };
  for (const rec of recs) {
    if (rec.status === "accepted") {
      current = applyRecommendation(current.plan, current.properties, rec);
    }
  }
  return current;
}
