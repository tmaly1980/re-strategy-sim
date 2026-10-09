import { describe, it, expect } from "vitest";
import { SAVED_ADVISORY_GOALS } from "../goals/savedGoals";
import { buildGlobalEvidence } from "../ai/buildGlobalEvidence";
import { evaluateCandidates } from "../ai/evaluateCandidates";
import { runSimulation } from "@/simulation/engine";
import type {
  SimulationPlan,
  MarketTimeline,
  PropertyOpportunity,
  BaseMarketConditions,
} from "@/simulation/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE: BaseMarketConditions = {
  annualAppreciation: 0.04,
  annualRentGrowth: 0.03,
  vacancyRate: 0.05,
  mortgageRate: 0.07,
};

const PLAN: SimulationPlan = {
  startDate: { year: 2027, month: 1 },
  horizonYears: 10,
  startingCash: 80_000,
  defaultSellingCostPct: 0.06,
  defaultOperatingExpensePct: 0.35,
  baseMarket: BASE,
};

const PROPERTIES: PropertyOpportunity[] = [
  {
    id: "prop-a",
    name: "Property A",
    earliestPurchaseDate: { year: 2027, month: 6 },
    purchasePrice: 300_000,
    monthlyRent: 2_200,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.07,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 15_000,
    minHoldYears: 3,
  },
  {
    id: "prop-b",
    name: "Property B",
    earliestPurchaseDate: { year: 2029, month: 1 },
    purchasePrice: 250_000,
    monthlyRent: 1_900,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.07,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 12_000,
    minHoldYears: 3,
  },
];

const TIMELINE_A: MarketTimeline = {
  id: "tl-a",
  name: "Base Case",
  marketEvents: [],
  oneTimeEvents: [],
};

const TIMELINE_B: MarketTimeline = {
  id: "tl-b",
  name: "Downturn",
  marketEvents: [
    {
      id: "ev-1",
      name: "Recession",
      startDate: { year: 2030, month: 1 },
      endDate: { year: 2032, month: 12 },
      annualAppreciation: -0.02,
      annualRentGrowth: 0,
      vacancyRate: 0.14,
    },
  ],
  oneTimeEvents: [],
};

const TIMELINE_RESULTS = [TIMELINE_A, TIMELINE_B].map((timeline) => ({
  timeline,
  result: runSimulation({ plan: PLAN, properties: PROPERTIES, timeline }),
}));

// ─── Saved goals ──────────────────────────────────────────────────────────────

