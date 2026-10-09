import type { Mortgage } from "./types";

export function createMortgage(
  principal: number,
  annualRate: number,
  termYears = 30
): Mortgage {
  const termMonths = termYears * 12;
  const r = annualRate / 12;
  const monthlyPayment =
    r === 0
      ? principal / termMonths
      : (principal * r) / (1 - Math.pow(1 + r, -termMonths));

  return {
    originalPrincipal: principal,
    balance: principal,
    annualRate,
    monthlyPayment,
    termMonths,
    monthsRemaining: termMonths,
  };
}

export function applyMonthlyPayment(m: Mortgage): Mortgage {
  if (m.balance <= 0 || m.monthsRemaining <= 0) {
    return { ...m, balance: 0, monthsRemaining: 0 };
  }
  const r = m.annualRate / 12;
  const interest = m.balance * r;
  const principal = Math.min(m.monthlyPayment - interest, m.balance);
  return {
    ...m,
    balance: Math.max(0, m.balance - principal),
    monthsRemaining: m.monthsRemaining - 1,
  };
}

export function currentPayment(m: Mortgage): number {
  return m.balance <= 0 ? 0 : Math.min(m.monthlyPayment, m.balance);
}
