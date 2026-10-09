"use client";

import type { OneTimeEvent, OneTimeEventType, SimDate } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";
import { Tooltip } from "../Tooltip";

interface RowProps {
  event: OneTimeEvent;
  onEdit: () => void;
  onDelete: () => void;
}

interface EditorProps {
  event: OneTimeEvent;
  onUpdate: (e: OneTimeEvent) => void;
  onDone: () => void;
  onDelete: () => void;
}

function magnitudeLabel(event: OneTimeEvent): string {
  if (event.type === "expenseShock") return `$${Math.round(event.magnitude).toLocaleString()}/property`;
  const pct = (event.magnitude * 100).toFixed(1);
  return event.magnitude >= 0 ? `+${pct}%` : `${pct}%`;
}

const TYPE_SHORT: Record<OneTimeEventType, string> = {
  propertyValueShock: "Value shock",
  expenseShock: "Expense shock",
  rentShock: "Rent shock",
};

export function OneTimeEventRow({ event, onEdit, onDelete }: RowProps) {
  return (
    <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-xs hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-medium text-slate-700 truncate">{event.name}</span>
        <span className="text-slate-400 whitespace-nowrap">{simDateLabel(event.date)}</span>
        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium text-[10px] whitespace-nowrap">
          {TYPE_SHORT[event.type]} {magnitudeLabel(event)}
        </span>
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

const TYPE_LABELS: Record<OneTimeEventType, string> = {
  propertyValueShock: "Property value shock (%)",
  expenseShock: "Expense shock ($ per property)",
  rentShock: "Rent shock (%)",
};

export function OneTimeEventEditor({ event, onUpdate, onDone, onDelete }: EditorProps) {
  const isPercent = event.type === "propertyValueShock" || event.type === "rentShock";

  return (
    <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
      <div className="flex items-center justify-between mb-3">
        <input
          className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none w-56"
          value={event.name}
          onChange={(e) => onUpdate({ ...event, name: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <button onClick={() => { if (confirm(`Delete "${event.name}"?`)) onDelete(); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Delete</button>
          <button onClick={onDone} className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700">Done</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div>
          <p className={labelCls}>Date <Tooltip text="Month this event fires (once)." /></p>
          <input type="month" className={inputCls} value={dateStr(event.date)}
            onChange={(e) => { const d = parseDate(e.target.value); if (d) onUpdate({ ...event, date: d }); }} />
        </div>
        <div>
          <p className={labelCls}>Type <Tooltip text="Value shock: multiplies all property values. Expense: deducts flat $ per property. Rent: multiplies all rents." /></p>
          <select className={inputCls} value={event.type}
            onChange={(e) => onUpdate({ ...event, type: e.target.value as OneTimeEventType })}>
            <option value="propertyValueShock">Property value shock</option>
            <option value="expenseShock">Expense shock</option>
            <option value="rentShock">Rent shock</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <p className={labelCls}>{TYPE_LABELS[event.type]}</p>
          <input type="number" inputMode="decimal" className={inputCls}
            value={isPercent ? (event.magnitude * 100).toFixed(1) : event.magnitude}
            step={isPercent ? 1 : 1000}
            onChange={(e) => onUpdate({ ...event, magnitude: isPercent ? Number(e.target.value) / 100 : Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}
