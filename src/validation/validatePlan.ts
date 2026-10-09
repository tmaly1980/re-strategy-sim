import type { SimulationPlan } from "@/simulation/types";
import type { ValidationIssue } from "./types";

export function validatePlan(plan: SimulationPlan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (plan.horizonYears <= 0) {
    issues.push({
      id: `horizon-non-positive-plan`,
      severity: "error",
      scope: "plan",
      path: "horizonYears",
      code: "horizon-non-positive",
      message: "Simulation horizon must be greater than 0 years.",
    });
  }

  if (plan.startingCash < 0) {
    issues.push({
      id: `starting-cash-negative-plan`,
      severity: "error",
      scope: "plan",
      path: "startingCash",
      code: "starting-cash-negative",
      message: "Starting cash cannot be negative.",
    });
  }

  if (plan.defaultSellingCostPct < 0) {
    issues.push({
      id: `selling-cost-negative-plan`,
      severity: "error",
      scope: "plan",
      path: "defaultSellingCostPct",
      code: "selling-cost-negative",
      message: "Default selling cost percentage cannot be negative.",
    });
  } else if (plan.defaultSellingCostPct > 0.30) {
    issues.push({
      id: `selling-cost-extreme-plan`,
      severity: "warning",
      scope: "plan",
      path: "defaultSellingCostPct",
      code: "selling-cost-extreme",
      message: `Selling cost of ${(plan.defaultSellingCostPct * 100).toFixed(1)}% is unusually high (above 30%).`,
    });
  }

  if (plan.defaultOperatingExpensePct < 0) {
    issues.push({
      id: `opex-negative-plan`,
      severity: "error",
      scope: "plan",
      path: "defaultOperatingExpensePct",
      code: "opex-negative",
      message: "Default operating expense percentage cannot be negative.",
    });
  } else if (plan.defaultOperatingExpensePct > 0.90) {
    issues.push({
      id: `opex-extreme-plan`,
      severity: "warning",
      scope: "plan",
      path: "defaultOperatingExpensePct",
      code: "opex-extreme",
      message: `Operating expense of ${(plan.defaultOperatingExpensePct * 100).toFixed(0)}% is extremely high (above 90%).`,
    });
  }

  return issues;
}
