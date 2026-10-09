"use client";

import { useState, useMemo } from "react";
import type {
  SimulationPlan,
  MarketTimeline,
  PropertyOpportunity,
  BaseMarketConditions,
  SimDate,
  MarketEvent,
  OneTimeEvent,
} from "@/simulation/types";
import { runSimulation } from "@/simulation/engine";
import { PropertyList } from "@/components/PropertyList";
import { MarketEventList } from "@/components/MarketEventList";
import { OneTimeEventList } from "@/components/OneTimeEventList";
import { ComparisonChart } from "@/components/ComparisonChart";
import { TimelineSummaryCards } from "@/components/TimelineSummaryCards";
import { PropertyOutcomes } from "@/components/PropertyOutcomes";
import { EventTimeline } from "@/components/EventTimeline";
import { PortfolioChart } from "@/components/PortfolioChart";
import { nanoid } from "@/lib/nanoid";
import { Tooltip } from "@/components/Tooltip";
import { AdvisoryPanel } from "@/components/advisory/AdvisoryPanel";
import { PlanVariantSelector } from "@/components/advisory/PlanVariantSelector";
import { PlanComparison } from "@/components/advisory/PlanComparison";
import { generateRecommendations } from "@/advisory/generateRecommendations";
import { applyRecommendations } from "@/advisory/applyRecommendation";
import { comparePlans } from "@/advisory/comparePlans";
import type { Recommendation, PlanVariant } from "@/advisory/types";

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_BASE: BaseMarketConditions = {
  annualAppreciation: 0.035,
  annualRentGrowth: 0.025,
  vacancyRate: 0.05,
  mortgageRate: 0.065,
};

const DEFAULT_PLAN: SimulationPlan = {
  startDate: { year: 2027, month: 1 },
  horizonYears: 20,
  startingCash: 100_000,
  defaultSellingCostPct: 0.06,
  defaultOperatingExpensePct: 0.35,
  baseMarket: DEFAULT_BASE,
};

const DEFAULT_PROPERTIES: PropertyOpportunity[] = [
  {
    id: nanoid(),
    name: "Property A",
    earliestPurchaseDate: { year: 2027, month: 1 },
    purchasePrice: 250_000,
    monthlyRent: 2_100,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.065,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 15_000,
    minHoldYears: 10,
    sellWhenEquityPct: 0.5,
  },
];

function makeTimeline(name: string, events: MarketEvent[] = [], shocks: OneTimeEvent[] = []): MarketTimeline {
  return { id: nanoid(), name, marketEvents: events, oneTimeEvents: shocks };
}

