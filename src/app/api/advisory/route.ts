import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createXai } from "@ai-sdk/xai";
import { z } from "zod";
import type { GlobalEvidence, CandidateEvaluation } from "@/advisory/goals/types";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const strategyGoalSchema = z.object({
  summary: z.string(),
  primaryObjective: z.enum([
    "maximize-net-worth",
    "preserve-cash",
    "minimize-debt",
    "downturn-resilience",
    "acquire-properties",
    "balanced",
    "custom",
  ]),
  constraints: z.object({
    minimumCashReserve: z.number().optional(),
    maximumDebt: z.number().optional(),
    avoidNegativeCash: z.boolean().optional(),
    acquireAllProperties: z.boolean().optional(),
    focusWorstTimeline: z.boolean().optional(),
  }),
  priorities: z.object({
    endingNetWorth: z.number().min(0).max(1),
    minimumCashReserve: z.number().min(0).max(1),
    debtReduction: z.number().min(0).max(1),
    propertyAcquisition: z.number().min(0).max(1),
    crossTimelineResilience: z.number().min(0).max(1),
  }),
  userPreferences: z.array(z.string()),
});

const planChangeKindSchema = z.enum([
  "shiftPurchaseDate",
  "addSellTrigger",
  "removeSellTrigger",
  "none",
]);

const planChangeSchema = z.object({
  kind: planChangeKindSchema,
  propertyId: z.string(),
  newEarliestPurchaseDate: z
    .object({ year: z.number(), month: z.number().min(1).max(12) })
    .optional(),
  newSellWhenEquityPct: z.number().min(0).max(1).optional(),
  newMinHoldYears: z.number().min(0).optional(),
});

const crossTimelineImpactSchema = z.object({
  timelineId: z.string(),
  timelineName: z.string(),
  endingNetWorthDiff: z.number(),
  minCashDiff: z.number(),
  endingEquityDiff: z.number(),
});

const aiRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  proposedChange: planChangeSchema,
  crossTimelineImpact: z.array(crossTimelineImpactSchema),
});

// ─── Model selection ──────────────────────────────────────────────────────────

function getModel() {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const modelId = process.env.AI_MODEL ?? "";

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    return createAnthropic({ apiKey: key })(modelId || "claude-haiku-4-5-20251001");
  }
  if (provider === "xai") {
    const key = process.env.XAI_API_KEY;
    if (!key) return null;
    return createXai({ apiKey: key })(modelId || "grok-beta");
  }
  // Default: openai
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return createOpenAI({ apiKey: key })(modelId || "gpt-4o-mini");
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildGoalInterpretationPrompt(goal: string, evidence: GlobalEvidence): string {
  const timelineSummaries = evidence.timelines
    .map(
      (t) =>
        `- ${t.timelineName}: ending net worth $${Math.round(t.endingNetWorth).toLocaleString()}, min cash $${Math.round(t.minCash).toLocaleString()}, ending equity $${Math.round(t.endingEquity).toLocaleString()}`
    )
    .join("\n");

  return `You are a real estate investment strategy interpreter.

The investor has modeled ${evidence.timelines.length} market timelines with a ${evidence.planSummary.horizonYears}-year horizon, starting cash of $${evidence.planSummary.startingCash.toLocaleString()}.

Current plan results across timelines:
${timelineSummaries}

The investor's goal: "${goal}"

Interpret this goal into structured criteria. Be specific about any numeric constraints you can infer (e.g., "$25,000 cash reserve" → minimumCashReserve: 25000). If you cannot infer a numeric value, omit that field.`;
}

