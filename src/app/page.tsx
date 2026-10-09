"use client";

import { useState, useMemo } from "react";
import type {
  SimulationPlan,
  MarketTimeline,
  PropertyOpportunity,
  MarketEvent,
  OneTimeEvent,
} from "@/simulation/types";
import { runSimulation } from "@/simulation/engine";
import { ComparisonChart } from "@/components/ComparisonChart";
import { PropertyOutcomes } from "@/components/PropertyOutcomes";
import { EventTimeline } from "@/components/EventTimeline";
import { nanoid } from "@/lib/nanoid";
import { SimulationPlanPanel } from "@/components/SimulationPlanPanel";
import { KpiRow } from "@/components/KpiRow";
import { PropertyTable } from "@/components/property/PropertyTable";
import { TimelineWorkspace } from "@/components/timeline/TimelineWorkspace";
import { PlanVariantSelector } from "@/components/advisory/PlanVariantSelector";
import { PlanComparison } from "@/components/advisory/PlanComparison";
import { generateRecommendations } from "@/advisory/generateRecommendations";
import { applyRecommendations } from "@/advisory/applyRecommendation";
import { comparePlans } from "@/advisory/comparePlans";
import type { Recommendation, PlanVariant } from "@/advisory/types";
import { runValidation } from "@/validation";

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_PLAN: SimulationPlan = {
  startDate: { year: 2027, month: 1 },
  horizonYears: 20,
  startingCash: 90_000,
  defaultSellingCostPct: 0.06,
  defaultOperatingExpensePct: 0.35,
  baseMarket: {
    annualAppreciation: 0.035,
    annualRentGrowth: 0.025,
    vacancyRate: 0.05,
    mortgageRate: 0.065,
  },
};

const DEFAULT_PROPERTIES: PropertyOpportunity[] = [
  {
    id: nanoid(),
    name: "Property A",
    earliestPurchaseDate: { year: 2027, month: 1 },
    purchasePrice: 320_000,
    monthlyRent: 2_400,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.065,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 20_000,
    minHoldYears: 3,
  },
  {
    id: nanoid(),
    name: "Property B",
    earliestPurchaseDate: { year: 2029, month: 6 },
    purchasePrice: 275_000,
    monthlyRent: 2_100,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.07,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 15_000,
    minHoldYears: 5,
  },
];

function makeTimeline(name: string, events: MarketEvent[] = [], shocks: OneTimeEvent[] = []): MarketTimeline {
  return { id: nanoid(), name, marketEvents: events, oneTimeEvents: shocks };
}

const DEFAULT_TIMELINES: MarketTimeline[] = [
  makeTimeline("Timeline A: Base Case"),
  makeTimeline(
    "Timeline B: Downturn",
    [{
      id: nanoid(), name: "Recession",
      startDate: { year: 2031, month: 1 }, endDate: { year: 2033, month: 12 },
      annualAppreciation: -0.02, annualRentGrowth: 0, vacancyRate: 0.14,
    }],
    [{
      id: nanoid(), name: "Housing Correction",
      date: { year: 2030, month: 9 }, type: "propertyValueShock", magnitude: -0.15,
    }]
  ),
];

const COLORS = ["#2563eb", "#f97316", "#16a34a", "#9333ea", "#dc2626", "#0891b2"];
const ORIGINAL_VARIANT_ID = "original";

