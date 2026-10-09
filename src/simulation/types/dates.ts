// SimDate — a year+month pair used throughout the simulation.
// Avoids JS Date timezone pitfalls for a monthly simulation model.

export interface SimDate {
  year: number;
  month: number; // 1–12
}

export function simDateToIndex(d: SimDate): number {
  return d.year * 12 + d.month;
}

export function simDateLabel(d: SimDate): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.month - 1]} ${d.year}`;
}

export function addMonths(d: SimDate, n: number): SimDate {
  const total = d.year * 12 + (d.month - 1) + n;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function simDatesBefore(a: SimDate, b: SimDate): boolean {
  return simDateToIndex(a) < simDateToIndex(b);
}

export function simDatesEqual(a: SimDate, b: SimDate): boolean {
  return a.year === b.year && a.month === b.month;
}

export function dateStr(d: SimDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}

export function parseDate(s: string): SimDate | null {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}
