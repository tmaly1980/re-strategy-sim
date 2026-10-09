// Internal mutable state for a property during simulation.
// Not exported outside the engine — callers see PropertyOutcome in results.

import type { SimDate } from "../types/dates";
import type { Mortgage } from "../types/property";

export interface OwnedProperty {
  opportunityId: string;
  name: string;
  purchaseDate: SimDate;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
  mortgage: Mortgage;
  operatingExpensePct: number;
  vacancyRateOverride?: number;
  minHoldYears: number;
  sellWhenEquityPct?: number;
  sold: boolean;
}
