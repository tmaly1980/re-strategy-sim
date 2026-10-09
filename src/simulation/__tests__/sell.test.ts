import { describe, it, expect } from "vitest";
import { evaluateSale } from "@/simulation/sales/sellProperty";
import type { OwnedProperty } from "@/simulation/engine/ownedProperty";
import { createMortgage } from "@/simulation/mortgage";
import { runSimulation } from "@/simulation/engine";
import { simDateToIndex } from "@/simulation/types";
import type {
  SimulationPlan,
  MarketTimeline,
  BaseMarketConditions,
  PropertyOpportunity,
  SimDate,
} from "@/simulation/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

function makeOwned(overrides: Partial<OwnedProperty> = {}): OwnedProperty {
  return {
    opportunityId: "prop-a",
    name: "Test Property",
    purchaseDate: { year: 2027, month: 1 },
    purchasePrice: 300_000,
    currentValue: 300_000,
    monthlyRent: 2_000,
    mortgage: createMortgage(240_000, 0.07),
    operatingExpensePct: 0.35,
    minHoldYears: 10,
    sellWhenEquityPct: undefined,
    sold: false,
    ...overrides,
  };
}

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

function run(props: PropertyOpportunity[], timeline: MarketTimeline = EMPTY_TIMELINE) {
  return runSimulation({ plan: PLAN, properties: props, timeline });
}

// Date that is exactly N months after START
function dateAfterMonths(months: number): SimDate {
  const totalMonths = START.year * 12 + (START.month - 1) + months;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1 };
}

// ─── evaluateSale unit tests ──────────────────────────────────────────────────

describe("evaluateSale — no trigger set", () => {
  it("returns null when sellWhenEquityPct is undefined (regression: must never auto-sell)", () => {
    // equity ~20% (60k / 300k), hold period met
    const p = makeOwned({ sellWhenEquityPct: undefined });
    const date = dateAfterMonths(120); // exactly 10 years
    expect(evaluateSale(p, date, PLAN)).toBeNull();
  });

  it("returns null when sellWhenEquityPct is explicitly undefined (belt-and-suspenders)", () => {
    const p: OwnedProperty = { ...makeOwned(), sellWhenEquityPct: undefined };
    const date = dateAfterMonths(180); // 15 years
    expect(evaluateSale(p, date, PLAN)).toBeNull();
  });
});

describe("evaluateSale — hold period not yet met", () => {
  it("returns null when held for minHoldYears * 12 - 1 months even with equity above threshold", () => {
    // Give high equity so only the hold period blocks the sale
    const p = makeOwned({
      sellWhenEquityPct: 0.3,
      currentValue: 500_000,
      mortgage: createMortgage(50_000, 0.07), // equity ~90%
    });
    const date = dateAfterMonths(10 * 12 - 1); // one month short
    expect(evaluateSale(p, date, PLAN)).toBeNull();
  });
});

describe("evaluateSale — hold period just met, trigger set", () => {
  it("returns a SaleResult with correct fields when hold met and equity above threshold", () => {
    // equity = 300k - 240k = 60k → 20% — set threshold to 0.1 so it fires
    const p = makeOwned({ sellWhenEquityPct: 0.1 });
    const date = dateAfterMonths(120); // exactly 10 years
    const result = evaluateSale(p, date, PLAN);
    expect(result).not.toBeNull();
    expect(result!.outcomeUpdate.status).toBe("sold");
    expect(result!.outcomeUpdate.soldDate).toEqual(date);
    const sellingCosts = p.currentValue * PLAN.defaultSellingCostPct;
    const expected = p.currentValue - sellingCosts - p.mortgage.balance;
    expect(result!.netProceeds).toBeCloseTo(expected, 0);
  });
});

describe("evaluateSale — equity threshold not yet met", () => {
  it("returns null when equity pct is below sellWhenEquityPct", () => {
    // equity ~20%, threshold 80% — hold period met
    const p = makeOwned({ sellWhenEquityPct: 0.8 });
    const date = dateAfterMonths(120);
    expect(evaluateSale(p, date, PLAN)).toBeNull();
  });
});

describe("evaluateSale — already sold", () => {
  it("returns null immediately when sold is true", () => {
    const p = makeOwned({ sold: true, sellWhenEquityPct: 0.1 });
    const date = dateAfterMonths(120);
    expect(evaluateSale(p, date, PLAN)).toBeNull();
  });
});

