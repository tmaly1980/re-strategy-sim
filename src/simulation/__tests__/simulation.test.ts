import { describe, it, expect } from "vitest";
import { createMortgage, applyMonthlyPayment } from "../mortgage";
import { resolveMarketConditions } from "../market";
import { runSimulation, evaluateAcquisition } from "../engine";
import type {
  SimulationPlan,
  MarketTimeline,
  BaseMarketConditions,
  PropertyOpportunity,
  MarketEvent,
  OneTimeEvent,
  SimDate,
  ResolvedMarketConditions,
} from "../types";
import { simDateToIndex } from "../types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const START: SimDate = { year: 2027, month: 1 };

const BASE: BaseMarketConditions = {
  annualAppreciation: 0.04,
  annualRentGrowth: 0.03,
  vacancyRate: 0.05,
  mortgageRate: 0.07,
};

const PLAN: SimulationPlan = {
  startDate: START,
  horizonYears: 20,
  startingCash: 150_000,
  defaultSellingCostPct: 0.06,
  defaultOperatingExpensePct: 0.35,
  baseMarket: BASE,
};

const EMPTY_TIMELINE: MarketTimeline = {
  id: "base",
  name: "Base",
  marketEvents: [],
  oneTimeEvents: [],
};

function makeProperty(overrides: Partial<PropertyOpportunity> = {}): PropertyOpportunity {
  return {
    id: "prop-a",
    name: "Property A",
    earliestPurchaseDate: START,
    purchasePrice: 300_000,
    monthlyRent: 2_000,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.07,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 15_000,
    minHoldYears: 10,
    ...overrides,
  };
}

const RESOLVED_BASE: ResolvedMarketConditions = {
  appreciationRate: 0,
  rentGrowthRate: 0,
  vacancyRate: 0.05,
  mortgageRate: 0.07,
  operatingExpensePct: 0,
};

function run(props: PropertyOpportunity[], timeline: MarketTimeline = EMPTY_TIMELINE) {
  return runSimulation({ plan: PLAN, properties: props, timeline });
}

// ─── Mortgage ─────────────────────────────────────────────────────────────────

describe("mortgage", () => {
  it("computes correct monthly payment for 30-year fixed at 7%", () => {
    const m = createMortgage(300_000, 0.07);
    expect(m.monthlyPayment).toBeCloseTo(1995.91, 0);
  });

  it("reduces balance after each payment", () => {
    const m = createMortgage(300_000, 0.07);
    const after = applyMonthlyPayment(m);
    expect(after.balance).toBeLessThan(m.balance);
    expect(after.balance).toBeGreaterThan(0);
  });

  it("balance reaches ~zero after full amortization and never goes negative", () => {
    let m = createMortgage(100_000, 0.06);
    for (let i = 0; i < 360; i++) m = applyMonthlyPayment(m);
    expect(m.balance).toBeGreaterThanOrEqual(0);
    expect(m.balance).toBeCloseTo(0, 0);
  });

  it("zero-rate mortgage amortizes as equal principal payments", () => {
    const m = createMortgage(120_000, 0, 10);
    expect(m.monthlyPayment).toBeCloseTo(1_000, 0);
  });
});

// ─── Market event resolution ──────────────────────────────────────────────────

