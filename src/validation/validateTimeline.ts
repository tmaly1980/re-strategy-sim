import type { MarketTimeline, SimulationPlan } from "@/simulation/types";
import { simDateToIndex } from "@/simulation/types";
import type { ValidationIssue } from "./types";
import { validateMarketEvent } from "./validateMarketEvent";
import { validateOneTimeEvent } from "./validateOneTimeEvent";

// Fields that can conflict between market events
type ConflictableField = "annualAppreciation" | "annualRentGrowth" | "vacancyRate" | "mortgageRate" | "operatingExpenseAdjustment";
const CONFLICTABLE_FIELDS: ConflictableField[] = [
  "annualAppreciation",
  "annualRentGrowth",
  "vacancyRate",
  "mortgageRate",
  "operatingExpenseAdjustment",
];

export function validateTimeline(
  timeline: MarketTimeline,
  plan?: SimulationPlan
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate each market event individually
  for (const event of timeline.marketEvents) {
    issues.push(...validateMarketEvent(event));
  }

  // Validate each one-time event individually
  for (const event of timeline.oneTimeEvents) {
    issues.push(...validateOneTimeEvent(event));
  }

  // Check for events outside simulation horizon
  if (plan) {
    const simStart = simDateToIndex(plan.startDate);
    const simEndYear = plan.startDate.year + plan.horizonYears;
    const simEnd = simDateToIndex({ year: simEndYear, month: plan.startDate.month });

    for (const event of timeline.marketEvents) {
      const eventStart = simDateToIndex(event.startDate);
      const eventEnd = simDateToIndex(event.endDate);
      if (eventEnd < simStart || eventStart > simEnd) {
        issues.push({
          id: `market-event-outside-horizon-${event.id}`,
          severity: "warning",
          scope: "market-event",
          entityId: event.id,
          code: "market-event-outside-horizon",
          message: `Market event "${event.name}" falls entirely outside the simulation horizon and will have no effect.`,
        });
      }
    }

    for (const event of timeline.oneTimeEvents) {
      const eventIdx = simDateToIndex(event.date);
      if (eventIdx < simStart || eventIdx > simEnd) {
        issues.push({
          id: `one-time-event-outside-horizon-${event.id}`,
          severity: "warning",
          scope: "one-time-event",
          entityId: event.id,
          code: "one-time-event-outside-horizon",
          message: `One-time event "${event.name}" falls outside the simulation horizon and will have no effect.`,
        });
      }
    }
  }

  // Check for overlapping market events with conflicting fields
  const events = timeline.marketEvents;
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      const aStart = simDateToIndex(a.startDate);
      const aEnd = simDateToIndex(a.endDate);
      const bStart = simDateToIndex(b.startDate);
      const bEnd = simDateToIndex(b.endDate);

      // Check if they overlap
      const overlaps = aStart <= bEnd && bStart <= aEnd;
      if (!overlaps) continue;

      // Find which fields both define
      for (const field of CONFLICTABLE_FIELDS) {
        if (a[field] !== undefined && b[field] !== undefined) {
          // Later-starting event wins. If same start, last in array wins (b here)
          const winner = bStart >= aStart ? b.name : a.name;
          issues.push({
            id: `market-event-overlap-${field}-${a.id}-${b.id}`,
            severity: "info",
            scope: "timeline",
            entityId: timeline.id,
            code: "market-event-field-overlap",
            message: `Events "${a.name}" and "${b.name}" both set "${field}" during an overlapping period. "${winner}" will take precedence (later-starting event wins).`,
            details: `When two market events overlap on the same field, the event that started most recently wins. You may want to stagger these events or remove the duplicate field from one of them.`,
          });
        }
      }
    }
  }

  return issues;
}
