import type { SimDate } from "../types/dates";
import type { SimulationPlan, SimulationEvent } from "../types/simulation";
import type { PropertyOutcome } from "../types/property";
import type { OwnedProperty } from "../engine/ownedProperty";
import { simDateToIndex } from "../types/dates";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export interface SaleResult {
  netProceeds: number;
  event: SimulationEvent;
  outcomeUpdate: Partial<PropertyOutcome>;
}

export function evaluateSale(
  p: OwnedProperty,
  date: SimDate,
  config: SimulationPlan
): SaleResult | null {
  if (p.sold) return null;

  const dateIdx = simDateToIndex(date);
  const heldMonths = dateIdx - simDateToIndex(p.purchaseDate);
  const heldYears = heldMonths / 12;
  if (heldYears < p.minHoldYears) return null;

  const equity = p.currentValue - p.mortgage.balance;
  const equityPct = p.currentValue > 0 ? equity / p.currentValue : 0;
  const shouldSell =
    p.sellWhenEquityPct !== undefined ? equityPct >= p.sellWhenEquityPct : false;

  if (!shouldSell) return null;

  const sellingCosts = p.currentValue * config.defaultSellingCostPct;
  const netProceeds = p.currentValue - sellingCosts - p.mortgage.balance;

  return {
    netProceeds,
    event: {
      date,
      type: "sale",
      message: `Sold ${p.name} for $${fmt(p.currentValue)}. Selling costs $${fmt(sellingCosts)}, payoff $${fmt(p.mortgage.balance)}, net proceeds $${fmt(netProceeds)}.`,
      metadata: {
        opportunityId: p.opportunityId,
        salePrice: p.currentValue,
        sellingCosts,
        mortgagePayoff: p.mortgage.balance,
        netProceeds,
      },
    },
    outcomeUpdate: {
      status: "sold",
      soldDate: date,
      endingValue: p.currentValue,
      mortgageBalance: 0,
      equity: netProceeds + sellingCosts, // gross equity at sale
    },
  };
}
