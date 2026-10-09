import type {
  SimulationPlan,
  PropertyOpportunity,
  SimulationResult,
  SimDate,
} from "@/simulation/types";
import type { MarketTimeline } from "@/simulation/types";
import { simDateToIndex, addMonths } from "@/simulation/types";
import { runSimulation } from "@/simulation/engine";
import type { Recommendation } from "./types";
import { nanoid } from "@/lib/nanoid";
import { fmtK, simDateLabel } from "./formatUtils";

// Minimum net worth improvement to justify recommending a sell
const MIN_SELL_BENEFIT = 10_000;
// Minimum net worth improvement to justify recommending a hold over selling
const MIN_HOLD_BENEFIT = 5_000;

// Look for a significant negative value shock in the timeline
function findNextNegativeShock(
  timeline: MarketTimeline,
  afterDate: SimDate
): { date: SimDate; magnitude: number } | null {
  const afterIdx = simDateToIndex(afterDate);
  const shocks = timeline.oneTimeEvents
    .filter(
      (e) =>
        e.type === "propertyValueShock" &&
        e.magnitude < -0.05 &&
        simDateToIndex(e.date) > afterIdx
    )
    .sort((a, b) => simDateToIndex(a.date) - simDateToIndex(b.date));
  if (shocks.length === 0) return null;
  return { date: shocks[0].date, magnitude: shocks[0].magnitude };
}

function findNegativeAppreciationPeriod(
  timeline: MarketTimeline,
  afterDate: SimDate
): { startDate: SimDate; endDate: SimDate } | null {
  const afterIdx = simDateToIndex(afterDate);
  const bearish = timeline.marketEvents
    .filter(
      (e) =>
        e.annualAppreciation !== undefined &&
        e.annualAppreciation < -0.01 &&
        simDateToIndex(e.startDate) > afterIdx
    )
    .sort((a, b) => simDateToIndex(a.startDate) - simDateToIndex(b.startDate));
  if (bearish.length === 0) return null;
  return { startDate: bearish[0].startDate, endDate: bearish[0].endDate };
}

