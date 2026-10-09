import type { SimDate } from "./dates";

export interface PropertyOpportunity {
  id: string;
  name: string;
  earliestPurchaseDate: SimDate;
  latestPurchaseDate?: SimDate;
  purchasePrice: number;
  monthlyRent: number;
  downPaymentPct: number;
  // null = use current market rate at time of purchase
  fixedMortgageRate: number | null;
  mortgageTermYears: number;
  closingCostPct: number;
  operatingExpensePct?: number; // overrides global default if set
  vacancyRateOverride?: number;
  minReserveCash: number;
  minHoldYears: number; // 0 = never auto-sell
  sellWhenEquityPct?: number; // sell when equity/value >= this fraction
}

export interface Mortgage {
  originalPrincipal: number;
  balance: number;
  annualRate: number;
  monthlyPayment: number;
  termMonths: number;
  monthsRemaining: number;
}

export type PropertyStatus = "purchased" | "sold" | "not-purchased" | "pending";

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
  delayMonths?: number;
  firstRejectionReason?: AcquisitionReason;
}
