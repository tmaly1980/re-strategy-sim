import type {
  SimulationPlan,
  SimulationResult,
  SimulationEvent,
  MonthlySnapshot,
} from "../types/simulation";
import type { PropertyOutcome, AcquisitionReason } from "../types/property";
import type { MarketTimeline } from "../types/market";
import type { PropertyOpportunity } from "../types/property";
import { simDateToIndex, addMonths, simDatesEqual } from "../types/dates";
import { createMortgage, applyMonthlyPayment, currentPayment } from "../mortgage";
import { resolveMarketConditions } from "../market";
import { evaluateAcquisition, skipMessage } from "../acquisition/evaluateAcquisition";
import { evaluateSale } from "../sales/sellProperty";
import type { OwnedProperty } from "./ownedProperty";

export interface SimulationInput {
  plan: SimulationPlan;
  properties: PropertyOpportunity[];
  timeline: MarketTimeline;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const { plan, properties: propertyOpportunities, timeline } = input;
  const { marketEvents, oneTimeEvents } = timeline;
  const config = plan;
  const baseMarket = plan.baseMarket;

  const endDate = addMonths(config.startDate, config.horizonYears * 12 - 1);
  const startIdx = simDateToIndex(config.startDate);
  const endIdx = simDateToIndex(endDate);
  const totalMonths = endIdx - startIdx + 1;

  let cash = config.startingCash;
  let minCash = cash;
  const owned: OwnedProperty[] = [];
  const purchasedIds = new Set<string>();
  const soldIds = new Set<string>();

  const snapshots: MonthlySnapshot[] = [];
  const events: SimulationEvent[] = [];

  const appliedOneTime = new Set<string>();
  const lastSkipReason = new Map<string, AcquisitionReason>();

  const outcomeMap = new Map<string, PropertyOutcome>(
    propertyOpportunities.map((p) => [
      p.id,
      { opportunityId: p.id, name: p.name, status: "not-purchased" },
    ])
  );

  const announcedEventStart = new Set<string>();
  const announcedEventEnd = new Set<string>();

