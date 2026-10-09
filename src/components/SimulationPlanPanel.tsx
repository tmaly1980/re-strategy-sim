"use client";

import { useState } from "react";
import type { SimulationPlan, BaseMarketConditions } from "@/simulation/types";
import { Tooltip } from "./Tooltip";

interface Props {
  plan: SimulationPlan;
  onChange: (updater: (p: SimulationPlan) => SimulationPlan) => void;
  readOnly?: boolean;
}

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-2 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]";
const labelCls = "text-[10px] text-slate-400 mb-0.5 flex items-center gap-0.5";

function parseDate(s: string): { year: number; month: number } | null {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}
function dateStr(d: { year: number; month: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}
function fmt(n: number) { return `$${Math.round(n).toLocaleString("en-US")}`; }
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function PlanFields({ plan, onChange, readOnly }: Props) {
  const set = (key: keyof SimulationPlan, val: SimulationPlan[keyof SimulationPlan]) =>
    onChange((p) => ({ ...p, [key]: val }));
  const setBase = (key: keyof BaseMarketConditions, val: number) =>
    onChange((p) => ({ ...p, baseMarket: { ...p.baseMarket, [key]: val } }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <p className={labelCls}>
            Start date
            <Tooltip text="The month the simulation begins." />
          </p>
          <input
            type="month"
            className={inputCls}
            value={dateStr(plan.startDate)}
            disabled={readOnly}
            onChange={(e) => { const d = parseDate(e.target.value); if (d) set("startDate", d); }}
          />
        </div>
        <div>
          <p className={labelCls}>
            Horizon (yrs)
            <Tooltip text="How many years to simulate." />
          </p>
          <input
            type="number"
            inputMode="numeric"
            className={inputCls}
            value={plan.horizonYears}
            step={1}
            min={1}
            disabled={readOnly}
            onChange={(e) => set("horizonYears", Number(e.target.value))}
          />
        </div>
        <div>
          <p className={labelCls}>
            Starting cash
            <Tooltip text="Liquid capital at simulation start." />
          </p>
          <input
            type="number"
            inputMode="numeric"
            className={inputCls}
            value={plan.startingCash}
            step={5000}
            disabled={readOnly}
            onChange={(e) => set("startingCash", Number(e.target.value))}
          />
        </div>
        <div>
          <p className={labelCls}>
            Selling cost %
            <Tooltip text="Default selling cost as % of sale price." />
          </p>
          <input
            type="number"
            inputMode="decimal"
            className={inputCls}
            value={(plan.defaultSellingCostPct * 100).toFixed(1)}
            step={0.5}
            disabled={readOnly}
            onChange={(e) => set("defaultSellingCostPct", Number(e.target.value) / 100)}
          />
        </div>
        <div className="col-span-2">
          <p className={labelCls}>
            Default op. expense %
            <Tooltip text="Operating expenses as % of effective rent." />
          </p>
          <input
            type="number"
            inputMode="numeric"
            className={inputCls}
            value={(plan.defaultOperatingExpensePct * 100).toFixed(0)}
            step={1}
            disabled={readOnly}
            onChange={(e) => set("defaultOperatingExpensePct", Number(e.target.value) / 100)}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Base Market</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {(
            [
              ["annualAppreciation", "Appreciation %/yr", "Annual property value growth rate."],
              ["annualRentGrowth",   "Rent growth %/yr",  "Annual rent increase rate."],
              ["vacancyRate",        "Vacancy %",         "Fraction of year unit sits vacant."],
              ["mortgageRate",       "Mortgage rate %",   "Rate for new loans (no fixed rate set)."],
            ] as [keyof BaseMarketConditions, string, string][]
          ).map(([key, label, tip]) => (
            <div key={key}>
              <p className={labelCls}>
                {label}
                <Tooltip text={tip} />
              </p>
              <input
                type="number"
                inputMode="decimal"
                className={inputCls}
                value={(plan.baseMarket[key] * 100).toFixed(2)}
                step={0.1}
                disabled={readOnly}
                onChange={(e) => setBase(key, Number(e.target.value) / 100)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SimulationPlanPanel({ plan, onChange, readOnly }: Props) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <>
      {/* Mobile: compact summary with Edit toggle */}
      <div className="lg:hidden">
        {!mobileExpanded ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wide block">Start</span>
                <span className="text-slate-700">{plan.startDate.year}-{String(plan.startDate.month).padStart(2, "0")}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wide block">Horizon</span>
                <span className="text-slate-700">{plan.horizonYears} yrs</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wide block">Cash</span>
                <span className="text-slate-700">{fmt(plan.startingCash)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wide block">Mortgage</span>
                <span className="text-slate-700">{pct(plan.baseMarket.mortgageRate)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wide block">Appreciation</span>
                <span className="text-slate-700">{pct(plan.baseMarket.annualAppreciation)}/yr</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wide block">Vacancy</span>
                <span className="text-slate-700">{pct(plan.baseMarket.vacancyRate)}</span>
              </div>
            </div>
            {!readOnly && (
              <button
                onClick={() => setMobileExpanded(true)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 min-h-[44px]"
              >
                Edit Plan
              </button>
            )}
          </div>
        ) : (
          <div>
            <PlanFields plan={plan} onChange={onChange} readOnly={readOnly} />
            <button
              onClick={() => setMobileExpanded(false)}
              className="mt-3 w-full rounded bg-slate-800 px-3 py-2.5 text-xs font-medium text-white min-h-[44px]"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Desktop: always show full fields */}
      <div className="hidden lg:block">
        <PlanFields plan={plan} onChange={onChange} readOnly={readOnly} />
      </div>
    </>
  );
}
