// Domain types for the reactive real estate portfolio simulator.
// Three intentionally separate concepts:
//   1. PropertyOpportunity — what could be acquired and on what terms
//   2. MarketEvent / OneTimeEvent — external conditions over time
//   3. PortfolioState / SimulationResult — what actually happened

// ─── Dates ────────────────────────────────────────────────────────────────────
// Internally we use SimDate = { year, month } (month is 1-based).
// This avoids JS Date timezone pitfalls for a monthly simulation.

export interface SimDate {
  year: number;
  month: number; // 1–12
}

// Returns months since a fixed epoch — used for ordered comparisons
export function simDateToIndex(d: SimDate): number {
  return d.year * 12 + d.month;
}

export function simDateFromIndex(idx: number): SimDate {
  const month = ((idx - 1) % 12) + 1;
  const year = Math.floor((idx - 1) / 12) + 1;
  // This is relative — for display we offset from startDate
  return { year, month };
}

export function simDateLabel(d: SimDate): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.month - 1]} ${d.year}`;
}

export function addMonths(d: SimDate, n: number): SimDate {
  const totalMonths = (d.year * 12 + (d.month - 1)) + n;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1 };
}

export function simDatesBefore(a: SimDate, b: SimDate): boolean {
  return simDateToIndex(a) < simDateToIndex(b);
}

export function simDatesEqual(a: SimDate, b: SimDate): boolean {
  return a.year === b.year && a.month === b.month;
}

// ─── Simulation Plan (investor decisions — timeline-independent) ──────────────
// Everything the investor controls: when they want to buy, on what terms, reserves.

export interface SimulationPlan {
  startDate: SimDate;
  horizonYears: 10 | 20 | 30;
  startingCash: number;
  defaultSellingCostPct: number; // e.g. 0.06
  defaultOperatingExpensePct: number; // e.g. 0.35
  baseMarket: BaseMarketConditions; // default conditions before any events
}

// Keep SimulationConfig as alias for backward-compat within the engine
export type SimulationConfig = SimulationPlan;

// ─── Base Market Conditions ───────────────────────────────────────────────────

export interface BaseMarketConditions {
  annualAppreciation: number; // e.g. 0.035
  annualRentGrowth: number; // e.g. 0.025
  vacancyRate: number; // e.g. 0.05
  mortgageRate: number; // e.g. 0.065, for new loans
}

// ─── Market Timeline (external uncertainty — plan-independent) ───────────────
// Represents one possible future. The same plan can be run against many timelines.

export interface MarketTimeline {
  id: string;
  name: string;
  marketEvents: MarketEvent[];
  oneTimeEvents: OneTimeEvent[];
}

// ─── Property Opportunity ─────────────────────────────────────────────────────

export interface PropertyOpportunity {
  id: string;
  name: string;
  earliestPurchaseDate: SimDate;
  latestPurchaseDate?: SimDate;
  purchasePrice: number;
  monthlyRent: number;
  downPaymentPct: number; // e.g. 0.20
  // null = use current market rate at time of purchase
  fixedMortgageRate: number | null;
  mortgageTermYears: number; // default 30
  closingCostPct: number; // e.g. 0.03
  operatingExpensePct?: number; // overrides global default if set
  vacancyRateOverride?: number; // overrides market vacancy if set
  minReserveCash: number; // required cash remaining after purchase
  // Sale criteria
  minHoldYears: number; // e.g. 10; 0 = never auto-sell
  sellWhenEquityPct?: number; // sell when equity/value >= this fraction
}

// ─── Mortgage ─────────────────────────────────────────────────────────────────

export interface Mortgage {
  originalPrincipal: number;
  balance: number;
  annualRate: number;
  monthlyPayment: number;
  termMonths: number;
  monthsRemaining: number;
}

// ─── Market Events ────────────────────────────────────────────────────────────
// Each event overrides specific market attributes during its window.
// Resolution rule: for each attribute independently, the most recently STARTED
// active event wins. Events affecting different attributes compose freely.

export interface MarketEvent {
  id: string;
  name: string;
  startDate: SimDate;
  endDate: SimDate;
  // All fields are optional — only specified fields are overridden
  annualAppreciation?: number;
  annualRentGrowth?: number;
  vacancyRate?: number;
  mortgageRate?: number; // for new loans only
  operatingExpenseAdjustment?: number; // additive delta, e.g. +0.05
}

// ─── One-Time Events ──────────────────────────────────────────────────────────

export type OneTimeEventType = "propertyValueShock" | "expenseShock" | "rentShock";

export interface OneTimeEvent {
  id: string;
  name: string;
  date: SimDate;
  type: OneTimeEventType;
  // propertyValueShock: fraction e.g. -0.20 (−20%)
  // expenseShock: absolute per property e.g. 12000
  // rentShock: fraction e.g. 0.08 (+8%)
  magnitude: number;
}

// ─── Resolved Market Conditions ───────────────────────────────────────────────

export interface ResolvedMarketConditions {
  appreciationRate: number; // monthly, converted from annual
  rentGrowthRate: number; // monthly
  vacancyRate: number;
  mortgageRate: number; // annual, for new loans this month
  operatingExpensePct: number;
}

// ─── Acquisition Decision ─────────────────────────────────────────────────────

export type AcquisitionReason =
  | "eligible"
  | "before-availability"
  | "after-expiry"
  | "already-purchased"
  | "insufficient-funds"
  | "insufficient-reserves";

export interface AcquisitionDecision {
  allowed: boolean;
  reason: AcquisitionReason;
  requiredCash: number;
  projectedCashAfterPurchase: number;
}

// ─── Simulation Events ────────────────────────────────────────────────────────

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

// ─── Monthly Snapshot ─────────────────────────────────────────────────────────

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

// ─── Property Outcome (per acquisition opportunity) ───────────────────────────

export type PropertyStatus = "purchased" | "sold" | "not-purchased" | "pending";

export interface PropertyOutcome {
  opportunityId: string;
  name: string;
  status: PropertyStatus;
  purchasedDate?: SimDate;
  soldDate?: SimDate;
  purchasePrice?: number;
  endingValue?: number;
  mortgageBalance?: number;
  equity?: number;
  delayMonths?: number; // months after earliestPurchaseDate before purchase
  skipReason?: AcquisitionReason; // why it was never purchased
  firstRejectionReason?: AcquisitionReason;
}

// ─── Simulation Result ────────────────────────────────────────────────────────

export interface SimulationResult {
  snapshots: MonthlySnapshot[];
  events: SimulationEvent[];
  propertyOutcomes: PropertyOutcome[];
  // Final state
  endingCash: number;
  endingNetWorth: number;
  endingEquity: number;
  endingMortgageDebt: number;
  propertiesOwned: number;
  propertiesSold: number;
  minCash: number; // lowest cash balance reached during simulation
}