function makeOriginalVariant(plan: SimulationPlan, properties: PropertyOpportunity[]): PlanVariant {
  return { id: ORIGINAL_VARIANT_ID, name: "Original Plan", plan, properties, isOriginal: true, appliedRecommendationIds: [] };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [timelines, setTimelines] = useState<MarketTimeline[]>(DEFAULT_TIMELINES);
  const [selectedTimelineId, setSelectedTimelineId] = useState(DEFAULT_TIMELINES[0].id);

  // Plan variants — original is always index 0
  const [planVariants, setPlanVariants] = useState<PlanVariant[]>([
    makeOriginalVariant(DEFAULT_PLAN, DEFAULT_PROPERTIES),
  ]);
  const [selectedVariantId, setSelectedVariantId] = useState(ORIGINAL_VARIANT_ID);
  const activeVariant = planVariants.find((v) => v.id === selectedVariantId) ?? planVariants[0];
  const originalVariant = planVariants.find((v) => v.isOriginal)!;
  const recommendedVariant = planVariants.find((v) => !v.isOriginal);

  // Advisory
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Sync original variant whenever plan/properties are edited
  function updateOriginalPlan(updater: (p: SimulationPlan) => SimulationPlan) {
    setPlanVariants((vs) =>
      vs.map((v) => v.isOriginal ? { ...v, plan: updater(v.plan) } : v)
    );
  }
  function updateOriginalProperties(fn: (ps: PropertyOpportunity[]) => PropertyOpportunity[]) {
    setPlanVariants((vs) =>
      vs.map((v) => v.isOriginal ? { ...v, properties: fn(v.properties) } : v)
    );
  }

  // Reactive simulation results
  const timelineResults = useMemo(
    () => timelines.map((timeline) => ({
      timeline,
      result: runSimulation({ plan: activeVariant.plan, properties: activeVariant.properties, timeline }),
    })),
    [activeVariant.plan, activeVariant.properties, timelines]
  );

  const selectedTimeline = timelines.find((t) => t.id === selectedTimelineId) ?? timelines[0];
  const selectedResult = timelineResults.find((r) => r.timeline.id === selectedTimelineId);

  // Reactive recommendations for the selected timeline
  useMemo(() => {
    const res = timelineResults.find((r) => r.timeline.id === selectedTimelineId);
    if (!res) return;
    const recs = generateRecommendations(
      activeVariant.plan, activeVariant.properties, selectedTimeline, res.result
    );
    setRecommendations(recs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimelineId, activeVariant.plan, activeVariant.properties, timelineResults]);

  // Validation
  const validationIssues = useMemo(
    () => runValidation({ plan: activeVariant.plan, properties: activeVariant.properties, timelines }),
    [activeVariant.plan, activeVariant.properties, timelines]
  );

  // Plan comparison
  const planComparisons = useMemo(() => {
    if (!recommendedVariant) return [];
    return comparePlans(
      originalVariant.plan, originalVariant.properties,
      recommendedVariant.plan, recommendedVariant.properties,
      timelines
    );
  }, [originalVariant, recommendedVariant, timelines]);

  // Timeline CRUD
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
      ...src, id: nanoid(),
      name: `Timeline ${String.fromCharCode(65 + timelines.length)}`,
      marketEvents: src.marketEvents.map((e) => ({ ...e, id: nanoid() })),
      oneTimeEvents: src.oneTimeEvents.map((e) => ({ ...e, id: nanoid() })),
    };
    setTimelines((ts) => [...ts, copy]);
    setSelectedTimelineId(copy.id);
  }
  function deleteTimeline(id: string) {
    if (timelines.length <= 1) return;
    setTimelines((ts) => ts.filter((t) => t.id !== id));
    if (selectedTimelineId === id) setSelectedTimelineId(timelines.find((t) => t.id !== id)!.id);
  }

  // Advisory actions
  function acceptRec(recId: string) {
    setRecommendations((rs) => rs.map((r) => (r.id === recId ? { ...r, status: "accepted" } : r)));
  }
  function rejectRec(recId: string) {
    setRecommendations((rs) => rs.map((r) => (r.id === recId ? { ...r, status: "rejected" } : r)));
  }
  function createRecommendedVariant() {
    const accepted = recommendations.filter((r) => r.status === "accepted");
    if (accepted.length === 0) return;
    const { plan: newPlan, properties: newProps } = applyRecommendations(
      originalVariant.plan, originalVariant.properties, accepted
    );
    const variant: PlanVariant = {
      id: nanoid(),
      name: `Recommended — ${selectedTimeline.name}`,
      plan: newPlan, properties: newProps,
      sourcePlanId: ORIGINAL_VARIANT_ID,
      sourceTimelineId: selectedTimeline.id,
      appliedRecommendationIds: accepted.map((r) => r.id),
      isOriginal: false,
    };
    setPlanVariants((vs) => [...vs.filter((v) => v.isOriginal), variant]);
    setSelectedVariantId(variant.id);
  }
  function deleteVariant(id: string) {
    setPlanVariants((vs) => vs.filter((v) => v.id !== id || v.isOriginal));
    if (selectedVariantId === id) setSelectedVariantId(ORIGINAL_VARIANT_ID);
  }
  function renameVariant(id: string, name: string) {
    setPlanVariants((vs) => vs.map((v) => (v.id === id ? { ...v, name } : v)));
  }

  const kpiItems = timelineResults.map(({ timeline, result }, i) => ({
    name: timeline.name,
    result,
    color: COLORS[i % COLORS.length],
  }));

  const isViewingVariant = selectedVariantId !== ORIGINAL_VARIANT_ID;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Real Estate Portfolio Simulator</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Reactive scenario analysis · Changes update instantly
          </p>
        </div>
        {isViewingVariant && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
            <span className="text-xs text-amber-700">Viewing <strong>{activeVariant.name}</strong></span>
            <button
              className="text-xs text-amber-700 underline hover:text-amber-900"
              onClick={() => setSelectedVariantId(ORIGINAL_VARIANT_ID)}
            >
              Switch to original
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 space-y-4">

        {/* ── Properties ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <PropertyTable
            properties={isViewingVariant ? activeVariant.properties : originalVariant.properties}
            selectedResult={selectedResult?.result}
            validationIssues={validationIssues}
            onChange={isViewingVariant ? () => {} : (ps) => updateOriginalProperties(() => ps)}
          />
        </div>

        {/* ── TOP: Chart + Plan side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Main chart */}
          <ComparisonChart timelineResults={timelineResults} />

          {/* Simulation plan controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Simulation Plan</p>
            <SimulationPlanPanel
              plan={isViewingVariant ? activeVariant.plan : originalVariant.plan}
              onChange={isViewingVariant ? () => {} : updateOriginalPlan}
              readOnly={isViewingVariant}
            />
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <KpiRow results={kpiItems} />
        </div>

        {/* ── Market Timelines ── */}
        <section>
          <div className="flex items-center justify-between mb-0 gap-2">
            <div className="flex items-center gap-2 overflow-x-auto min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-700 mr-1 shrink-0">Market Timelines</h2>
              {timelines.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTimelineId(t.id)}
                  className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors border-b-0 whitespace-nowrap shrink-0 ${
                    t.id === selectedTimelineId
                      ? "bg-white border border-b-white border-slate-200 text-slate-800 -mb-px relative z-10"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent"
                  }`}
                  style={t.id === selectedTimelineId ? { color: COLORS[i % COLORS.length] } : {}}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button
              onClick={addTimeline}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
            >
              + Add Timeline
            </button>
          </div>

          <TimelineWorkspace
            timeline={selectedTimeline}
            recommendations={recommendations}
            validationIssues={validationIssues.filter(
              (i) =>
                (i.scope === "timeline" && i.entityId === selectedTimeline.id) ||
                (i.scope === "market-event" && selectedTimeline.marketEvents.some((e) => e.id === i.entityId)) ||
                (i.scope === "one-time-event" && selectedTimeline.oneTimeEvents.some((e) => e.id === i.entityId))
            )}
            onUpdate={(t) => updateTimeline(t.id, () => t)}
            onRename={(name) => updateTimeline(selectedTimeline.id, (t) => ({ ...t, name }))}
            onDuplicate={() => duplicateTimeline(selectedTimeline.id)}
            onDelete={() => deleteTimeline(selectedTimeline.id)}
            canDelete={timelines.length > 1}
            onAcceptRec={acceptRec}
            onRejectRec={rejectRec}
            onCreateVariant={createRecommendedVariant}
            hasVariant={!!recommendedVariant}
          />
        </section>

        {/* ── Event History (collapsible) ── */}
        {selectedResult && (
          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-50 rounded-xl">
              Event History — {selectedTimeline.name}
              <span className="ml-2 font-normal text-slate-400">({selectedResult.result.events.length} events)</span>
            </summary>
            <div className="px-4 pb-4">
              <EventTimeline events={selectedResult.result.events} />
            </div>
          </details>
        )}

        {/* ── Property Outcomes table ── */}
        {activeVariant.properties.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <PropertyOutcomes
              properties={activeVariant.properties}
              timelineResults={timelineResults}
            />
          </div>
        )}

        {/* ── Plan Variants ── */}
        {planVariants.length > 1 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Plan Variants</p>
            <PlanVariantSelector
              variants={planVariants}
              selectedVariantId={selectedVariantId}
              onSelect={setSelectedVariantId}
              onDelete={deleteVariant}
              onRename={renameVariant}
            />
          </div>
        )}

        {/* ── Plan Comparison ── */}
        {recommendedVariant && planComparisons.length > 0 && (
          <PlanComparison
            comparisons={planComparisons}
            originalName={originalVariant.name}
            variantName={recommendedVariant.name}
          />
        )}

      </main>

      <footer className="border-t border-slate-200 mt-6 px-6 py-3 text-center text-[11px] text-slate-400">
        Simulation only — no taxes, no refinancing, homogeneous property model, JS numeric precision.
      </footer>
    </div>
  );
}
