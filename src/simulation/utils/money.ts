// Formatting utilities for currency and percentages.
// All simulation calculations use raw JS numbers; formatting is presentation-only.

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatCurrencyFull(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}
