import type {
  PropertyOpportunity,
  AcquisitionDecision,
  AcquisitionReason,
} from "../types/property";
import type { SimDate } from "../types/dates";
import type { ResolvedMarketConditions } from "../types/market";
import type { SimulationPlan } from "../types/simulation";
import { simDateToIndex } from "../types/dates";

// Evaluate whether a property can be acquired on a given date.
// Returns a structured decision with a typed reason — not a bare boolean.
// This is tested independently and drives both acquisition logic and UI explanations.
export function evaluateAcquisition(
  opp: PropertyOpportunity,
  cash: number,
  date: SimDate,
  _market: ResolvedMarketConditions,
  _config: SimulationPlan
): AcquisitionDecision {
  const dateIdx = simDateToIndex(date);

  if (simDateToIndex(opp.earliestPurchaseDate) > dateIdx) {
    return deny("before-availability", 0, cash);
  }
  if (opp.latestPurchaseDate && simDateToIndex(opp.latestPurchaseDate) < dateIdx) {
    return deny("after-expiry", 0, cash);
  }

  const downPayment = opp.purchasePrice * opp.downPaymentPct;
  const closingCosts = opp.purchasePrice * opp.closingCostPct;
  const cashAfter = cash - downPayment - closingCosts;
  const totalRequired = downPayment + closingCosts + opp.minReserveCash;

  if (cash < downPayment + closingCosts) {
    return deny("insufficient-funds", totalRequired, cashAfter);
  }
  if (cashAfter < opp.minReserveCash) {
    return deny("insufficient-reserves", totalRequired, cashAfter);
  }

  return {
    allowed: true,
    reason: "eligible",
    requiredCash: totalRequired,
    projectedCashAfterPurchase: cashAfter,
  };
}

function deny(
  reason: AcquisitionReason,
  required: number,
  cashAfter: number
): AcquisitionDecision {
  return { allowed: false, reason, requiredCash: required, projectedCashAfterPurchase: cashAfter };
}

export function skipMessage(name: string, d: AcquisitionDecision): string {
  switch (d.reason) {
    case "insufficient-funds":
      return `${name} not purchased: need $${Math.round(d.requiredCash).toLocaleString()} but cash is insufficient.`;
    case "insufficient-reserves":
      return `${name} not purchased: purchase would leave less than required reserves.`;
    case "after-expiry":
      return `${name} acquisition window expired — opportunity missed.`;
    default:
      return `${name} not purchased (${d.reason}).`;
  }
}
