import type { SimulationResult, MarketTimeline, PropertyOpportunity, SimulationPlan } from "@/simulation/types";
import type { GlobalEvidence, TimelineEvidence, PropertySummary } from "@/advisory/goals/types";

export function buildGlobalEvidence(
  timelineResults: { timeline: MarketTimeline; result: SimulationResult }[],
  properties: PropertyOpportunity[],
  plan: SimulationPlan
): GlobalEvidence {
  const propertySummaries: PropertySummary[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    purchasePrice: p.purchasePrice,
    monthlyRent: p.monthlyRent,
    earliestPurchaseYear: p.earliestPurchaseDate.year,
    earliestPurchaseMonth: p.earliestPurchaseDate.month,
    minReserveCash: p.minReserveCash,
    minHoldYears: p.minHoldYears,
    sellWhenEquityPct: p.sellWhenEquityPct,
  }));

  const timelines: TimelineEvidence[] = timelineResults.map(({ timeline, result }) => {
    const worstMonthlyCashFlow = result.snapshots.reduce(
      (min, s) => Math.min(min, s.monthlyCashFlow),
      0
    );

    const warnings = extractWarnings(result);

    return {
      timelineId: timeline.id,
      timelineName: timeline.name,
      endingNetWorth: result.endingNetWorth,
      endingCash: result.endingCash,
      endingEquity: result.endingEquity,
      endingMortgageDebt: result.endingMortgageDebt,
      minCash: result.minCash,
      propertiesOwned: result.propertiesOwned,
      propertiesSold: result.propertiesSold,
      worstMonthlyCashFlow,
      importantWarnings: warnings,
    };
  });

  return {
    properties: propertySummaries,
    timelines,
    planSummary: {
      startingCash: plan.startingCash,
      horizonYears: plan.horizonYears,
      startYear: plan.startDate.year,
    },
  };
}

function extractWarnings(result: SimulationResult): string[] {
  const warnings: string[] = [];
  if (result.minCash < 0) warnings.push("Cash went negative at least once");
  if (result.minCash < 10_000) warnings.push("Cash fell below $10,000");
  const skippedPurchases = result.events.filter((e) => e.type === "purchase-skipped");
  for (const e of skippedPurchases) warnings.push(e.message);
  return warnings;
}
