export type ValidationSeverity = "error" | "warning" | "info";
export type ValidationScope =
  | "plan"
  | "property"
  | "timeline"
  | "market-event"
  | "one-time-event"
  | "recommendation";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  scope: ValidationScope;
  entityId?: string;   // property id, event id, etc.
  path?: string;       // field name e.g. "sellWhenEquityPct"
  code: string;        // machine-readable e.g. "sell-threshold-below-down-payment"
  message: string;     // short, shown in UI
  details?: string;    // longer explanation shown on expand
}
