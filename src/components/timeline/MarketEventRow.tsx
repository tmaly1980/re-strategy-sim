"use client";

import type { MarketEvent, SimDate } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";
import { Tooltip } from "../Tooltip";
import type { ValidationIssue } from "@/validation/types";
import { ValidationBadge } from "@/components/validation/ValidationBadge";

interface RowProps {
  event: MarketEvent;
  validationIssues?: ValidationIssue[];
  onEdit: () => void;
  onDelete: () => void;
}

interface EditorProps {
  event: MarketEvent;
  onUpdate: (e: MarketEvent) => void;
  onDone: () => void;
  onDelete: () => void;
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function sign(n: number) { return n >= 0 ? `+${pct(n)}` : pct(n); }

// Compact summary chips for the fields that are set
function chips(event: MarketEvent) {
  const items: string[] = [];
  if (event.annualAppreciation !== undefined) items.push(`Appr. ${sign(event.annualAppreciation)}`);
  if (event.annualRentGrowth !== undefined) items.push(`Rent ${sign(event.annualRentGrowth)}`);
  if (event.vacancyRate !== undefined) items.push(`Vacancy ${pct(event.vacancyRate)}`);
  if (event.mortgageRate !== undefined) items.push(`Rate ${pct(event.mortgageRate)}`);
  if (event.operatingExpenseAdjustment !== undefined) items.push(`OpEx ${sign(event.operatingExpenseAdjustment)}`);
  return items;
}

export function MarketEventRow({ event, validationIssues = [], onEdit, onDelete }: RowProps) {
  return (
    <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-xs hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-700 truncate">{event.name}</span>
          {validationIssues.length > 0 && <ValidationBadge issues={validationIssues} />}
          <span className="text-slate-400 whitespace-nowrap">
            {simDateLabel(event.startDate)} – {simDateLabel(event.endDate)}
          </span>
          {chips(event).map((c, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium text-[10px] whitespace-nowrap">
              {c}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onEdit} className="text-slate-400 hover:text-blue-600 transition-colors shrink-0">✎</button>
      <button onClick={() => { if (confirm(`Delete "${event.name}"?`)) onDelete(); }} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">×</button>
    </div>
  );
}

const inputCls = "w-full rounded border border-slate-200 bg-white px-2 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]";
const labelCls = "text-xs text-slate-400 mb-0.5 flex items-center gap-0.5";

function parseDate(s: string): SimDate | null {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}
function dateStr(d: SimDate) { return `${d.year}-${String(d.month).padStart(2, "0")}`; }

export function MarketEventEditor({ event, onUpdate, onDone, onDelete }: EditorProps) {
  function set<K extends keyof MarketEvent>(key: K, val: MarketEvent[K]) {
    onUpdate({ ...event, [key]: val });
  }
  function setOpt(key: keyof MarketEvent, raw: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (set as any)(key, raw === "" ? undefined : Number(raw) / 100);
  }

  return (
    <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
      <div className="flex items-center justify-between mb-3">
        <input
          className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none w-56"
          value={event.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button onClick={() => { if (confirm(`Delete "${event.name}"?`)) onDelete(); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Delete</button>
          <button onClick={onDone} className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700">Done</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-7">
        <div>
          <p className={labelCls}>Start <Tooltip text="First month this event is active." /></p>
          <input type="month" className={inputCls} value={dateStr(event.startDate)}
            onChange={(e) => { const d = parseDate(e.target.value); if (d) set("startDate", d); }} />
        </div>
        <div>
          <p className={labelCls}>End <Tooltip text="Last month this event is active." /></p>
          <input type="month" className={inputCls} value={dateStr(event.endDate)}
            onChange={(e) => { const d = parseDate(e.target.value); if (d) set("endDate", d); }} />
        </div>
        <div>
          <p className={labelCls}>Appr. %/yr <Tooltip text="Overrides base appreciation. Leave blank to keep base." /></p>
          <input type="number" inputMode="decimal" className={inputCls} placeholder="base" step={0.5}
            value={event.annualAppreciation !== undefined ? (event.annualAppreciation * 100).toFixed(1) : ""}
            onChange={(e) => setOpt("annualAppreciation", e.target.value)} />
        </div>
        <div>
          <p className={labelCls}>Rent %/yr <Tooltip text="Overrides base rent growth." /></p>
          <input type="number" inputMode="decimal" className={inputCls} placeholder="base" step={0.5}
            value={event.annualRentGrowth !== undefined ? (event.annualRentGrowth * 100).toFixed(1) : ""}
            onChange={(e) => setOpt("annualRentGrowth", e.target.value)} />
        </div>
        <div>
          <p className={labelCls}>Vacancy % <Tooltip text="Overrides base vacancy rate." /></p>
          <input type="number" inputMode="decimal" className={inputCls} placeholder="base" step={1}
            value={event.vacancyRate !== undefined ? (event.vacancyRate * 100).toFixed(0) : ""}
            onChange={(e) => setOpt("vacancyRate", e.target.value)} />
        </div>
        <div>
          <p className={labelCls}>Mortgage % <Tooltip text="Rate for new loans during this event." /></p>
          <input type="number" inputMode="decimal" className={inputCls} placeholder="base" step={0.1}
            value={event.mortgageRate !== undefined ? (event.mortgageRate * 100).toFixed(2) : ""}
            onChange={(e) => setOpt("mortgageRate", e.target.value)} />
        </div>
        <div>
          <p className={labelCls}>OpEx adj. % <Tooltip text="Additive op. expense adjustment." /></p>
          <input type="number" inputMode="decimal" className={inputCls} placeholder="0" step={0.5}
            value={event.operatingExpenseAdjustment !== undefined ? (event.operatingExpenseAdjustment * 100).toFixed(1) : ""}
            onChange={(e) => setOpt("operatingExpenseAdjustment", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
