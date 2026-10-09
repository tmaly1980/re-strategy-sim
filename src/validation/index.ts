import type { SimulationPlan, PropertyOpportunity, MarketTimeline } from "@/simulation/types";
import type { ValidationIssue } from "./types";
import { validatePlan } from "./validatePlan";
import { validateProperty } from "./validateProperty";
import { validateSaleRules } from "./validateSaleRules";
import { validateTimeline } from "./validateTimeline";
import { validateCrossFieldRules } from "./validateCrossFieldRules";

export type { ValidationIssue, ValidationSeverity, ValidationScope } from "./types";

interface RunValidationInput {
  plan: SimulationPlan;
  properties: PropertyOpportunity[];
  timelines: MarketTimeline[];
}

export function runValidation({
  plan,
  properties,
  timelines,
}: RunValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Plan-level
  issues.push(...validatePlan(plan));

  // Per-property
  for (const prop of properties) {
    issues.push(...validateProperty(prop));
    issues.push(...validateSaleRules(prop));
  }

  // Per-timeline (includes per-event validation)
  for (const timeline of timelines) {
    issues.push(...validateTimeline(timeline, plan));
  }

  // Cross-field (plan + properties + timelines together)
  issues.push(...validateCrossFieldRules({ plan, properties, timelines }));

  return issues;
}
