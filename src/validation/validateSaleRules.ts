import type { PropertyOpportunity } from "@/simulation/types";
import type { ValidationIssue } from "./types";

export function validateSaleRules(prop: PropertyOpportunity): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = prop.id;
  const threshold = prop.sellWhenEquityPct;

  if (threshold === undefined) return issues;

  const down = prop.downPaymentPct;

  // High threshold — may never be reached
  if (threshold >= 0.98) {
    issues.push({
      id: `sell-threshold-very-high-${id}`,
      severity: "info",
      scope: "property",
      entityId: id,
      path: "sellWhenEquityPct",
      code: "sell-threshold-very-high",
      message: `Sell-at-equity threshold of ${(threshold * 100).toFixed(0)}% is very high and may never be reached, causing the property to hold indefinitely.`,
    });
  }

  // Threshold at or below down payment
  if (threshold <= down) {
    const msg = prop.minHoldYears === 0
      ? `Sell-at-equity threshold (${(threshold * 100).toFixed(0)}%) is at or below starting equity from down payment (${(down * 100).toFixed(0)}%). With no hold period, the property may sell almost immediately.`
      : `Sell-at-equity threshold (${(threshold * 100).toFixed(0)}%) is at or below starting equity from down payment (${(down * 100).toFixed(0)}%). The property may qualify for sale immediately after the hold period.`;
    issues.push({
      id: `sell-threshold-below-down-payment-${id}`,
      severity: "warning",
      scope: "property",
      entityId: id,
      path: "sellWhenEquityPct",
      code: "sell-threshold-below-down-payment",
      message: msg,
    });
  } else if (threshold <= down + 0.05) {
    // Slightly above down payment
    issues.push({
      id: `sell-threshold-near-down-payment-${id}`,
      severity: "warning",
      scope: "property",
      entityId: id,
      path: "sellWhenEquityPct",
      code: "sell-threshold-near-down-payment",
      message: `Sell-at-equity threshold (${(threshold * 100).toFixed(0)}%) is only slightly above starting equity (${(down * 100).toFixed(0)}%) — sale may occur very soon after the hold period.`,
    });
  }

  // minHoldYears === 0 with threshold set (and threshold above down payment — separate from above)
  if (prop.minHoldYears === 0 && threshold > down) {
    issues.push({
      id: `sell-threshold-no-hold-${id}`,
      severity: "info",
      scope: "property",
      entityId: id,
      path: "minHoldYears",
      code: "sell-threshold-no-hold",
      message: `With minHoldYears=0, the property may sell almost immediately if equity already exceeds the threshold.`,
    });
  }

  return issues;
}