function buildRecommendationPrompt(
  interpretedGoal: z.infer<typeof strategyGoalSchema>,
  evidence: GlobalEvidence,
  candidates: CandidateEvaluation[]
): string {
  const timelineSummaries = evidence.timelines
    .map(
      (t) =>
        `${t.timelineName}: net worth $${Math.round(t.endingNetWorth).toLocaleString()}, min cash $${Math.round(t.minCash).toLocaleString()}, equity $${Math.round(t.endingEquity).toLocaleString()}, debt $${Math.round(t.endingMortgageDebt).toLocaleString()}${t.importantWarnings.length ? ` [WARNINGS: ${t.importantWarnings.join("; ")}]` : ""}`
    )
    .join("\n");

  const propertySummary = evidence.properties
    .map(
      (p) =>
        `- ${p.name} (id: ${p.id}): price $${p.purchasePrice.toLocaleString()}, rent $${p.monthlyRent}/mo, earliest purchase ${p.earliestPurchaseYear}/${String(p.earliestPurchaseMonth).padStart(2, "0")}, reserve $${p.minReserveCash.toLocaleString()}${p.sellWhenEquityPct ? `, sell at ${Math.round(p.sellWhenEquityPct * 100)}% equity` : ""}`
    )
    .join("\n");

  const candidateSummaries = candidates
    .map((c, i) => {
      const impactLines = c.crossTimelineImpact
        .map(
          (ct) =>
            `    ${ct.timelineName}: net worth ${ct.endingNetWorthDiff >= 0 ? "+" : ""}$${Math.round(ct.endingNetWorthDiff).toLocaleString()}, min cash ${ct.minCashDiff >= 0 ? "+" : ""}$${Math.round(ct.minCashDiff).toLocaleString()}, equity ${ct.endingEquityDiff >= 0 ? "+" : ""}$${Math.round(ct.endingEquityDiff).toLocaleString()}`
        )
        .join("\n");
      return `Candidate ${i + 1}: ${c.label}\n${impactLines}`;
    })
    .join("\n\n");

  return `You are a real estate investment strategy advisor.

INVESTOR GOAL (interpreted):
- Objective: ${interpretedGoal.primaryObjective}
- Summary: ${interpretedGoal.summary}
- Constraints: ${JSON.stringify(interpretedGoal.constraints)}
- Priorities: net worth ${interpretedGoal.priorities.endingNetWorth}, cash ${interpretedGoal.priorities.minimumCashReserve}, debt reduction ${interpretedGoal.priorities.debtReduction}, acquisition ${interpretedGoal.priorities.propertyAcquisition}, resilience ${interpretedGoal.priorities.crossTimelineResilience}

CURRENT PLAN RESULTS:
${timelineSummaries}

PROPERTIES:
${propertySummary}

CANDIDATE CHANGES (with simulator-measured cross-timeline impact):
${candidateSummaries}

INSTRUCTIONS:
- Select 1–4 candidate changes that best serve the investor's goal.
- For each selected candidate, copy the exact crossTimelineImpact numbers from above — do NOT invent or modify any financial figures.
- The proposedChange must exactly match one of the candidates above (same kind, propertyId, and dates/values).
- Write a clear rationale explaining WHY this change serves the stated goal, referencing specific timeline numbers.
- If no candidate improves the plan for this goal, return a single recommendation with kind: "none" and propertyId: "" explaining the current plan already aligns well.
- Generate a unique id for each recommendation (e.g., "rec-1", "rec-2").

Respond ONLY with valid structured recommendations. Do not include text outside the JSON structure.`;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET() {
  const model = getModel();
  return NextResponse.json({ configured: model !== null });
}

export async function POST(req: NextRequest) {
  const model = getModel();
  if (!model) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  let body: { goal: string; evidence: GlobalEvidence; candidateEvaluations: CandidateEvaluation[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { goal, evidence, candidateEvaluations } = body;

  if (!goal || !evidence || !candidateEvaluations) {
    return NextResponse.json({ error: "Missing required fields: goal, evidence, candidateEvaluations" }, { status: 400 });
  }

  try {
    // Call 1: Interpret the goal
    const { object: interpretedGoal } = await generateObject({
      model,
      schema: strategyGoalSchema,
      prompt: buildGoalInterpretationPrompt(goal, evidence),
    });

    // Call 2: Generate recommendations using interpreted goal + candidate evaluations
    const { object: recResult } = await generateObject({
      model,
      schema: z.object({ recommendations: z.array(aiRecommendationSchema) }),
      prompt: buildRecommendationPrompt(interpretedGoal, evidence, candidateEvaluations),
    });

    return NextResponse.json({
      configured: true,
      interpretedGoal,
      recommendations: recResult.recommendations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 500 });
  }
}
