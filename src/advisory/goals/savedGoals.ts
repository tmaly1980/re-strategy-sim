import type { SavedAdvisoryGoal } from "./types";

export const SAVED_ADVISORY_GOALS: SavedAdvisoryGoal[] = [
  {
    id: "balanced-resilience",
    name: "Balanced Resilience",
    description: "Balance long-term growth with reasonable liquidity across all modeled futures.",
    prompt:
      "Find a strategy that performs well across all timelines without over-optimizing for the Base Case. I want strong long-term net worth, but I also want to preserve enough liquidity to handle downturns and avoid fragile acquisition timing.",
  },
  {
    id: "protect-25k-cash",
    name: "Protect $25K Cash",
    description: "Keep modeled cash reserves above $25,000 whenever practical.",
    prompt:
      "Maximize long-term net worth while keeping at least $25,000 in cash reserves across all timelines. Prefer delaying an acquisition over violating that reserve target.",
  },
  {
    id: "downturn-resilience",
    name: "Downturn Resilience",
    description: "Favor survival and liquidity during adverse scenarios.",
    prompt:
      "I care more about surviving downturns than maximizing upside. Recommend changes that improve cash reserves, reduce the chance of negative cash, and make the portfolio more resilient in the worst-performing timeline.",
  },
  {
    id: "maximum-growth",
    name: "Maximum Growth",
    description: "Prioritize long-term net worth and property acquisition.",
    prompt:
      "Prioritize maximum long-term net worth across the modeled timelines. I am willing to accept lower cash reserves and more leverage if the expected simulated benefit is material, but call out significant downside risk.",
  },
  {
    id: "acquire-all-properties",
    name: "Acquire All Properties",
    description: "Try to acquire every configured property without creating excessive liquidity risk.",
    prompt:
      "Find a strategy that acquires all configured properties as early as reasonably possible while avoiding severe cash shortages. If an acquisition should be delayed, explain why and identify the earliest safer window.",
  },
  {
    id: "minimize-debt",
    name: "Minimize Debt",
    description: "Reduce leverage while keeping reasonable growth.",
    prompt:
      "Favor lower mortgage debt and stronger equity while still producing reasonable long-term portfolio growth. Recommend delays, larger reserves, or holding decisions when they materially reduce leverage without destroying overall performance.",
  },
  {
    id: "worst-case-focus",
    name: "Worst-Case Focus",
    description: "Optimize primarily for the weakest modeled timeline.",
    prompt:
      "Optimize this plan primarily for the worst-performing timeline. I am willing to sacrifice some Base Case upside if doing so materially improves the weakest outcome and keeps the plan financially stable.",
  },
];
