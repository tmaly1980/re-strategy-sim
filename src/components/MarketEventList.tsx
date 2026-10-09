"use client";

import type { MarketEvent, SimDate } from "@/simulation/types";
import { nanoid } from "@/lib/nanoid";
import { Tooltip } from "./Tooltip";

interface Props {
  events: MarketEvent[];
  onChange: (events: MarketEvent[]) => void;
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

function defaultEvent(): MarketEvent {
  return {
    id: nanoid(),
    name: "New Market Event",
    startDate: { year: 2030, month: 1 },
    endDate: { year: 2032, month: 12 },
  };
}

function EventRow({
  event,
  onUpdate,
  onDelete,
}: {
  event: MarketEvent;
  onUpdate: (e: MarketEvent) => void;
  onDelete: () => void;
}) {
  function set<K extends keyof MarketEvent>(key: K, val: MarketEvent[K]) {
    onUpdate({ ...event, [key]: val });
  }

  function setOpt(key: keyof MarketEvent, raw: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(key as any, raw === "" ? undefined : Number(raw));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <input
          className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none w-56"
          value={event.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <button
          onClick={onDelete}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        <div>
          <p className={labelCls}>
            Start
            <Tooltip text="The first month this event is active. On this month its overrides replace the base market values for affected attributes." />
          </p>
          <input
            type="month"
            className={inputCls}
            value={dateStr(event.startDate)}
            onChange={(e) => {
              const d = parseDate(e.target.value);
              if (d) set("startDate", d);
            }}
          />
        </div>
        <div>
          <p className={labelCls}>
            End
            <Tooltip text="The last month this event is active. The month after this, the attribute reverts to the base value (or an overlapping event's value)." />
          </p>
          <input
            type="month"
            className={inputCls}
            value={dateStr(event.endDate)}
            onChange={(e) => {
              const d = parseDate(e.target.value);
              if (d) set("endDate", d);
            }}
          />
        </div>
        <div>
          <p className={labelCls}>
            Appreciation (%/yr)
            <Tooltip text="Overrides the base annual property appreciation rate while this event is active. Leave blank to keep base rate. Negative values simulate price declines." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={event.annualAppreciation !== undefined ? (event.annualAppreciation * 100).toFixed(1) : ""}
            placeholder="base"
            step={0.5}
            onChange={(e) => setOpt("annualAppreciation", e.target.value === "" ? "" : String(Number(e.target.value) / 100))}
          />
        </div>
        <div>
          <p className={labelCls}>
            Rent growth (%/yr)
            <Tooltip text="Overrides the base annual rent growth rate during this event. Leave blank to keep base rate. Zero simulates a rent freeze; negative simulates declining rents." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={event.annualRentGrowth !== undefined ? (event.annualRentGrowth * 100).toFixed(1) : ""}
            placeholder="base"
            step={0.5}
            onChange={(e) => setOpt("annualRentGrowth", e.target.value === "" ? "" : String(Number(e.target.value) / 100))}
          />
        </div>
        <div>
          <p className={labelCls}>
            Vacancy (%)
            <Tooltip text="Overrides the base vacancy rate during this event. Higher vacancy means less effective rent collected. Leave blank to keep the base rate." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={event.vacancyRate !== undefined ? (event.vacancyRate * 100).toFixed(0) : ""}
            placeholder="base"
            step={1}
            onChange={(e) => setOpt("vacancyRate", e.target.value === "" ? "" : String(Number(e.target.value) / 100))}
          />
        </div>
        <div>
          <p className={labelCls}>
            Mortgage rate (%)
            <Tooltip text="Overrides the base mortgage rate for new property purchases during this event. Only affects properties acquired while the event is active." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={event.mortgageRate !== undefined ? (event.mortgageRate * 100).toFixed(2) : ""}
            placeholder="base"
            step={0.1}
            onChange={(e) => setOpt("mortgageRate", e.target.value === "" ? "" : String(Number(e.target.value) / 100))}
          />
        </div>
        <div>
          <p className={labelCls}>
            OpEx adj. (%)
            <Tooltip text="Additive adjustment to operating expenses during this event, as a percentage of effective rent. E.g. 5 means expenses rise by 5 percentage points above normal." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={event.operatingExpenseAdjustment !== undefined ? (event.operatingExpenseAdjustment * 100).toFixed(1) : ""}
            placeholder="0"
            step={0.5}
            onChange={(e) => setOpt("operatingExpenseAdjustment", e.target.value === "" ? "" : String(Number(e.target.value) / 100))}
          />
        </div>
      </div>
    </div>
  );
}

export function MarketEventList({ events, onChange }: Props) {
  function add() {
    onChange([...events, defaultEvent()]);
  }
  function update(idx: number, e: MarketEvent) {
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
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Market Conditions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Per attribute: the most recently <em>started</em> active event wins.
          </p>
        </div>
        <button
          onClick={add}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          + Add Event
        </button>
      </div>
      {events.length === 0 && (
        <p className="text-xs text-slate-400 py-2">
          No market events. Base conditions apply throughout.
        </p>
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