const DEFAULT_TIMELINES: MarketTimeline[] = [
  makeTimeline("Timeline A"),
  makeTimeline(
    "Timeline B: Downturn",
    [
      {
        id: nanoid(),
        name: "Recession",
        startDate: { year: 2031, month: 1 },
        endDate: { year: 2033, month: 12 },
        annualAppreciation: -0.02,
        annualRentGrowth: 0,
        vacancyRate: 0.14,
      },
    ],
    [
      {
        id: nanoid(),
        name: "Housing Correction",
        date: { year: 2031, month: 6 },
        type: "propertyValueShock",
        magnitude: -0.15,
      },
    ]
  ),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string): SimDate | null {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

function dateStr(d: SimDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}

const inputCls =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500";

// ─── Page ─────────────────────────────────────────────────────────────────────

const ORIGINAL_VARIANT_ID = "original";

function makeOriginalVariant(plan: SimulationPlan, properties: PropertyOpportunity[]): PlanVariant {
  return { id: ORIGINAL_VARIANT_ID, name: "Original Plan", plan, properties, isOriginal: true, appliedRecommendationIds: [] };
}

export default function Home() {
  const [plan, setPlan] = useState<SimulationPlan>(DEFAULT_PLAN);
  const [properties, setProperties] = useState<PropertyOpportunity[]>(DEFAULT_PROPERTIES);
  const [timelines, setTimelines] = useState<MarketTimeline[]>(DEFAULT_TIMELINES);
  const [selectedTimelineId, setSelectedTimelineId] = useState(DEFAULT_TIMELINES[0].id);

  // ── Advisory state ──
  const [advisoryTimelineId, setAdvisoryTimelineId] = useState(DEFAULT_TIMELINES[0].id);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [planVariants, setPlanVariants] = useState<PlanVariant[]>([
    makeOriginalVariant(DEFAULT_PLAN, DEFAULT_PROPERTIES),
  ]);
  const [selectedVariantId, setSelectedVariantId] = useState(ORIGINAL_VARIANT_ID);

  // ── Active variant plan/properties ──
  const activeVariant = planVariants.find((v) => v.id === selectedVariantId) ?? planVariants[0];
  const activePlan = activeVariant.plan;
  const activeProperties = activeVariant.properties;

  // ── Sync original variant when user edits plan/properties ──
  // (editing plan inputs always updates the original variant)
  function setPlanAndSync(updater: (p: SimulationPlan) => SimulationPlan) {
    setPlan((prev) => {
      const next = updater(prev);
      setPlanVariants((vs) => vs.map((v) => v.isOriginal ? { ...v, plan: next } : v));
      return next;
    });
  }
  function setPropertiesAndSync(next: PropertyOpportunity[]) {
    setProperties(next);
    setPlanVariants((vs) => vs.map((v) => v.isOriginal ? { ...v, properties: next } : v));
  }

  // ── Reactive simulation ──
  const timelineResults = useMemo(
    () =>
      timelines.map((timeline) => ({
        timeline,
        result: runSimulation({ plan: activePlan, properties: activeProperties, timeline }),
      })),
    [activePlan, activeProperties, timelines]
  );

  const selectedResult = timelineResults.find((r) => r.timeline.id === selectedTimelineId);

  // ── Reactive recommendations (for advisory timeline) ──
  const advisoryTimeline = timelines.find((t) => t.id === advisoryTimelineId) ?? timelines[0];
  const advisoryResult = timelineResults.find((r) => r.timeline.id === advisoryTimeline.id)?.result;

  useMemo(() => {
    if (!advisoryResult) return;
    const recs = generateRecommendations(activePlan, activeProperties, advisoryTimeline, advisoryResult);
    setRecommendations(recs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisoryTimeline.id, activePlan, activeProperties, advisoryResult]);

  // ── Plan comparison (only when a variant exists) ──
  const originalVariant = planVariants.find((v) => v.isOriginal)!;
  const recommendedVariant = planVariants.find((v) => !v.isOriginal);
  const planComparisons = useMemo(() => {
    if (!recommendedVariant) return [];
    return comparePlans(
      originalVariant.plan, originalVariant.properties,
      recommendedVariant.plan, recommendedVariant.properties,
      timelines
    );
  }, [originalVariant, recommendedVariant, timelines]);

  function setBase(key: keyof BaseMarketConditions, val: number) {
    setPlanAndSync((p) => ({ ...p, baseMarket: { ...p.baseMarket, [key]: val } }));
  }

  function updateTimeline(id: string, fn: (t: MarketTimeline) => MarketTimeline) {
    setTimelines((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  }

  function addTimeline() {
    const letter = String.fromCharCode(65 + timelines.length);
    const t = makeTimeline(`Timeline ${letter}`);
    setTimelines((ts) => [...ts, t]);
    setSelectedTimelineId(t.id);
  }

  function duplicateTimeline(id: string) {
    const src = timelines.find((t) => t.id === id);
    if (!src) return;
    const copy: MarketTimeline = {
      ...src,
      id: nanoid(),
      name: `Timeline ${String.fromCharCode(65 + timelines.length)}`,
      marketEvents: src.marketEvents.map((e) => ({ ...e, id: nanoid() })),
      oneTimeEvents: src.oneTimeEvents.map((e) => ({ ...e, id: nanoid() })),
    };
    setTimelines((ts) => [...ts, copy]);
    setSelectedTimelineId(copy.id);
  }

  function deleteTimeline(id: string) {
    if (timelines.length <= 1) return; // keep at least one
    setTimelines((ts) => ts.filter((t) => t.id !== id));
    if (selectedTimelineId === id) {
      setSelectedTimelineId(timelines.find((t) => t.id !== id)!.id);
    }
  }

  // ── Advisory actions ──
  function acceptRec(recId: string) {
    setRecommendations((rs) =>
      rs.map((r) => (r.id === recId ? { ...r, status: "accepted" } : r))
    );
  }
  function rejectRec(recId: string) {
    setRecommendations((rs) =>
      rs.map((r) => (r.id === recId ? { ...r, status: "rejected" } : r))
    );
  }
  function createRecommendedVariant() {
    const accepted = recommendations.filter((r) => r.status === "accepted");
    if (accepted.length === 0) return;
    const { plan: newPlan, properties: newProps } = applyRecommendations(
      originalVariant.plan,
      originalVariant.properties,
      accepted
    );
    const variant: PlanVariant = {
      id: nanoid(),
      name: `Recommended — ${advisoryTimeline.name}`,
      plan: newPlan,
      properties: newProps,
      sourcePlanId: ORIGINAL_VARIANT_ID,
      sourceTimelineId: advisoryTimeline.id,
      appliedRecommendationIds: accepted.map((r) => r.id),
      isOriginal: false,
    };
    setPlanVariants((vs) => {
      // Replace any existing non-original variant
      const withoutVariant = vs.filter((v) => v.isOriginal);
      return [...withoutVariant, variant];
    });
    setSelectedVariantId(variant.id);
  }
  function deleteVariant(id: string) {
    setPlanVariants((vs) => vs.filter((v) => v.id !== id || v.isOriginal));
    if (selectedVariantId === id) setSelectedVariantId(ORIGINAL_VARIANT_ID);
  }
  function renameVariant(id: string, name: string) {
    setPlanVariants((vs) => vs.map((v) => (v.id === id ? { ...v, name } : v)));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Real Estate Portfolio Simulator
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          A reactive scenario-modeling tool for exploring how property acquisitions perform under changing market conditions.
          Changes update instantly — no Run button.
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-8">

        {/* ── Global plan settings ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Simulation Plan</h2>
          {selectedVariantId !== ORIGINAL_VARIANT_ID && (
            <p className="text-xs text-amber-600 mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              Viewing <strong>{activeVariant.name}</strong>.{" "}
              <button className="underline" onClick={() => setSelectedVariantId(ORIGINAL_VARIANT_ID)}>Switch to Original Plan</button> to edit inputs.
            </p>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  Start date
                  <Tooltip text="The month the simulation begins. All property availability dates and market events are relative to this calendar date." />
                </p>
                <input
                  type="month"
                  className={inputCls + " w-full"}
                  value={dateStr(activePlan.startDate)}
                  onChange={(e) => {
                    const d = parseDate(e.target.value);
                    if (d) setPlanAndSync((p) => ({ ...p, startDate: d }));
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  Horizon
                  <Tooltip text="How many years to simulate. The simulation runs month-by-month for this duration and then stops." />
                </p>
                <select
                  className={inputCls + " w-full"}
                  value={activePlan.horizonYears}
                  onChange={(e) =>
                    setPlanAndSync((p) => ({
                      ...p,
                      horizonYears: Number(e.target.value) as 10 | 20 | 30,
                    }))
                  }
                >
                  <option value={10}>10 years</option>
                  <option value={20}>20 years</option>
                  <option value={30}>30 years</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  Starting cash ($)
                  <Tooltip text="Total liquid capital available at the start of the simulation. Used to fund down payments, closing costs, and reserves." />
                </p>
                <input
                  type="number"
                  className={inputCls + " w-full"}
                  value={activePlan.startingCash}
                  step={5000}
                  onChange={(e) =>
                    setPlanAndSync((p) => ({ ...p, startingCash: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  Selling cost (%)
                  <Tooltip text="Default cost to sell a property as a percentage of sale price. Covers agent commissions and closing fees. Applied to all properties unless overridden." />
                </p>
                <input
                  type="number"
                  className={inputCls + " w-full"}
                  value={(activePlan.defaultSellingCostPct * 100).toFixed(1)}
                  step={0.5}
                  onChange={(e) =>
                    setPlanAndSync((p) => ({
                      ...p,
                      defaultSellingCostPct: Number(e.target.value) / 100,
                    }))
                  }
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">
                  Default op. expense (%)
                  <Tooltip text="Default operating expenses as a percentage of effective rent (after vacancy). Covers maintenance, property management, insurance, and taxes. Can be overridden per property." />
                </p>
                <input
                  type="number"
                  className={inputCls + " w-full"}
                  value={(activePlan.defaultOperatingExpensePct * 100).toFixed(0)}
                  step={1}
                  onChange={(e) =>
                    setPlanAndSync((p) => ({
                      ...p,
                      defaultOperatingExpensePct: Number(e.target.value) / 100,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Base Market (before any timeline events)</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(
                  [
                    ["annualAppreciation", "Appreciation (%/yr)", "Annual rate at which property values grow. Applied monthly as (1 + rate/12). Timeline events can override this."],
                    ["annualRentGrowth", "Rent growth (%/yr)", "Annual rate at which monthly rents increase. Applied monthly. Reflects inflation and local market demand."],
                    ["vacancyRate", "Vacancy (%)", "Fraction of the year a property sits vacant and earns no rent. Reduces effective rent before expenses are calculated."],
                    ["mortgageRate", "Mortgage rate (%)", "Annual interest rate for new mortgages when no fixed rate is set on a property. Timeline events can override this."],
                  ] as [keyof BaseMarketConditions, string, string][]
                ).map(([key, label, tip]) => (
                  <div key={key}>
                    <p className="text-xs text-slate-400 mb-0.5">
                      {label}
                      <Tooltip text={tip} />
                    </p>
                    <input
                      type="number"
                      className={inputCls + " w-full"}
                      value={(activePlan.baseMarket[key] * 100).toFixed(2)}
                      step={0.1}
                      onChange={(e) => setBase(key, Number(e.target.value) / 100)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Properties ── */}
        <PropertyList properties={activeProperties} onChange={setPropertiesAndSync} />

        {/* ── Market timelines ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Market Timelines</h2>
            <button
              onClick={addTimeline}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Add Timeline
            </button>
          </div>

          {/* Timeline tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {timelines.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTimelineId(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  t.id === selectedTimelineId
                    ? "bg-slate-800 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Selected timeline editor */}
          {timelines.map((t) =>
            t.id !== selectedTimelineId ? null : (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={t.name}
                    onChange={(e) =>
                      updateTimeline(t.id, (tl) => ({ ...tl, name: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => duplicateTimeline(t.id)}
                    className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    Duplicate
                  </button>
                  {timelines.length > 1 && (
                    <button
                      onClick={() => deleteTimeline(t.id)}
                      className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <MarketEventList
                  events={t.marketEvents}
                  onChange={(evts) =>
                    updateTimeline(t.id, (tl) => ({ ...tl, marketEvents: evts }))
                  }
                />

                <OneTimeEventList
                  events={t.oneTimeEvents}
                  onChange={(evts) =>
                    updateTimeline(t.id, (tl) => ({ ...tl, oneTimeEvents: evts }))
                  }
                />
              </div>
            )
          )}
        </section>

        {/* ── Comparison chart ── */}
        <section>
          <ComparisonChart timelineResults={timelineResults} />
        </section>

        {/* ── Summary cards ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Timeline Results</h2>
          <TimelineSummaryCards
            timelineResults={timelineResults}
            selectedId={selectedTimelineId}
            onSelect={setSelectedTimelineId}
          />
        </section>

        {/* ── Property outcome comparison ── */}
        {properties.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <PropertyOutcomes
              properties={properties}
              timelineResults={timelineResults}
            />
          </section>
        )}

        {/* ── Selected timeline detail ── */}
        {selectedResult && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Detail — {selectedResult.timeline.name}
            </h2>
            <div className="space-y-4">
              <PortfolioChart result={selectedResult.result} />
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <EventTimeline events={selectedResult.result.events} />
              </div>
            </div>
          </section>
        )}
        {/* ── Advisory ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Advisory</h2>
          <AdvisoryPanel
            recommendations={recommendations}
            timelines={timelines}
            selectedTimelineId={advisoryTimelineId}
            onSelectTimeline={(id) => setAdvisoryTimelineId(id)}
            onAccept={acceptRec}
            onReject={rejectRec}
            onCreateVariant={createRecommendedVariant}
            hasVariant={planVariants.some((v) => !v.isOriginal)}
            hasAccepted={recommendations.some((r) => r.status === "accepted")}
          />
        </section>

        {/* ── Plan variants ── */}
        {planVariants.length > 1 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Plan Variants</h2>
            <PlanVariantSelector
              variants={planVariants}
              selectedVariantId={selectedVariantId}
              onSelect={setSelectedVariantId}
              onDelete={deleteVariant}
              onRename={renameVariant}
            />
          </section>
        )}

        {/* ── Plan comparison ── */}
        {recommendedVariant && planComparisons.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Plan Comparison</h2>
            <PlanComparison
              comparisons={planComparisons}
              originalName={originalVariant.name}
              variantName={recommendedVariant.name}
            />
          </section>
        )}

      </main>

      <footer className="border-t border-slate-200 mt-8 px-6 py-4 text-center text-xs text-slate-400">
        Simulation only — no taxes, no refinancing, homogeneous property model, JS numeric precision.
      </footer>
    </div>
  );
}
