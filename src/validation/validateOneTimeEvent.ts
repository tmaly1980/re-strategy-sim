import type { OneTimeEvent } from "@/simulation/types";
import type { ValidationIssue } from "./types";

export function validateOneTimeEvent(event: OneTimeEvent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = event.id;

  if (event.magnitude === 0) {
    issues.push({
      id: `one-time-event-zero-magnitude-${id}`,
      severity: "info",
      scope: "one-time-event",
      entityId: id,
      path: "magnitude",
      code: "one-time-event-zero-magnitude",
      message: "This event has no effect (magnitude is 0).",
    });
    return issues;
  }

  if (event.type === "propertyValueShock") {
    if (event.magnitude <= -1.0) {
      issues.push({
        id: `property-shock-eliminates-value-${id}`,
        severity: "error",
        scope: "one-time-event",
        entityId: id,
        path: "magnitude",
        code: "property-shock-eliminates-value",
        message: `A shock of ${(event.magnitude * 100).toFixed(0)}% or worse would eliminate all property value.`,
      });
    } else if (event.magnitude < -0.70) {
      issues.push({
        id: `property-shock-extreme-${id}`,
        severity: "warning",
        scope: "one-time-event",
        entityId: id,
        path: "magnitude",
        code: "property-shock-extreme",
        message: `A property value shock of ${(event.magnitude * 100).toFixed(0)}% is extreme.`,
      });
    }
  }

  return issues;
}