export function generateSaleRecommendations(
  plan: SimulationPlan,
  properties: PropertyOpportunity[],
  timeline: MarketTimeline,
  result: SimulationResult
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const opp of properties) {
    const outcome = result.propertyOutcomes.find((o) => o.opportunityId === opp.id);
    if (!outcome || outcome.status === "not-purchased" || !outcome.purchasedDate) continue;

    const shock = findNextNegativeShock(timeline, outcome.purchasedDate);
    const bearPeriod = findNegativeAppreciationPeriod(timeline, outcome.purchasedDate);
    const threat = shock ?? (bearPeriod ? { date: bearPeriod.startDate, magnitude: -0.05 } : null);

    if (!threat) {
      // No negative event — possibly recommend HOLD if property is cash-flow positive
      const purchaseIdx = result.snapshots.findIndex(
        (s) =>
          s.date.year === outcome.purchasedDate!.year &&
          s.date.month === outcome.purchasedDate!.month
      );
      if (purchaseIdx < 0) continue;

      const recentCashFlows = result.snapshots
        .slice(Math.max(0, result.snapshots.length - 12))
        .map((s) => s.monthlyCashFlow);
      const avgCF = recentCashFlows.reduce((a, b) => a + b, 0) / (recentCashFlows.length || 1);

      if (avgCF > 0 && outcome.status === "purchased") {
        const sellingCost = (outcome.endingValue ?? 0) * plan.defaultSellingCostPct;
        // Only recommend hold if selling cost is material
        if (sellingCost >= MIN_HOLD_BENEFIT) {
          recs.push({
            id: nanoid(),
            timelineId: timeline.id,
            type: "hold",
            propertyId: opp.id,
            title: `Consider holding ${opp.name}`,
            summary: `No modeled downturn ahead. The property remains cash-flow positive and selling costs are approximately ${fmtK(sellingCost)}.`,
            explanation:
              `Under the "${timeline.name}" timeline, ${opp.name} shows no significant value correction ahead. ` +
              `Average monthly cash flow is approximately ${fmtK(avgCF)}, and selling would incur roughly ${fmtK(sellingCost)} in transaction costs. ` +
              `The simulation suggests holding produces the stronger outcome through the current horizon.`,
            estimatedImpact: {
              equityDifference: sellingCost, // holding preserves this vs selling
            },
            status: "pending",
          });
        }
      }
      continue;
    }

    // Test selling BEFORE the threat vs holding (current plan)
    const monthsUntilThreat = simDateToIndex(threat.date) - simDateToIndex(plan.startDate);
    // Sell 2 months before threat
    const sellBeforeDate = addMonths(plan.startDate, Math.max(0, monthsUntilThreat - 2));

    const heldMonths = simDateToIndex(outcome.purchasedDate) - simDateToIndex(plan.startDate);
    const holdYearsSoFar = heldMonths / 12;

    if (simDateToIndex(sellBeforeDate) <= simDateToIndex(outcome.purchasedDate)) continue;

    // If hold period prevents selling before the threat, surface an informational warning
    const monthsToThreat = simDateToIndex(threat.date) - simDateToIndex(outcome.purchasedDate ?? plan.startDate);
    const yearsToThreat = monthsToThreat / 12;
    if (yearsToThreat < opp.minHoldYears) {
      recs.push({
        id: nanoid(),
        timelineId: timeline.id,
        type: "warning",
        propertyId: opp.id,
        title: `${opp.name} faces a downturn before hold period ends`,
        summary:
          `This timeline models a significant event at ${simDateLabel(threat.date)}, but the ${opp.minHoldYears}-year hold period prevents selling beforehand.`,
        explanation:
          `Under the "${timeline.name}" timeline, ${opp.name} faces a modeled ${shock ? `${Math.round(Math.abs(threat.magnitude * 100))}% value shock` : "appreciation downturn"} ` +
          `starting ${simDateLabel(threat.date)} — approximately ${yearsToThreat.toFixed(1)} years after purchase. ` +
          `The minimum hold period is ${opp.minHoldYears} years, so the property cannot be sold before this event. ` +
          `Consider reducing the minimum hold period if you want to model selling before this downturn.`,
        status: "pending",
      });
      continue;
    }

    // Respect minHoldYears for the counterfactual sell simulation
    if (holdYearsSoFar < opp.minHoldYears) continue;

    // Run counterfactual: sell by lowering minHoldYears and adding equity trigger
    const sellProperties = properties.map((p) => {
      if (p.id !== opp.id) return p;
      const monthsHeld = simDateToIndex(sellBeforeDate) - simDateToIndex(outcome.purchasedDate!);
      return {
        ...p,
        minHoldYears: Math.max(0, monthsHeld / 12 - 0.1),
        sellWhenEquityPct: 0.01, // sell at 1% equity = sell as soon as eligible
      };
    });

    const altResult = runSimulation({ plan, properties: sellProperties, timeline });
    const nwImprovement = altResult.endingNetWorth - result.endingNetWorth;

    if (nwImprovement >= MIN_SELL_BENEFIT) {
      recs.push({
        id: nanoid(),
        timelineId: timeline.id,
        type: "sell",
        propertyId: opp.id,
        title: `Consider selling ${opp.name} before ${simDateLabel(threat.date)}`,
        summary:
          `This timeline models a significant value event starting ${simDateLabel(threat.date)}. ` +
          `Selling beforehand improves modeled net worth by approximately ${fmtK(nwImprovement)}.`,
        explanation:
          `Under the "${timeline.name}" timeline, ${opp.name} faces a modeled ${shock ? `${Math.round(Math.abs(threat.magnitude * 100))}% value shock` : "appreciation downturn"} ` +
          `starting ${simDateLabel(threat.date)}. ` +
          `Selling before this event preserves approximately ${fmtK(nwImprovement)} more net worth after estimated transaction costs. ` +
          `This is based on a simulation comparison and depends on the modeled assumptions.`,
        suggestedDate: sellBeforeDate,
        estimatedImpact: {
          endingNetWorthDifference: nwImprovement,
        },
        proposedChange: {
          kind: "addSellTrigger",
          propertyId: opp.id,
          newMinHoldYears: Math.max(
            opp.minHoldYears,
            (simDateToIndex(sellBeforeDate) - simDateToIndex(outcome.purchasedDate)) / 12 - 0.1
          ),
          newSellWhenEquityPct: 0.01,
        },
        status: "pending",
      });
    } else if (nwImprovement <= -MIN_HOLD_BENEFIT) {
      // Holding is materially better — recommend hold
      const sellingCost = (outcome.endingValue ?? 0) * plan.defaultSellingCostPct;
      recs.push({
        id: nanoid(),
        timelineId: timeline.id,
        type: "hold",
        propertyId: opp.id,
        title: `Consider holding ${opp.name} through the modeled downturn`,
        summary:
          `Selling before the downturn reduces net worth by approximately ${fmtK(Math.abs(nwImprovement))} after transaction costs under this timeline.`,
        explanation:
          `Under the "${timeline.name}" timeline, selling ${opp.name} before the modeled event at ${simDateLabel(threat.date)} ` +
          `would cost approximately ${fmtK(sellingCost)} in transaction costs and loses the eventual recovery in the simulation. ` +
          `Holding produces approximately ${fmtK(Math.abs(nwImprovement))} more net worth through the horizon. ` +
          `The simulation suggests holding is the stronger outcome under current assumptions.`,
        estimatedImpact: {
          endingNetWorthDifference: Math.abs(nwImprovement),
        },
        status: "pending",
      });
    }
  }

  return recs;
}