describe("market event resolution", () => {
  it("returns base conditions when no events are active", () => {
    const r = resolveMarketConditions({ year: 2027, month: 6 }, BASE, []);
    expect(r.vacancyRate).toBe(BASE.vacancyRate);
    expect(r.mortgageRate).toBe(BASE.mortgageRate);
  });

  it("applies event that starts on exact date", () => {
    const event: MarketEvent = {
      id: "e1", name: "Boom",
      startDate: { year: 2029, month: 1 },
      endDate: { year: 2031, month: 12 },
      vacancyRate: 0.02,
    };
    const r = resolveMarketConditions({ year: 2029, month: 1 }, BASE, [event]);
    expect(r.vacancyRate).toBe(0.02);
  });

  it("does not apply event before its start date", () => {
    const event: MarketEvent = {
      id: "e1", name: "Boom",
      startDate: { year: 2029, month: 1 },
      endDate: { year: 2031, month: 12 },
      vacancyRate: 0.02,
    };
    const r = resolveMarketConditions({ year: 2028, month: 12 }, BASE, [event]);
    expect(r.vacancyRate).toBe(BASE.vacancyRate);
  });

  it("does not apply event after its end date", () => {
    const event: MarketEvent = {
      id: "e1", name: "Boom",
      startDate: { year: 2029, month: 1 },
      endDate: { year: 2031, month: 12 },
      vacancyRate: 0.02,
    };
    const r = resolveMarketConditions({ year: 2032, month: 1 }, BASE, [event]);
    expect(r.vacancyRate).toBe(BASE.vacancyRate);
  });

  it("later-starting event wins for same attribute when both active", () => {
    const e1: MarketEvent = {
      id: "e1", name: "General",
      startDate: { year: 2029, month: 1 },
      endDate: { year: 2035, month: 12 },
      vacancyRate: 0.12,
    };
    const e2: MarketEvent = {
      id: "e2", name: "Crisis",
      startDate: { year: 2030, month: 1 },
      endDate: { year: 2031, month: 12 },
      vacancyRate: 0.20,
    };
    const during = resolveMarketConditions({ year: 2030, month: 6 }, BASE, [e1, e2]);
    expect(during.vacancyRate).toBe(0.20); // e2 started later
    const after = resolveMarketConditions({ year: 2032, month: 1 }, BASE, [e1, e2]);
    expect(after.vacancyRate).toBe(0.12); // e1 resumes
  });

  it("overlapping events with different attributes compose freely", () => {
    const e1: MarketEvent = {
      id: "e1", name: "Recession",
      startDate: { year: 2029, month: 1 },
      endDate: { year: 2032, month: 12 },
      vacancyRate: 0.12,
      annualAppreciation: -0.02,
    };
    const e2: MarketEvent = {
      id: "e2", name: "High Rates",
      startDate: { year: 2030, month: 1 },
      endDate: { year: 2033, month: 12 },
      mortgageRate: 0.10,
    };
    const r = resolveMarketConditions({ year: 2030, month: 6 }, BASE, [e1, e2]);
    expect(r.vacancyRate).toBe(0.12);
    expect(r.mortgageRate).toBe(0.10);
  });
});

// ─── Acquisition evaluation ───────────────────────────────────────────────────

describe("acquisition evaluation", () => {
  it("rejects purchase before availability date", () => {
    const opp = makeProperty({ earliestPurchaseDate: { year: 2029, month: 1 } });
    const d = evaluateAcquisition(opp, 200_000, { year: 2028, month: 12 }, RESOLVED_BASE, PLAN);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("before-availability");
  });

  it("rejects when insufficient funds for down payment", () => {
    const opp = makeProperty();
    const d = evaluateAcquisition(opp, 50_000, START, RESOLVED_BASE, PLAN);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("insufficient-funds");
  });

  it("rejects when reserve requirement would be violated", () => {
    const opp = makeProperty(); // 300k @ 20% = 60k + 9k closing; reserve 15k → need 84k
    const d = evaluateAcquisition(opp, 80_000, START, RESOLVED_BASE, PLAN);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("insufficient-reserves");
  });

  it("allows purchase when all criteria met", () => {
    const opp = makeProperty();
    const d = evaluateAcquisition(opp, 120_000, START, RESOLVED_BASE, PLAN);
    expect(d.allowed).toBe(true);
    expect(d.reason).toBe("eligible");
  });

  it("rejects after latest purchase date", () => {
    const opp = makeProperty({ latestPurchaseDate: { year: 2027, month: 3 } });
    const d = evaluateAcquisition(opp, 200_000, { year: 2027, month: 4 }, RESOLVED_BASE, PLAN);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("after-expiry");
  });
});

// ─── Simulation integration ───────────────────────────────────────────────────

describe("simulation", () => {
  it("purchases a property when cash becomes sufficient", () => {
    const result = run([makeProperty()]);
    const purchase = result.events.find((e) => e.type === "purchase");
    expect(purchase).toBeDefined();
    expect(["purchased", "sold"]).toContain(result.propertyOutcomes[0].status);
  });

  it("does not purchase a property when cash is always insufficient", () => {
    const result = runSimulation({
      plan: { ...PLAN, startingCash: 1_000 },
      properties: [makeProperty()],
      timeline: EMPTY_TIMELINE,
    });
    expect(result.propertyOutcomes[0].status).toBe("not-purchased");
  });

  it("does not purchase same property twice", () => {
    const result = run([makeProperty()]);
    const purchases = result.events.filter((e) => e.type === "purchase");
    expect(purchases.length).toBe(1);
  });

  it("cannot sell before minimum hold period", () => {
    const result = run([makeProperty({ minHoldYears: 10, sellWhenEquityPct: 0.3 })]);
    const sale = result.events.find((e) => e.type === "sale");
    if (sale) {
      const saleIdx = simDateToIndex(sale.date);
      const purchaseIdx = simDateToIndex(START);
      expect(saleIdx - purchaseIdx).toBeGreaterThanOrEqual(10 * 12);
    }
  });

  it("net worth invariant: cash + propertyValue - debt in every snapshot", () => {
    const result = run([makeProperty()]);
    for (const s of result.snapshots) {
      expect(s.netWorth).toBeCloseTo(
        s.cash + s.totalPropertyValue - s.totalMortgageDebt, 1
      );
    }
  });

  it("property value shock applies exactly once", () => {
    const timeline: MarketTimeline = {
      id: "t1", name: "Crash",
      marketEvents: [],
      oneTimeEvents: [{
        id: "shock-1",
        name: "Crash",
        date: { year: 2030, month: 1 },
        type: "propertyValueShock",
        magnitude: -0.20,
      }],
    };
    const result = run([makeProperty()], timeline);
    const shocks = result.events.filter((e) => e.type === "one-time-shock");
    expect(shocks.length).toBe(1);
  });

  it("sale deducts selling costs and pays off mortgage", () => {
    const result = run([makeProperty({ minHoldYears: 10 })]);
    const saleEvent = result.events.find((e) => e.type === "sale");
    if (!saleEvent) return;
    const m = saleEvent.metadata!;
    const expected =
      (m.salePrice as number) - (m.sellingCosts as number) - (m.mortgagePayoff as number);
    expect(m.netProceeds as number).toBeCloseTo(expected, 0);
  });
});

