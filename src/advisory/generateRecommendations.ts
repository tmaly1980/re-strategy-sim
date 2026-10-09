import type { SimulationPlan, PropertyOpportunity, SimulationResult } from "@/simulation/types";
import type { MarketTimeline } from "@/simulation/types";
import type { Recommendation } from "./types";
import { generateReserveWarnings } from "./reserveWarnings";
import { generatePurchaseRecommendations } from "./purchaseRecommendations";
import { generateSaleRecommendations } from "./saleRecommendations";

// Entry point: generate all recommendations for one plan × timeline × result.
// Deterministic — same inputs always produce the same output.
export function generateRecommendations(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  timeline: MarketTimeline,
  result: SimulationResult
): Recommendation[] {
  const warnings = generateReserveWarnings(plan, properties, timeline, result);
  const purchase = generatePurchaseRecommendations(plan, properties, timeline, result);
  const sale = generateSaleRecommendations(plan, properties, timeline, result);

  // Deduplicate: if a delay recommendation already exists for a property,
  // suppress the reserve warning for the same property (delay addresses the root cause).
  const delayedPropertyIds = new Set(
    purchase.filter((r) => r.type === "delay").map((r) => r.propertyId)
  );
  const filteredWarnings = warnings.filter(
    (w) => !delayedPropertyIds.has(w.propertyId)
  );

  // Order: warnings first, then purchase, then sale
  return [...filteredWarnings, ...purchase, ...sale];
}