describe("evaluateSale — minHoldYears = 0 edge case", () => {
  it("sells immediately when minHoldYears is 0 and equity exceeds threshold", () => {
    const p = makeOwned({ minHoldYears: 0, sellWhenEquityPct: 0.1 });
    const date = dateAfterMonths(1);
    const result = evaluateSale(p, date, PLAN);
    expect(result).not.toBeNull();
    expect(result!.outcomeUpdate.status).toBe("sold");
  });

  it("does not sell on purchase month (0 months held, minHoldYears 0 means >= 0 holds)", () => {
    const p = makeOwned({ minHoldYears: 0, sellWhenEquityPct: 0.1, purchaseDate: { year: 2027, month: 1 } });
    // Same date as purchase = 0 months held, 0 >= 0 so should evaluate trigger
    const result = evaluateSale(p, { year: 2027, month: 1 }, PLAN);
    expect(result).not.toBeNull(); // 0 months held satisfies minHoldYears: 0
  });
});

// ─── Equity threshold controls sale date ─────────────────────────────────────

describe("equity threshold controls sale date", () => {
  it("higher equity threshold delays sale relative to lower threshold", () => {
    // Both properties have same hold period; higher threshold = later sale
    const earlyResult = run([makeProperty({ sellWhenEquityPct: 0.3, minHoldYears: 5 })]);
    const lateResult  = run([makeProperty({ sellWhenEquityPct: 0.7, minHoldYears: 5 })]);

    const earlySale = earlyResult.events.find((e) => e.type === "sale");
    const lateSale  = lateResult.events.find((e) => e.type === "sale");

    expect(earlySale).toBeDefined();
    expect(lateSale).toBeDefined();
    expect(simDateToIndex(earlySale!.date)).toBeLessThanOrEqual(simDateToIndex(lateSale!.date));
  });

  it("threshold below starting equity fires at first eligible month (hold period boundary)", () => {
    // 20% down = 20% equity from day one; threshold 5% is already exceeded at purchase
    // So sale should fire at exactly minHoldYears
    const result = run([makeProperty({ sellWhenEquityPct: 0.05, minHoldYears: 5 })]);
    const purchase = result.events.find((e) => e.type === "purchase");
    const sale     = result.events.find((e) => e.type === "sale");
    expect(sale).toBeDefined();
    if (purchase && sale) {
      const heldMonths = simDateToIndex(sale.date) - simDateToIndex(purchase.date);
      // Should sell as soon as hold period is met (within a month or two of the boundary)
      expect(heldMonths).toBeGreaterThanOrEqual(5 * 12);
      expect(heldMonths).toBeLessThan(5 * 12 + 3);
    }
  });

  it("threshold above starting equity fires only after appreciation builds enough equity", () => {
    // 20% down = 20% equity; threshold 60% requires appreciation + amortization
    const result = run([makeProperty({ sellWhenEquityPct: 0.60, minHoldYears: 5 })]);
    const purchase = result.events.find((e) => e.type === "purchase");
    const sale     = result.events.find((e) => e.type === "sale");
    expect(sale).toBeDefined();
    if (purchase && sale) {
      const heldMonths = simDateToIndex(sale.date) - simDateToIndex(purchase.date);
      // Must have held longer than hold period to accumulate enough equity
      expect(heldMonths).toBeGreaterThan(5 * 12);
    }
  });

  it("threshold set so high it is never reached: property stays held for full horizon", () => {
    // Even with 4% appreciation for 20 years, equity/value ratio won't reach 98%
    const result = run([makeProperty({ sellWhenEquityPct: 0.98, minHoldYears: 5 })]);
    expect(result.propertyOutcomes[0].status).toBe("purchased");
    expect(result.events.filter((e) => e.type === "sale")).toHaveLength(0);
  });

  it("no sell trigger: property never sells regardless of how much equity accumulates", () => {
    // Regression for the original bug: no sellWhenEquityPct = never sells
    const result = run([makeProperty()]); // no sellWhenEquityPct
    expect(result.propertyOutcomes[0].status).toBe("purchased");
    expect(result.events.filter((e) => e.type === "sale")).toHaveLength(0);
  });
});

// ─── Sell integration tests ───────────────────────────────────────────────────

