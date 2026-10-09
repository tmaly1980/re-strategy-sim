"use client";

import type { PropertyOpportunity, PropertyOutcome, SimDate } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";
import { Tooltip } from "../Tooltip";
import type { ValidationIssue } from "@/validation/types";
import { ValidationMessages } from "@/components/validation/ValidationMessages";

interface Props {
  prop: PropertyOpportunity;
  outcome?: PropertyOutcome;
  validationIssues?: ValidationIssue[];
  onUpdate: (p: PropertyOpportunity) => void;
  onDone: () => void;
  onDelete: () => void;
}

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-2 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]";
const labelCls = "text-xs text-slate-400 mb-0.5 flex items-center gap-0.5";

function parseDate(s: string): SimDate | null {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}
function dateStr(d: SimDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}


export function PropertyEditor({ prop, outcome, validationIssues = [], onUpdate, onDone, onDelete }: Props) {
  function set<K extends keyof PropertyOpportunity>(key: K, val: PropertyOpportunity[K]) {
    onUpdate({ ...prop, [key]: val });
  }

  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4">
      {validationIssues.some((i) => i.severity === "error") && (
        <div className="mb-3">
          <ValidationMessages issues={validationIssues.filter((i) => i.severity === "error")} />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <input
          className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none w-48"
          value={prop.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Property name"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (confirm(`Delete "${prop.name}"? This cannot be undone.`)) onDelete(); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onDone}
            className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <div>
          <p className={labelCls}>
            Available from
            <Tooltip text="Earliest month the simulator will try to purchase." />
          </p>
          <input type="month" className={inputCls} value={dateStr(prop.earliestPurchaseDate)}
            onChange={(e) => { const d = parseDate(e.target.value); if (d) set("earliestPurchaseDate", d); }} />
        </div>
        <div>
          <p className={labelCls}>
            Latest purchase
            <Tooltip text="Optional deadline. Opportunity expires if not purchased by then." />
          </p>
          <input type="month" className={inputCls}
            value={prop.latestPurchaseDate ? dateStr(prop.latestPurchaseDate) : ""}
            placeholder="none"
            onChange={(e) => { const d = parseDate(e.target.value); set("latestPurchaseDate", d ?? undefined); }} />
        </div>
        <div>
          <p className={labelCls}>
            Price ($)
            <Tooltip text="Total purchase price." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls} value={prop.purchasePrice} step={5000}
            onChange={(e) => set("purchasePrice", Number(e.target.value))} />
        </div>
        <div>
          <p className={labelCls}>
            Monthly rent ($)
            <Tooltip text="Starting gross monthly rent." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls} value={prop.monthlyRent} step={50}
            onChange={(e) => set("monthlyRent", Number(e.target.value))} />
        </div>
        <div>
          <p className={labelCls}>
            Down payment %
            <Tooltip text="Percentage of price paid upfront." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls}
            value={(prop.downPaymentPct * 100).toFixed(0)} step={1} min={3} max={100}
            onChange={(e) => set("downPaymentPct", Number(e.target.value) / 100)} />
        </div>
        <div>
          <p className={labelCls}>
            Mortgage rate %
            <Tooltip text="Fixed rate. Leave blank to use market rate at purchase." />
          </p>
          <input type="number" inputMode="decimal" className={inputCls}
            value={prop.fixedMortgageRate !== null ? (prop.fixedMortgageRate * 100).toFixed(2) : ""}
            placeholder="market" step={0.1}
            onChange={(e) => { const v = e.target.value; set("fixedMortgageRate", v === "" ? null : Number(v) / 100); }} />
        </div>
        <div>
          <p className={labelCls}>
            Term (yrs)
            <Tooltip text="Mortgage amortization period in years." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls} value={prop.mortgageTermYears} step={5} min={10} max={30}
            onChange={(e) => set("mortgageTermYears", Number(e.target.value))} />
        </div>
        <div>
          <p className={labelCls}>
            Closing cost %
            <Tooltip text="One-time purchase costs as % of price." />
          </p>
          <input type="number" inputMode="decimal" className={inputCls}
            value={(prop.closingCostPct * 100).toFixed(1)} step={0.5}
            onChange={(e) => set("closingCostPct", Number(e.target.value) / 100)} />
        </div>
        <div>
          <p className={labelCls}>
            Min. reserve ($)
            <Tooltip text="Cash must stay above this after purchase." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls} value={prop.minReserveCash} step={1000}
            onChange={(e) => set("minReserveCash", Number(e.target.value))} />
        </div>
        <div>
          <p className={labelCls}>
            Min. hold (yrs)
            <Tooltip text="Minimum years before property can be sold." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls} value={prop.minHoldYears} step={1} min={0}
            onChange={(e) => set("minHoldYears", Number(e.target.value))} />
        </div>
        <div>
          <p className={labelCls}>
            Sell at equity %
            <Tooltip text="Trigger sale when equity reaches this % of value. Leave blank to hold." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls}
            value={prop.sellWhenEquityPct !== undefined ? (prop.sellWhenEquityPct * 100).toFixed(0) : ""}
            placeholder="never" step={5}
            onChange={(e) => { const v = e.target.value; set("sellWhenEquityPct", v === "" ? undefined : Number(v) / 100); }} />
          {outcome?.soldDate && (
            <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">Projected sell: {simDateLabel(outcome.soldDate)}</p>
          )}
          <ValidationMessages issues={validationIssues.filter((i) => i.path === "sellWhenEquityPct" || i.path === "minHoldYears")} />
        </div>
        <div>
          <p className={labelCls}>
            Op. expense %
            <Tooltip text="Overrides default op. expense for this property." />
          </p>
          <input type="number" inputMode="numeric" className={inputCls}
            value={prop.operatingExpensePct !== undefined ? (prop.operatingExpensePct * 100).toFixed(0) : ""}
            placeholder="default" step={1}
            onChange={(e) => { const v = e.target.value; set("operatingExpensePct", v === "" ? undefined : Number(v) / 100); }} />
        </div>
      </div>
    </div>
  );
}
