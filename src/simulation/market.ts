import type {
  SimDate,
  BaseMarketConditions,
  MarketEvent,
  ResolvedMarketConditions,
} from "./types";
import { simDateToIndex } from "./types";

// Convert annual rate to compounding monthly rate
export function annualToMonthly(r: number): number {
  return Math.pow(1 + r, 1 / 12) - 1;
}

// Resolve market conditions for a given date.
//
// Resolution rule (documented): for each attribute independently, the most
// recently STARTED active event that defines that attribute wins. Events that
// don't define an attribute don't affect it. This allows a "Recession" (sets
// vacancy + appreciation) and a "High Rates" event (sets mortgageRate only)
// to coexist and compose freely.
export function resolveMarketConditions(
  date: SimDate,
  base: BaseMarketConditions,
  events: MarketEvent[]
): ResolvedMarketConditions {
  const idx = simDateToIndex(date);

  // Active events: started <= date <= ended, sorted by start date ascending
  // so last in the filtered list = most recently started
  const active = events
    .filter(
      (e) =>
        simDateToIndex(e.startDate) <= idx &&
        simDateToIndex(e.endDate) >= idx
    )
    .sort(
      (a, b) =>
        simDateToIndex(a.startDate) - simDateToIndex(b.startDate)
    );

  // Walk active events; later-starting events overwrite earlier ones per attribute
  let appreciation = base.annualAppreciation;
  let rentGrowth = base.annualRentGrowth;
  let vacancyRate = base.vacancyRate;
  let mortgageRate = base.mortgageRate;
  let opExAdjustment = 0;

  for (const e of active) {
    if (e.annualAppreciation !== undefined) appreciation = e.annualAppreciation;
    if (e.annualRentGrowth !== undefined) rentGrowth = e.annualRentGrowth;
    if (e.vacancyRate !== undefined) vacancyRate = e.vacancyRate;
    if (e.mortgageRate !== undefined) mortgageRate = e.mortgageRate;
    if (e.operatingExpenseAdjustment !== undefined)
      opExAdjustment += e.operatingExpenseAdjustment;
  }

  return {
    appreciationRate: annualToMonthly(appreciation),
    rentGrowthRate: annualToMonthly(rentGrowth),
    vacancyRate,
    mortgageRate,
    // operatingExpensePct is filled in per-property by the engine using property or global default
    operatingExpensePct: opExAdjustment, // engine adds this delta to the property's base
  };
}