describe("sell integration", () => {
  it("no auto-sell without trigger: status remains 'purchased' after 20-year horizon", () => {
    const result = run([makeProperty()]); // no sellWhenEquityPct
    const saleEvents = result.events.filter((e) => e.type === "sale");
    expect(saleEvents).toHaveLength(0);
    expect(result.propertyOutcomes[0].status).toBe("purchased");
  });

  it("auto-sell fires after hold period when trigger is set", () => {
    const result = run([makeProperty({ sellWhenEquityPct: 0.5, minHoldYears: 5 })]);
    const saleEvents = result.events.filter((e) => e.type === "sale");
    expect(saleEvents.length).toBeGreaterThan(0);
    expect(result.propertyOutcomes[0].status).toBe("sold");
    const purchaseEvent = result.events.find((e) => e.type === "purchase");
    if (purchaseEvent && saleEvents[0]) {
      const diff = simDateToIndex(saleEvents[0].date) - simDateToIndex(purchaseEvent.date);
      expect(diff).toBeGreaterThanOrEqual(5 * 12);
    }
  });

  it("sale proceeds return to cash: ending net worth is positive", () => {
    const result = run([makeProperty({ sellWhenEquityPct: 0.5, minHoldYears: 5 })]);
    expect(result.endingNetWorth).toBeGreaterThan(0);
  });

  it("multiple properties: only the one with a trigger sells", () => {
    const propA = makeProperty({ id: "prop-a", name: "A", sellWhenEquityPct: 0.5, minHoldYears: 5 });
    const propB = makeProperty({ id: "prop-b", name: "B" }); // no trigger
    const result = runSimulation({
      plan: { ...PLAN, startingCash: 300_000 },
      properties: [propA, propB],
      timeline: EMPTY_TIMELINE,
    });
    const saleEvents = result.events.filter((e) => e.type === "sale");
    expect(saleEvents).toHaveLength(1);
    expect(saleEvents[0].metadata?.opportunityId).toBe("prop-a");
  });

  it("hold through market downturn: no trigger = property still held", () => {
    const downTurn: MarketTimeline = {
      id: "dt",
      name: "Downturn",
      marketEvents: [{
        id: "m1",
        name: "Recession",
        startDate: { year: 2028, month: 1 },
        endDate: { year: 2040, month: 12 },
        annualAppreciation: -0.05,
      }],
      oneTimeEvents: [],
    };
    const result = run([makeProperty()], downTurn); // no sellWhenEquityPct
    expect(result.propertyOutcomes[0].status).toBe("purchased");
    expect(result.events.filter((e) => e.type === "sale")).toHaveLength(0);
  });

  it("net worth invariant holds through a sale", () => {
    const result = run([makeProperty({ sellWhenEquityPct: 0.5, minHoldYears: 5 })]);
    for (const s of result.snapshots) {
      expect(s.netWorth).toBeCloseTo(
        s.cash + s.totalPropertyValue - s.totalMortgageDebt, 1
      );
    }
  });
});

// ─── Acquisition integration tests ───────────────────────────────────────────

describe("acquisition integration", () => {
  it("property purchased at earliest available date when sufficient cash", () => {
    const result = run([makeProperty({ earliestPurchaseDate: START })]);
    const purchase = result.events.find((e) => e.type === "purchase");
    expect(purchase).toBeDefined();
    expect(result.propertyOutcomes[0].purchasedDate).toEqual(START);
  });

  it("property not purchased after latestPurchaseDate passes with insufficient cash", () => {
    const result = runSimulation({
      plan: { ...PLAN, startingCash: 1_000 }, // never enough
      properties: [makeProperty({
        earliestPurchaseDate: { year: 2027, month: 1 },
        latestPurchaseDate: { year: 2027, month: 3 },
      })],
      timeline: EMPTY_TIMELINE,
    });
    expect(result.propertyOutcomes[0].status).toBe("not-purchased");
  });

  it("reserve requirement blocks purchase when cash would fall below reserve", () => {
    // 300k @ 20% = 60k down + 9k closing = 69k needed + 15k reserve = 84k minimum
    // Start with exactly 75k — covers down+closing but not the reserve
    const result = runSimulation({
      plan: { ...PLAN, startingCash: 75_000 },
      properties: [makeProperty()],
      timeline: EMPTY_TIMELINE,
    });
    // No rental income before purchase, so cash never grows — property never purchased
    expect(result.propertyOutcomes[0].status).toBe("not-purchased");
  });
});
