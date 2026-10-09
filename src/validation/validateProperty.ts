import type { PropertyOpportunity } from "@/simulation/types";
import { simDateToIndex } from "@/simulation/types";
import type { ValidationIssue } from "./types";

export function validateProperty(prop: PropertyOpportunity): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = prop.id;

  if (prop.purchasePrice <= 0) {
    issues.push({
      id: `purchase-price-non-positive-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "purchasePrice",
      code: "purchase-price-non-positive",
      message: "Purchase price must be greater than 0.",
    });
  }

  if (prop.monthlyRent < 0) {
    issues.push({
      id: `monthly-rent-negative-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "monthlyRent",
      code: "monthly-rent-negative",
      message: "Monthly rent cannot be negative.",
    });
  } else if (prop.monthlyRent === 0) {
    issues.push({
      id: `monthly-rent-zero-${id}`,
      severity: "warning",
      scope: "property",
      entityId: id,
      path: "monthlyRent",
      code: "monthly-rent-zero",
      message: "Rent is zero — this property will generate no income.",
    });
  }

  if (prop.downPaymentPct < 0 || prop.downPaymentPct >= 1.0) {
    issues.push({
      id: `down-payment-out-of-range-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "downPaymentPct",
      code: "down-payment-out-of-range",
      message: `Down payment must be between 0% and 100% (exclusive). Got ${(prop.downPaymentPct * 100).toFixed(1)}%.`,
    });
  } else if (prop.downPaymentPct < 0.03) {
    issues.push({
      id: `down-payment-very-low-${id}`,
      severity: "warning",
      scope: "property",
      entityId: id,
      path: "downPaymentPct",
      code: "down-payment-very-low",
      message: `Down payment of ${(prop.downPaymentPct * 100).toFixed(1)}% is very low (below 3%).`,
    });
  }

  if (prop.fixedMortgageRate !== null) {
    if (prop.fixedMortgageRate < 0) {
      issues.push({
        id: `mortgage-rate-negative-${id}`,
        severity: "error",
        scope: "property",
        entityId: id,
        path: "fixedMortgageRate",
        code: "mortgage-rate-negative",
        message: "Fixed mortgage rate cannot be negative.",
      });
    } else if (prop.fixedMortgageRate > 0.15) {
      issues.push({
        id: `mortgage-rate-very-high-${id}`,
        severity: "warning",
        scope: "property",
        entityId: id,
        path: "fixedMortgageRate",
        code: "mortgage-rate-very-high",
        message: `Fixed mortgage rate of ${(prop.fixedMortgageRate * 100).toFixed(2)}% is unusually high.`,
      });
    } else if (prop.fixedMortgageRate > 0 && prop.fixedMortgageRate < 0.02) {
      issues.push({
        id: `mortgage-rate-very-low-${id}`,
        severity: "warning",
        scope: "property",
        entityId: id,
        path: "fixedMortgageRate",
        code: "mortgage-rate-very-low",
        message: `Fixed mortgage rate of ${(prop.fixedMortgageRate * 100).toFixed(2)}% is unusually low.`,
      });
    }
  }

  if (prop.mortgageTermYears <= 0) {
    issues.push({
      id: `mortgage-term-non-positive-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "mortgageTermYears",
      code: "mortgage-term-non-positive",
      message: "Mortgage term must be greater than 0 years.",
    });
  }

  if (prop.closingCostPct < 0) {
    issues.push({
      id: `closing-cost-negative-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "closingCostPct",
      code: "closing-cost-negative",
      message: "Closing cost percentage cannot be negative.",
    });
  }

  if (prop.minReserveCash < 0) {
    issues.push({
      id: `min-reserve-negative-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "minReserveCash",
      code: "min-reserve-negative",
      message: "Minimum reserve cash cannot be negative.",
    });
  }

  if (prop.minHoldYears < 0) {
    issues.push({
      id: `min-hold-negative-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "minHoldYears",
      code: "min-hold-negative",
      message: "Minimum hold years cannot be negative.",
    });
  }

  if (prop.latestPurchaseDate !== undefined) {
    if (simDateToIndex(prop.latestPurchaseDate) < simDateToIndex(prop.earliestPurchaseDate)) {
      issues.push({
        id: `latest-before-earliest-${id}`,
        severity: "error",
        scope: "property",
        entityId: id,
        path: "latestPurchaseDate",
        code: "latest-before-earliest",
        message: "Latest purchase date is before the earliest purchase date.",
      });
    }
  }

  if (prop.vacancyRateOverride !== undefined) {
    if (prop.vacancyRateOverride < 0 || prop.vacancyRateOverride > 1) {
      issues.push({
        id: `vacancy-out-of-range-${id}`,
        severity: "error",
        scope: "property",
        entityId: id,
        path: "vacancyRateOverride",
        code: "vacancy-out-of-range",
        message: `Vacancy rate must be between 0% and 100%. Got ${(prop.vacancyRateOverride * 100).toFixed(1)}%.`,
      });
    }
  }

  if (prop.operatingExpensePct !== undefined && prop.operatingExpensePct < 0) {
    issues.push({
      id: `opex-negative-${id}`,
      severity: "error",
      scope: "property",
      entityId: id,
      path: "operatingExpensePct",
      code: "property-opex-negative",
      message: "Operating expense percentage cannot be negative.",
    });
  }

  return issues;
}