  for (let i = 0; i < totalMonths; i++) {
    const date = addMonths(config.startDate, i);
    const dateIdx = simDateToIndex(date);
    const market = resolveMarketConditions(date, baseMarket, marketEvents);

    // Phase 1: Announce market event boundaries
    for (const me of marketEvents) {
      if (simDatesEqual(date, me.startDate) && !announcedEventStart.has(me.id)) {
        announcedEventStart.add(me.id);
        events.push({ date, type: "market-event-start", message: `${me.name} began.`, metadata: { eventId: me.id } });
      }
      if (simDatesEqual(date, me.endDate) && !announcedEventEnd.has(me.id)) {
        announcedEventEnd.add(me.id);
        events.push({ date, type: "market-event-end", message: `${me.name} ended.`, metadata: { eventId: me.id } });
      }
    }

    // Phase 2: Apply one-time events
    for (const oe of oneTimeEvents) {
      if (simDatesEqual(date, oe.date) && !appliedOneTime.has(oe.id)) {
        appliedOneTime.add(oe.id);
        switch (oe.type) {
          case "propertyValueShock": {
            const mult = 1 + oe.magnitude;
            for (const p of owned) p.currentValue *= mult;
            events.push({ date, type: "one-time-shock", message: `${oe.name}: property values changed by ${(oe.magnitude * 100).toFixed(1)}%.`, metadata: { magnitude: oe.magnitude } });
            break;
          }
          case "expenseShock": {
            const total = oe.magnitude * owned.length;
            cash -= total;
            events.push({ date, type: "one-time-shock", message: `${oe.name}: $${fmt(oe.magnitude)} expense per property (${owned.length} owned, total $${fmt(total)}).`, metadata: { perProperty: oe.magnitude, total } });
            break;
          }
          case "rentShock": {
            for (const p of owned) p.monthlyRent *= 1 + oe.magnitude;
            events.push({ date, type: "one-time-shock", message: `${oe.name}: rents changed by ${(oe.magnitude * 100).toFixed(1)}%.`, metadata: { magnitude: oe.magnitude } });
            break;
          }
        }
      }
    }

    // Phase 3: Appreciation + rent growth
    for (const p of owned) {
      p.currentValue *= 1 + market.appreciationRate;
      p.monthlyRent *= 1 + market.rentGrowthRate;
    }

    // Phase 4: Cash flow
    let monthlyCashFlow = 0;
    for (const p of owned) {
      const vacancy = p.vacancyRateOverride ?? market.vacancyRate;
      const opEx = p.operatingExpensePct + market.operatingExpensePct;
      const effectiveRent = p.monthlyRent * (1 - vacancy);
      const cf = effectiveRent - effectiveRent * opEx - currentPayment(p.mortgage);
      cash += cf;
      monthlyCashFlow += cf;
      p.mortgage = applyMonthlyPayment(p.mortgage);
    }

    // Phase 5: Sales
    for (const p of owned) {
      const sale = evaluateSale(p, date, config);
      if (!sale) continue;
      cash += sale.netProceeds;
      p.sold = true;
      soldIds.add(p.opportunityId);
      const outcome = outcomeMap.get(p.opportunityId);
      if (outcome) Object.assign(outcome, sale.outcomeUpdate);
      events.push(sale.event);
    }

    // Phase 6: Acquisitions (at most one per month)
    const candidates = propertyOpportunities
      .filter((p) => !purchasedIds.has(p.id))
      .sort((a, b) => {
        const diff = simDateToIndex(a.earliestPurchaseDate) - simDateToIndex(b.earliestPurchaseDate);
        return diff !== 0 ? diff : propertyOpportunities.indexOf(a) - propertyOpportunities.indexOf(b);
      });

    let purchasedThisMonth = false;
    for (const opp of candidates) {
      if (purchasedThisMonth) break;

      if (simDatesEqual(date, opp.earliestPurchaseDate) && !purchasedIds.has(opp.id)) {
        events.push({ date, type: "property-available", message: `${opp.name} became available for acquisition.`, metadata: { opportunityId: opp.id } });
      }

      const decision = evaluateAcquisition(opp, cash, date, market, config);

      if (decision.allowed) {
        const loanAmount = opp.purchasePrice * (1 - opp.downPaymentPct);
        const rate = opp.fixedMortgageRate !== null ? opp.fixedMortgageRate : market.mortgageRate;
        const mortgage = createMortgage(loanAmount, rate, opp.mortgageTermYears);
        const downPayment = opp.purchasePrice * opp.downPaymentPct;
        const closingCosts = opp.purchasePrice * opp.closingCostPct;
        cash -= downPayment + closingCosts;

        owned.push({
          opportunityId: opp.id,
          name: opp.name,
          purchaseDate: date,
          purchasePrice: opp.purchasePrice,
          currentValue: opp.purchasePrice,
          monthlyRent: opp.monthlyRent,
          mortgage,
          operatingExpensePct: opp.operatingExpensePct ?? config.defaultOperatingExpensePct,
          vacancyRateOverride: opp.vacancyRateOverride,
          minHoldYears: opp.minHoldYears,
          sellWhenEquityPct: opp.sellWhenEquityPct,
          sold: false,
        });
        purchasedIds.add(opp.id);
        purchasedThisMonth = true;
        lastSkipReason.delete(opp.id);

        const delayMonths = dateIdx - simDateToIndex(opp.earliestPurchaseDate);
        const outcome = outcomeMap.get(opp.id)!;
        outcome.status = "purchased";
        outcome.purchasedDate = date;
        outcome.purchasePrice = opp.purchasePrice;
        outcome.delayMonths = delayMonths;

        events.push({
          date,
          type: "purchase",
          message: `Purchased ${opp.name} for $${fmt(opp.purchasePrice)} (${fmtPct(opp.downPaymentPct)} down, ${fmtPct(rate)} rate${delayMonths > 0 ? `, ${delayMonths} months after availability` : ""}).`,
          metadata: { opportunityId: opp.id, price: opp.purchasePrice, downPayment, closingCosts, rate, delayMonths },
        });
      } else {
        const prev = lastSkipReason.get(opp.id);
        if (
          decision.reason !== "before-availability" &&
          decision.reason !== "already-purchased" &&
          decision.reason !== prev
        ) {
          lastSkipReason.set(opp.id, decision.reason);
          const outcome = outcomeMap.get(opp.id);
          if (outcome && !outcome.firstRejectionReason) {
            outcome.firstRejectionReason = decision.reason;
          }
          events.push({
            date,
            type: "purchase-skipped",
            message: skipMessage(opp.name, decision),
            metadata: { opportunityId: opp.id, reason: decision.reason, required: decision.requiredCash, available: cash },
          });
        }
      }
    }

    // Phase 7: Snapshot
    if (cash < minCash) minCash = cash;
    const activeOwned = owned.filter((p) => !p.sold);
    const totalPropertyValue = activeOwned.reduce((s, p) => s + p.currentValue, 0);
    const totalMortgageDebt = activeOwned.reduce((s, p) => s + p.mortgage.balance, 0);
    const equity = totalPropertyValue - totalMortgageDebt;

    snapshots.push({
      date,
      cash,
      totalPropertyValue,
      totalMortgageDebt,
      equity,
      netWorth: cash + equity,
      propertyCount: activeOwned.length,
      monthlyCashFlow,
    });
  }

  // Finalize unsold outcomes
  for (const p of owned) {
    if (p.sold) continue;
    const outcome = outcomeMap.get(p.opportunityId)!;
    if (outcome.status === "purchased") {
      outcome.endingValue = p.currentValue;
      outcome.mortgageBalance = p.mortgage.balance;
      outcome.equity = p.currentValue - p.mortgage.balance;
    }
  }

  const last = snapshots[snapshots.length - 1] ?? {
    cash: config.startingCash,
    netWorth: config.startingCash,
    equity: 0,
    totalMortgageDebt: 0,
    propertyCount: 0,
  };

  return {
    snapshots,
    events,
    propertyOutcomes: Array.from(outcomeMap.values()),
    endingCash: last.cash,
    endingNetWorth: last.netWorth,
    endingEquity: last.equity,
    endingMortgageDebt: last.totalMortgageDebt,
    propertiesOwned: last.propertyCount,
    propertiesSold: soldIds.size,
    minCash,
  };
}