describe("savedGoals", () => {
  it("exports exactly 7 goals", () => {
    expect(SAVED_ADVISORY_GOALS).toHaveLength(7);
  });

  it("every goal has id, name, description, and prompt", () => {
    for (const g of SAVED_ADVISORY_GOALS) {
      expect(typeof g.id).toBe("string");
      expect(g.id.length).toBeGreaterThan(0);
      expect(typeof g.name).toBe("string");
      expect(typeof g.description).toBe("string");
      expect(typeof g.prompt).toBe("string");
      expect(g.prompt.length).toBeGreaterThan(10);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = SAVED_ADVISORY_GOALS.map((g) => g.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("includes 'protect-25k-cash' goal", () => {
    const goal = SAVED_ADVISORY_GOALS.find((g) => g.id === "protect-25k-cash");
    expect(goal).toBeDefined();
    expect(goal!.prompt).toContain("25,000");
  });

  it("includes 'worst-case-focus' goal", () => {
    const goal = SAVED_ADVISORY_GOALS.find((g) => g.id === "worst-case-focus");
    expect(goal).toBeDefined();
    expect(goal!.prompt.toLowerCase()).toContain("worst");
  });
});

// ─── buildGlobalEvidence ─────────────────────────────────────────────────────

describe("buildGlobalEvidence", () => {
  it("contains all configured timelines", () => {
    const evidence = buildGlobalEvidence(TIMELINE_RESULTS, PROPERTIES, PLAN);
    expect(evidence.timelines).toHaveLength(2);
    expect(evidence.timelines.map((t) => t.timelineId)).toContain("tl-a");
    expect(evidence.timelines.map((t) => t.timelineId)).toContain("tl-b");
  });

  it("contains correct property summaries", () => {
    const evidence = buildGlobalEvidence(TIMELINE_RESULTS, PROPERTIES, PLAN);
    expect(evidence.properties).toHaveLength(2);
    expect(evidence.properties[0].id).toBe("prop-a");
    expect(evidence.properties[0].purchasePrice).toBe(300_000);
  });

  it("includes plan summary", () => {
    const evidence = buildGlobalEvidence(TIMELINE_RESULTS, PROPERTIES, PLAN);
    expect(evidence.planSummary.startingCash).toBe(80_000);
    expect(evidence.planSummary.horizonYears).toBe(10);
    expect(evidence.planSummary.startYear).toBe(2027);
  });

  it("worstMonthlyCashFlow is <= 0 or a valid number", () => {
    const evidence = buildGlobalEvidence(TIMELINE_RESULTS, PROPERTIES, PLAN);
    for (const t of evidence.timelines) {
      expect(typeof t.worstMonthlyCashFlow).toBe("number");
    }
  });

  it("importantWarnings is an array", () => {
    const evidence = buildGlobalEvidence(TIMELINE_RESULTS, PROPERTIES, PLAN);
    for (const t of evidence.timelines) {
      expect(Array.isArray(t.importantWarnings)).toBe(true);
    }
  });
});

// ─── evaluateCandidates ───────────────────────────────────────────────────────

describe("evaluateCandidates", () => {
  it("returns candidates for each property", () => {
    const candidates = evaluateCandidates(PLAN, PROPERTIES, [TIMELINE_A, TIMELINE_B]);
    expect(candidates.length).toBeGreaterThan(0);
    // Each property should have delay candidates
    const propADelays = candidates.filter(
      (c) => c.change.propertyId === "prop-a" && c.change.kind === "shiftPurchaseDate"
    );
    expect(propADelays.length).toBeGreaterThanOrEqual(2); // +6mo and +12mo
  });

  it("every candidate has crossTimelineImpact for all timelines", () => {
    const candidates = evaluateCandidates(PLAN, PROPERTIES, [TIMELINE_A, TIMELINE_B]);
    for (const c of candidates) {
      expect(c.crossTimelineImpact).toHaveLength(2);
      const ids = c.crossTimelineImpact.map((ct) => ct.timelineId);
      expect(ids).toContain("tl-a");
      expect(ids).toContain("tl-b");
    }
  });

  it("crossTimelineImpact diffs are numbers", () => {
    const candidates = evaluateCandidates(PLAN, PROPERTIES, [TIMELINE_A]);
    for (const c of candidates) {
      for (const ct of c.crossTimelineImpact) {
        expect(typeof ct.endingNetWorthDiff).toBe("number");
        expect(typeof ct.minCashDiff).toBe("number");
        expect(typeof ct.endingEquityDiff).toBe("number");
      }
    }
  });

  it("delay candidates have distinct new purchase dates", () => {
    const candidates = evaluateCandidates(PLAN, PROPERTIES, [TIMELINE_A]);
    const propADelays = candidates.filter(
      (c) => c.change.propertyId === "prop-a" && c.change.kind === "shiftPurchaseDate"
    );
    expect(propADelays.length).toBeGreaterThanOrEqual(2);
    // The two delay candidates should have different target dates
    const dates = propADelays.map(
      (c) => `${c.change.newEarliestPurchaseDate?.year}-${c.change.newEarliestPurchaseDate?.month}`
    );
    const unique = new Set(dates);
    expect(unique.size).toBe(propADelays.length);
  });
});

// ─── Original Plan safety ─────────────────────────────────────────────────────

describe("original plan immutability", () => {
  it("evaluateCandidates does not mutate the original properties", () => {
    const originalDate = { ...PROPERTIES[0].earliestPurchaseDate };
    evaluateCandidates(PLAN, PROPERTIES, [TIMELINE_A]);
    expect(PROPERTIES[0].earliestPurchaseDate.year).toBe(originalDate.year);
    expect(PROPERTIES[0].earliestPurchaseDate.month).toBe(originalDate.month);
  });
});
