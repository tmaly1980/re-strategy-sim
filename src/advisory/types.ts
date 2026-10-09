import type { SimDate } from "@/simulation/types";
import type { SimulationPlan, PropertyOpportunity } from "@/simulation/types";

// ─── Recommendation ───────────────────────────────────────────────────────────

export type RecommendationType = "buy" | "delay" | "sell" | "hold" | "warning";

export interface EstimatedImpact {
  endingNetWorthDifference?: number;
  minimumCashDifference?: number;
  monthlyCashFlowDifference?: number;
  equityDifference?: number;
}

export type PlanChangeKind =
  | "shiftPurchaseDate"
  | "addSellTrigger"
  | "removeSellTrigger"
  | "none";

export interface PlanChange {
  kind: PlanChangeKind;
  propertyId: string;
  // shiftPurchaseDate
  newEarliestPurchaseDate?: SimDate;
  // addSellTrigger
  newSellWhenEquityPct?: number;
  newMinHoldYears?: number;
}

export type RecommendationStatus = "pending" | "accepted" | "rejected";

export interface Recommendation {
  id: string;
  timelineId: string;
  type: RecommendationType;
  propertyId?: string;
  title: string;
  summary: string;
  explanation: string;
  suggestedDate?: SimDate;
  estimatedImpact?: EstimatedImpact;
  proposedChange?: PlanChange;
  status: RecommendationStatus;
}

// ─── Plan Variant ─────────────────────────────────────────────────────────────

export interface PlanVariant {
  id: string;
  name: string;
  plan: SimulationPlan;
  properties: PropertyOpportunity[];
  sourcePlanId?: string;
  sourceTimelineId?: string;
  appliedRecommendationIds: string[];
  isOriginal: boolean;
}
