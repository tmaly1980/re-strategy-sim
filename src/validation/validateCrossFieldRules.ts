import type { SimulationPlan, PropertyOpportunity, MarketTimeline } from "@/simulation/types";
import { simDateToIndex } from "@/simulation/types";
import type { ValidationIssue } from "./types";

interface CrossFieldInput {
  plan: SimulationPlan;
  properties: PropertyOpportunity[];
  timelines: MarketTimeline[];
}

function planEndIndex(plan: SimulationPlan): number {
  return simDateToIndex({
    year: plan.startDate.year + plan.horizonYears,
    month: plan.startDate.month,
  });
}

export function validateCrossFieldRules({
  plan,
  properties,
}: CrossFieldInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const simStart = simDateToIndex(plan.startDate);
  const simEnd = planEndIndex(plan);

  for (const prop of properties) {
    const earliestIdx = simDateToIndex(prop.earliestPurchaseDate);
    const latestIdx = prop.latestPurchaseDate
      ? simDateToIndex(prop.latestPurchaseDate)
      : undefined;

    // Property becomes available after simulation ends
    if (earliestIdx > simEnd) {
      issues.push({
        id: `property-available-after-horizon-${prop.id}`,
        severity: "error",
        scope: "property",
        entityId: prop.id,
        path: "earliestPurchaseDate",
        code: "property-available-after-horizon",
        message: `"${prop.name}" becomes available after the simulation ends and can never be purchased.`,
      });
    }

    // Property expires before simulation begins
    if (latestIdx !== undefined && latestIdx < simStart) {
      issues.push({
        id: `property-expired-before-start-${prop.id}`,
        severity: "error",
        scope: "property",
        entityId: prop.id,
        path: "latestPurchaseDate",
        code: "property-expired-before-start",
        message: `"${prop.name}" opportunity expires before the simulation begins and can never be purchased.`,
      });
    }

    // Affordability check: can the starting cash cover the required upfront cost?
    const downPayment = prop.purchasePrice * prop.downPaymentPct;
    const closingCosts = prop.purchasePrice * prop.closingCostPct;
    const requiredCash = downPayment + closingCosts + prop.minReserveCash;
    if (requiredCash > plan.startingCash) {
      issues.push({
        id: `property-may-not-be-affordable-${prop.id}`,
        severity: "warning",
        scope: "property",
        entityId: prop.id,
        code: "property-may-not-be-affordable",
        message: `"${prop.name}" requires ~$${Math.round(requiredCash).toLocaleString()} upfront (down + closing + reserve), but starting cash is $${Math.round(plan.startingCash).toLocaleString()}. It may not be affordable at simulation start.`,
        details: "This is an estimate based on starting cash alone. If the property is not available until later in the simulation, accumulated rental income may make it affordable.",
      });
    }
  }

  return issues;
}
