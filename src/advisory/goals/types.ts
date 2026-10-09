import type { PlanChange } from "@/advisory/types";

export interface SavedAdvisoryGoal {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

// Structured interpretation of the user's natural-language goal
export interface StrategyGoal {
  summary: string;
  primaryObjective:
    | "maximize-net-worth"
    | "preserve-cash"
    | "minimize-debt"
    | "downturn-resilience"
    | "acquire-properties"
    | "balanced"
    | "custom";
  constraints: {
    minimumCashReserve?: number;
    maximumDebt?: number;
    avoidNegativeCash?: boolean;
    acquireAllProperties?: boolean;
    focusWorstTimeline?: boolean;
  };
  priorities: {
    endingNetWorth: number;     // 0–1 weight
    minimumCashReserve: number;
    debtReduction: number;
    propertyAcquisition: number;
    crossTimelineResilience: number;
  };
  userPreferences: string[];
}

// Cross-timeline impact of a candidate change
export interface CrossTimelineImpact {
  timelineId: string;
  timelineName: string;
  endingNetWorthDiff: number;
  minCashDiff: number;
  endingEquityDiff: number;
}

// A candidate plan change with measured cross-timeline impact
export interface CandidateEvaluation {
  change: PlanChange;
  label: string; // human-readable description of the change
  crossTimelineImpact: CrossTimelineImpact[];
}

// Final AI recommendation for display
export interface AiRecommendation {
  id: string;
  title: string;
  rationale: string;
  proposedChange: PlanChange;
  crossTimelineImpact: CrossTimelineImpact[];
}

// Evidence object sent to the API route
export interface TimelineEvidence {
  timelineId: string;
  timelineName: string;
  endingNetWorth: number;
  endingCash: number;
  endingEquity: number;
  endingMortgageDebt: number;
  minCash: number;
  propertiesOwned: number;
  propertiesSold: number;
  worstMonthlyCashFlow: number;
  importantWarnings: string[];
}

export interface PropertySummary {
  id: string;
  name: string;
  purchasePrice: number;
  monthlyRent: number;
  earliestPurchaseYear: number;
  earliestPurchaseMonth: number;
  minReserveCash: number;
  minHoldYears: number;
  sellWhenEquityPct?: number;
}

export interface GlobalEvidence {
  properties: PropertySummary[];
  timelines: TimelineEvidence[];
  planSummary: {
    startingCash: number;
    horizonYears: number;
    startYear: number;
  };
}
