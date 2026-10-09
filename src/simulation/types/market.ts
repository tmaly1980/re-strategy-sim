import type { SimDate } from "./dates";

export interface BaseMarketConditions {
  annualAppreciation: number;
  annualRentGrowth: number;
  vacancyRate: number;
  mortgageRate: number; // for new loans
}

// A timed market event that overrides specific conditions during its window.
// Omitted fields leave base conditions unchanged.
// Resolution rule: for each attribute, the most recently STARTED active event wins.
export interface MarketEvent {
  id: string;
  name: string;
  startDate: SimDate;
  endDate: SimDate;
  annualAppreciation?: number;
  annualRentGrowth?: number;
  vacancyRate?: number;
  mortgageRate?: number; // affects new loans only
  operatingExpenseAdjustment?: number; // additive delta
}

export interface ResolvedMarketConditions {
  appreciationRate: number; // monthly
  rentGrowthRate: number; // monthly
  vacancyRate: number;
  mortgageRate: number; // annual, for new loans this month
  operatingExpensePct: number; // adjustment delta from events
}

export interface MarketTimeline {
  id: string;
  name: string;
  marketEvents: MarketEvent[];
  oneTimeEvents: OneTimeEvent[];
}

export type OneTimeEventType = "propertyValueShock" | "expenseShock" | "rentShock";

export interface OneTimeEvent {
  id: string;
  name: string;
  date: SimDate;
  type: OneTimeEventType;
  // propertyValueShock/rentShock: fraction e.g. -0.20 = −20%
  // expenseShock: absolute $ per property
  magnitude: number;
}