// ─── Multi-timeline comparison ────────────────────────────────────────────────

describe("multi-timeline", () => {
  const prop = makeProperty();

  it("same plan / different timelines produce different results", () => {
    const stableTimeline: MarketTimeline = {
      id: "stable", name: "Stable",
      marketEvents: [{ id: "m1", name: "High growth", startDate: { year: 2027, month: 1 }, endDate: { year: 2047, month: 1 }, annualAppreciation: 0.08 }],
      oneTimeEvents: [],
    };
    const badTimeline: MarketTimeline = {
      id: "bad", name: "Bad",
      marketEvents: [{ id: "m2", name: "Stagnation", startDate: { year: 2027, month: 1 }, endDate: { year: 2047, month: 1 }, annualAppreciation: -0.01 }],
      oneTimeEvents: [],
    };
    const r1 = runSimulation({ plan: PLAN, properties: [prop], timeline: stableTimeline });
    const r2 = runSimulation({ plan: PLAN, properties: [prop], timeline: badTimeline });
    expect(r1.endingNetWorth).toBeGreaterThan(r2.endingNetWorth);
  });

  it("identical timelines produce identical results", () => {
    const t: MarketTimeline = {
      id: "t1", name: "Test",
      marketEvents: [{ id: "m1", name: "Boom", startDate: { year: 2030, month: 1 }, endDate: { year: 2032, month: 12 }, annualAppreciation: 0.07 }],
      oneTimeEvents: [],
    };
    const r1 = runSimulation({ plan: PLAN, properties: [prop], timeline: t });
    const r2 = runSimulation({ plan: PLAN, properties: [prop], timeline: { ...t } });
    expect(r1.endingNetWorth).toBe(r2.endingNetWorth);
  });

  it("market rate event changes mortgage rate on new purchases during that period", () => {
    const highRateTimeline: MarketTimeline = {
      id: "hr", name: "High Rates",
      marketEvents: [{
        id: "r1", name: "Rates",
        startDate: { year: 2027, month: 1 },
        endDate: { year: 2047, month: 1 },
        mortgageRate: 0.12,
      }],
      oneTimeEvents: [],
    };
    // Property uses market rate (null)
    const propMarketRate = makeProperty({ fixedMortgageRate: null });
    const r = runSimulation({ plan: PLAN, properties: [propMarketRate], timeline: highRateTimeline });
    const purchaseEvent = r.events.find((e) => e.type === "purchase");
    expect(purchaseEvent?.metadata?.rate).toBe(0.12);
  });

  it("changing market rate does not modify existing fixed-rate mortgage", () => {
    // Property starts with fixed 7%; market rate later goes to 12%
    const propFixed = makeProperty({ fixedMortgageRate: 0.07 });
    const lateRates: MarketTimeline = {
      id: "lr", name: "Late Rates",
      marketEvents: [{
        id: "r2", name: "Later High Rates",
        startDate: { year: 2030, month: 1 },
        endDate: { year: 2047, month: 1 },
        mortgageRate: 0.12,
      }],
      oneTimeEvents: [],
    };
    const r = runSimulation({ plan: PLAN, properties: [propFixed], timeline: lateRates });
    // The purchase event's rate should be 0.07, not 0.12
    const purchaseEvent = r.events.find((e) => e.type === "purchase");
    expect(purchaseEvent?.metadata?.rate).toBe(0.07);
  });

  it("determinism: same plan+timeline inputs produce identical results", () => {
    const r1 = run([makeProperty()]);
    const r2 = run([makeProperty()]);
    expect(r1.endingNetWorth).toBe(r2.endingNetWorth);
    expect(r1.snapshots.length).toBe(r2.snapshots.length);
  });
});
