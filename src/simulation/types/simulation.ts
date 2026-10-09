import type { SimDate } from "./dates";
import type { BaseMarketConditions } from "./market";

// SimulationPlan — investor decisions, timeline-independent.
// The same plan is replayed against every MarketTimeline without modification.
export interface SimulationPlan {
  startDate: SimDate;
  horizonYears: number; // any positive integer, e.g. 10, 15, 20, 30
  startingCash: number;
  defaultSellingCostPct: number;
  defaultOperatingExpensePct: number;
  baseMarket: BaseMarketConditions;
}

export type SimEventType =
  | "purchase"
  | "purchase-skipped"
  | "sale"
  | "market-event-start"
  | "market-event-end"
  | "one-time-shock"
  | "property-available"
  | "info";

export interface SimulationEvent {
  date: SimDate;
  type: SimEventType;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface MonthlySnapshot {
  date: SimDate;
  cash: number;
  totalPropertyValue: number;
  totalMortgageDebt: number;
  equity: number;
  netWorth: number; // invariant: cash + totalPropertyValue - totalMortgageDebt
  propertyCount: number;
  monthlyCashFlow: number;
}

export interface SimulationResult {
  snapshots: MonthlySnapshot[];
  events: SimulationEvent[];
  propertyOutcomes: import("./property").PropertyOutcome[];
  endingCash: number;
  endingNetWorth: number;
  endingEquity: number;
  endingMortgageDebt: number;
  propertiesOwned: number;
  propertiesSold: number;
  minCash: number;
}

export interface SimulationDiagnostics {
  monthsSimulated: number;
  timelinesSimulated: number;
  propertiesPurchased: number;
  propertiesSold: number;
  marketTransitionsProcessed: number;
  oneTimeEventsApplied: number;
  durationMs: number;
}
