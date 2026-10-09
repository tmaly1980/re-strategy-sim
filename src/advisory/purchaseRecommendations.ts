import type {
  SimulationPlan,
  PropertyOpportunity,
  SimulationResult,
} from "@/simulation/types";
import type { MarketTimeline } from "@/simulation/types";
import { addMonths, simDateToIndex } from "@/simulation/types";
import { runSimulation } from "@/simulation/engine";
import type { Recommendation } from "./types";
import { nanoid } from "@/lib/nanoid";
import { fmtK, fmtDiff, simDateLabel } from "./formatUtils";

// Candidate delay offsets (months from earliest purchase date) to test
const DELAY_CANDIDATES = [3, 6, 9, 12, 18, 24];

// Minimum improvement thresholds
const MIN_CASH_IMPROVEMENT = 3_000;
const MIN_NETWORTH_IMPROVEMENT = 5_000;

export function generatePurchaseRecommendations(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  timeline: MarketTimeline,
  result: SimulationResult
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const opp of properties) {
    const outcome = result.propertyOutcomes.find((o) => o.opportunityId === opp.id);
    if (!outcome) continue;

    if (outcome.status === "not-purchased") {
      // Already couldn't purchase — no delay recommendation
      continue;
    }

    if (!outcome.purchasedDate) continue;

    // Only consider delay if cash dipped dangerously after purchase
    const purchaseIdx = result.snapshots.findIndex(
      (s) =>
        s.date.year === outcome.purchasedDate!.year &&
        s.date.month === outcome.purchasedDate!.month
    );
    if (purchaseIdx < 0) continue;

    const postPurchaseWindow = result.snapshots.slice(purchaseIdx, purchaseIdx + 13);
    const minCashAfterPurchase = Math.min(...postPurchaseWindow.map((s) => s.cash));

    // Only investigate delay if cash reserves dropped significantly
    if (minCashAfterPurchase >= opp.minReserveCash * 1.5) continue;

    // Test candidate delay dates
    let bestDelay: { months: number; endNW: number; minCash: number } | null = null;

    for (const delayMonths of DELAY_CANDIDATES) {
      const candidateDate = addMonths(opp.earliestPurchaseDate, delayMonths);
      // Don't delay past end of horizon or past latestPurchaseDate
      if (simDateToIndex(candidateDate) >= simDateToIndex(plan.startDate) + plan.horizonYears * 12) continue;
      if (opp.latestPurchaseDate && simDateToIndex(candidateDate) > simDateToIndex(opp.latestPurchaseDate)) continue;

      const altProperties = properties.map((p) =>
        p.id === opp.id ? { ...p, earliestPurchaseDate: candidateDate } : p
      );
      const altResult = runSimulation({ plan, properties: altProperties, timeline });

      const cashImprovement = altResult.minCash - result.minCash;
      const nwImprovement = altResult.endingNetWorth - result.endingNetWorth;

      if (
        cashImprovement >= MIN_CASH_IMPROVEMENT ||
        nwImprovement >= MIN_NETWORTH_IMPROVEMENT
      ) {
        if (
          !bestDelay ||
          cashImprovement + nwImprovement / 10_000 >
            (altResult.minCash - result.minCash) + (bestDelay.endNW - result.endingNetWorth) / 10_000
        ) {
          bestDelay = {
            months: delayMonths,
            endNW: altResult.endingNetWorth,
            minCash: altResult.minCash,
          };
        }
        // Take the first materially better option
        if (cashImprovement >= MIN_CASH_IMPROVEMENT && nwImprovement >= 0) break;
      }
    }

    if (!bestDelay) continue;

    const suggestedDate = addMonths(opp.earliestPurchaseDate, bestDelay.months);
    const cashImprovement = bestDelay.minCash - result.minCash;
    const nwImprovement = bestDelay.endNW - result.endingNetWorth;

    recs.push({
      id: nanoid(),
      timelineId: timeline.id,
      type: "delay",
      propertyId: opp.id,
      title: `Consider delaying ${opp.name} to ${simDateLabel(suggestedDate)}`,
      summary:
        `Purchasing at the earliest date leaves limited cash reserves. ` +
        `Waiting ${bestDelay.months} months improves minimum reserves by approximately ${fmtK(cashImprovement)}.`,
      explanation:
        `Under the "${timeline.name}" timeline, purchasing ${opp.name} at its earliest date (${simDateLabel(opp.earliestPurchaseDate)}) ` +
        `reduces cash to approximately ${fmtK(minCashAfterPurchase)} in the months immediately after. ` +
        `Delaying to ${simDateLabel(suggestedDate)} improves minimum reserves by approximately ${fmtK(cashImprovement)}` +
        (nwImprovement !== 0
          ? ` and ${nwImprovement >= 0 ? "increases" : "reduces"} ending net worth by approximately ${fmtK(Math.abs(nwImprovement))}`
          : "") +
        `. Based on this scenario's modeled market conditions.`,
      suggestedDate,
      estimatedImpact: {
        endingNetWorthDifference: nwImprovement,
        minimumCashDifference: cashImprovement,
      },
      proposedChange: {
        kind: "shiftPurchaseDate",
        propertyId: opp.id,
        newEarliestPurchaseDate: suggestedDate,
      },
      status: "pending",
    });
  }

  return recs;
}
