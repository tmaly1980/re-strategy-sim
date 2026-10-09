import type { MarketEvent } from "@/simulation/types";
import { simDateToIndex } from "@/simulation/types";
import type { ValidationIssue } from "./types";

export function validateMarketEvent(event: MarketEvent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = event.id;

  if (simDateToIndex(event.startDate) > simDateToIndex(event.endDate)) {
    issues.push({
      id: `event-start-after-end-${id}`,
      severity: "error",
      scope: "market-event",
      entityId: id,
      path: "endDate",
      code: "event-start-after-end",
      message: "Market event start date is after the end date.",
    });
  }

  if (event.vacancyRate !== undefined) {
    if (event.vacancyRate < 0 || event.vacancyRate > 1) {
      issues.push({
        id: `vacancy-out-of-range-${id}`,
        severity: "error",
        scope: "market-event",
        entityId: id,
        path: "vacancyRate",
        code: "market-event-vacancy-out-of-range",
        message: `Vacancy rate must be between 0% and 100%. Got ${(event.vacancyRate * 100).toFixed(1)}%.`,
      });
    } else if (event.vacancyRate > 0.50) {
      issues.push({
        id: `vacancy-very-high-${id}`,
        severity: "warning",
        scope: "market-event",
        entityId: id,
        path: "vacancyRate",
        code: "market-event-vacancy-very-high",
        message: `Vacancy rate of ${(event.vacancyRate * 100).toFixed(0)}% is unusually high.`,
      });
    }
  }

  if (event.mortgageRate !== undefined) {
    if (event.mortgageRate < 0) {
      issues.push({
        id: `mortgage-rate-negative-${id}`,
        severity: "error",
        scope: "market-event",
        entityId: id,
        path: "mortgageRate",
        code: "market-event-mortgage-rate-negative",
        message: "Mortgage rate cannot be negative.",
      });
    } else if (event.mortgageRate > 0.15) {
      issues.push({
        id: `mortgage-rate-very-high-${id}`,
        severity: "warning",
        scope: "market-event",
        entityId: id,
        path: "mortgageRate",
        code: "market-event-mortgage-rate-very-high",
        message: `Mortgage rate of ${(event.mortgageRate * 100).toFixed(2)}% is unusually high.`,
      });
    }
  }

  if (event.annualAppreciation !== undefined) {
    if (event.annualAppreciation < -0.50) {
      issues.push({
        id: `appreciation-extreme-low-${id}`,
        severity: "warning",
        scope: "market-event",
        entityId: id,
        path: "annualAppreciation",
        code: "market-event-appreciation-extreme-low",
        message: `Annual appreciation of ${(event.annualAppreciation * 100).toFixed(1)}% is below -50%, which is extreme.`,
      });
    } else if (event.annualAppreciation > 0.30) {
      issues.push({
        id: `appreciation-extreme-high-${id}`,
        severity: "warning",
        scope: "market-event",
        entityId: id,
        path: "annualAppreciation",
        code: "market-event-appreciation-extreme-high",
        message: `Annual appreciation of ${(event.annualAppreciation * 100).toFixed(1)}% is above 30%, which is extreme.`,
      });
    }
  }

  if (event.annualRentGrowth !== undefined && event.annualRentGrowth > 0.30) {
    issues.push({
      id: `rent-growth-extreme-${id}`,
      severity: "warning",
      scope: "market-event",
      entityId: id,
      path: "annualRentGrowth",
      code: "market-event-rent-growth-extreme",
      message: `Annual rent growth of ${(event.annualRentGrowth * 100).toFixed(1)}% is above 30%, which is extreme.`,
    });
  }

  return issues;
}
