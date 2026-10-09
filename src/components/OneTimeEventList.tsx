"use client";

import type { OneTimeEvent, OneTimeEventType, SimDate } from "@/simulation/types";
import { nanoid } from "@/lib/nanoid";
import { Tooltip } from "./Tooltip";

interface Props {
  events: OneTimeEvent[];
  onChange: (events: OneTimeEvent[]) => void;
}

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "text-xs text-slate-400 mb-0.5";

function parseDate(s: string): SimDate | null {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

function dateStr(d: SimDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}`;
}

const TYPE_LABELS: Record<OneTimeEventType, string> = {
  propertyValueShock: "Property value shock (%)",
  expenseShock: "Expense shock ($ per property)",
  rentShock: "Rent shock (%)",
};

const TYPE_NOTES: Record<OneTimeEventType, string> = {
  propertyValueShock: "e.g. -20 for −20%",
  expenseShock: "e.g. 12000 per property",
  rentShock: "e.g. 8 for +8%",
};

function defaultEvent(): OneTimeEvent {
  return {
    id: nanoid(),
    name: "New One-Time Event",
    date: { year: 2031, month: 6 },
    type: "propertyValueShock",
    magnitude: -0.20,
  };
}

function EventRow({
  event,
  onUpdate,
  onDelete,
}: {
  event: OneTimeEvent;
  onUpdate: (e: OneTimeEvent) => void;
  onDelete: () => void;
}) {
  const isPercent =
    event.type === "propertyValueShock" || event.type === "rentShock";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <input
          className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none w-56"
          value={event.name}
          onChange={(e) => onUpdate({ ...event, name: e.target.value })}
        />
        <button
          onClick={onDelete}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div>
          <p className={labelCls}>
            Date
            <Tooltip text="The exact month this event fires. It applies once in that month and does not repeat." />
          </p>
          <input
            type="month"
            className={inputCls}
            value={dateStr(event.date)}
            onChange={(e) => {
              const d = parseDate(e.target.value);
              if (d) onUpdate({ ...event, date: d });
            }}
          />
        </div>

        <div>
          <p className={labelCls}>
            Type
            <Tooltip text="Property value shock: multiplies all owned property values instantly. Expense shock: deducts a flat dollar amount per owned property from cash. Rent shock: multiplies all current rents instantly." />
          </p>
          <select
            className={inputCls}
            value={event.type}
            onChange={(e) =>
              onUpdate({ ...event, type: e.target.value as OneTimeEventType })
            }
          >
            <option value="propertyValueShock">Property value shock</option>
            <option value="expenseShock">Expense shock</option>
            <option value="rentShock">Rent shock</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <p className={labelCls}>
            {TYPE_LABELS[event.type]}{" "}
            <span className="text-slate-300">— {TYPE_NOTES[event.type]}</span>
          </p>
          <input
            type="number"
            className={inputCls}
            value={isPercent ? (event.magnitude * 100).toFixed(1) : event.magnitude}
            step={isPercent ? 1 : 1000}
            onChange={(e) =>
              onUpdate({
                ...event,
                magnitude: isPercent
                  ? Number(e.target.value) / 100
                  : Number(e.target.value),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function OneTimeEventList({ events, onChange }: Props) {
  function add() {
    onChange([...events, defaultEvent()]);
  }
  function update(idx: number, e: OneTimeEvent) {
    const next = [...events];
    next[idx] = e;
    onChange(next);
  }
  function remove(idx: number) {
    onChange(events.filter((_, i) => i !== idx));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">One-Time Events</h2>
        <button
          onClick={add}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          + Add Event
        </button>
      </div>
      {events.length === 0 && (
        <p className="text-xs text-slate-400 py-2">No one-time events.</p>
      )}
      <div className="space-y-3">
        {events.map((e, i) => (
          <EventRow
            key={e.id}
            event={e}
            onUpdate={(updated) => update(i, updated)}
            onDelete={() => remove(i)}
          />
        ))}
      </div>
    </section>
  );
}
