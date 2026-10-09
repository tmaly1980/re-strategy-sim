import type { SimulationPlan, PropertyOpportunity, SimulationResult } from "@/simulation/types";
import type { MarketTimeline } from "@/simulation/types";
import type { Recommendation } from "./types";
import { nanoid } from "@/lib/nanoid";
import { fmt, fmtK } from "./formatUtils";

// Warn if a property purchase causes cash to fall below the property's own
// minReserveCash threshold for a sustained stretch.
export function generateReserveWarnings(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  timeline: MarketTimeline,
  result: SimulationResult
): Recommendation[] {
  const warnings: Recommendation[] = [];

  for (const opp of properties) {
    const outcome = result.propertyOutcomes.find((o) => o.opportunityId === opp.id);
    if (!outcome || outcome.status === "not-purchased") continue;
    if (!outcome.purchasedDate) continue;

    // Find the purchase month index and look at subsequent months
    const purchaseIdx = result.snapshots.findIndex(
      (s) =>
        s.date.year === outcome.purchasedDate!.year &&
        s.date.month === outcome.purchasedDate!.month
    );
    if (purchaseIdx < 0) continue;

    // Count months below reserve threshold in the 24 months following purchase
    const window = result.snapshots.slice(purchaseIdx, purchaseIdx + 25);
    const lowMonths = window.filter((s) => s.cash < opp.minReserveCash).length;
    const minCashWindow = Math.min(...window.map((s) => s.cash));

    if (lowMonths > 0) {
      const shortage = opp.minReserveCash - minCashWindow;
      warnings.push({
        id: nanoid(),
        timelineId: timeline.id,
        type: "warning",
        propertyId: opp.id,
        title: `Reserve risk: ${opp.name}`,
        summary: `Purchasing ${opp.name} leaves cash below the ${fmt(opp.minReserveCash)} reserve threshold for ${lowMonths} month${lowMonths !== 1 ? "s" : ""} under this timeline.`,
        explanation:
          `Under the "${timeline.name}" timeline, acquiring ${opp.name} reduces cash reserves to approximately ${fmtK(minCashWindow)} — ` +
          `${fmtK(shortage)} below the ${fmtK(opp.minReserveCash)} minimum you configured. ` +
          `This persists for ${lowMonths} month${lowMonths !== 1 ? "s" : ""} after purchase. ` +
          `Consider increasing starting cash, delaying the purchase, or lowering the down payment to reduce this risk.`,
        estimatedImpact: {
          minimumCashDifference: -shortage,
        },
        status: "pending",
      });
    }
  }

  return warnings;
}
