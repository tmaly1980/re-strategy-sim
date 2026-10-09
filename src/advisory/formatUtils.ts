export function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function fmtK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

export function fmtDiff(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${fmtK(n)}`;
}

export function simDateLabel(d: { year: number; month: number }): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.month - 1]} ${d.year}`;
}
