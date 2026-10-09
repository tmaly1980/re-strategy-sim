"use client";

import type { PropertyOpportunity, SimDate } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";
import { nanoid } from "@/lib/nanoid";
import { Tooltip } from "./Tooltip";

interface Props {
  properties: PropertyOpportunity[];
  onChange: (properties: PropertyOpportunity[]) => void;
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

function defaultProperty(): PropertyOpportunity {
  return {
    id: nanoid(),
    name: "New Property",
    earliestPurchaseDate: { year: 2027, month: 1 },
    purchasePrice: 300_000,
    monthlyRent: 2_000,
    downPaymentPct: 0.20,
    fixedMortgageRate: 0.07,
    mortgageTermYears: 30,
    closingCostPct: 0.03,
    minReserveCash: 15_000,
    minHoldYears: 10,
  };
}

function PropertyRow({
  prop,
  onUpdate,
  onDelete,
}: {
  prop: PropertyOpportunity;
  onUpdate: (p: PropertyOpportunity) => void;
  onDelete: () => void;
}) {
  function set<K extends keyof PropertyOpportunity>(key: K, val: PropertyOpportunity[K]) {
    onUpdate({ ...prop, [key]: val });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <input
          className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none w-48"
          value={prop.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <button
          onClick={onDelete}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <div>
          <p className={labelCls}>
            Available from
            <Tooltip text="The earliest month the simulator will attempt to purchase this property. The simulator waits until this date before evaluating the acquisition." />
          </p>
          <input
            type="month"
            className={inputCls}
            value={dateStr(prop.earliestPurchaseDate)}
            onChange={(e) => {
              const d = parseDate(e.target.value);
              if (d) set("earliestPurchaseDate", d);
            }}
          />
        </div>

        <div>
          <p className={labelCls}>
            Latest purchase
            <Tooltip text="Optional deadline. If the property hasn't been purchased by this month, the opportunity expires and is marked as missed." />
          </p>
          <input
            type="month"
            className={inputCls}
            value={prop.latestPurchaseDate ? dateStr(prop.latestPurchaseDate) : ""}
            placeholder="none"
            onChange={(e) => {
              const d = parseDate(e.target.value);
              set("latestPurchaseDate", d ?? undefined);
            }}
          />
        </div>

        <div>
          <p className={labelCls}>
            Price ($)
            <Tooltip text="Total purchase price of the property. The down payment and closing costs are calculated as percentages of this amount." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={prop.purchasePrice}
            step={5000}
            onChange={(e) => set("purchasePrice", Number(e.target.value))}
          />
        </div>

        <div>
          <p className={labelCls}>
            Monthly rent ($)
            <Tooltip text="Starting gross monthly rent. This grows each month at the rent growth rate set in the base market (or active market event)." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={prop.monthlyRent}
            step={50}
            onChange={(e) => set("monthlyRent", Number(e.target.value))}
          />
        </div>

        <div>
          <p className={labelCls}>
            Down payment (%)
            <Tooltip text="Percentage of the purchase price paid as a down payment. The remainder is financed via mortgage. Must be paid from available cash at acquisition." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={(prop.downPaymentPct * 100).toFixed(0)}
            step={1}
            min={3}
            max={100}
            onChange={(e) => set("downPaymentPct", Number(e.target.value) / 100)}
          />
        </div>

        <div>
          <p className={labelCls}>
            Mortgage rate (%)
            <Tooltip text="Fixed annual interest rate for this property's mortgage. Leave blank to use the market rate at time of purchase (from base market or active event)." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={
              prop.fixedMortgageRate !== null
                ? (prop.fixedMortgageRate * 100).toFixed(2)
                : ""
            }
            placeholder="market"
            step={0.1}
            onChange={(e) => {
              const v = e.target.value;
              set("fixedMortgageRate", v === "" ? null : Number(v) / 100);
            }}
          />
        </div>

        <div>
          <p className={labelCls}>
            Closing cost (%)
            <Tooltip text="One-time costs at purchase as a percentage of price (title, escrow, lender fees, etc.). Deducted from cash alongside the down payment." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={(prop.closingCostPct * 100).toFixed(1)}
            step={0.5}
            onChange={(e) => set("closingCostPct", Number(e.target.value) / 100)}
          />
        </div>

        <div>
          <p className={labelCls}>
            Min. reserve ($)
            <Tooltip text="Minimum cash the investor must retain after purchasing this property. Acquisition is blocked if the purchase would leave cash below this threshold." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={prop.minReserveCash}
            step={1000}
            onChange={(e) => set("minReserveCash", Number(e.target.value))}
          />
        </div>

        <div>
          <p className={labelCls}>
            Min. hold (years)
            <Tooltip text="Minimum number of years to hold the property before it can be sold. The simulator won't trigger a sale until this period has elapsed." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={prop.minHoldYears}
            step={1}
            min={0}
            onChange={(e) => set("minHoldYears", Number(e.target.value))}
          />
        </div>

        <div>
          <p className={labelCls}>
            Sell at equity (%)
            <Tooltip text="Sell the property once equity reaches this percentage of its current value. Leave blank to hold indefinitely (or sell at end of horizon). Requires min. hold to have elapsed." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={
              prop.sellWhenEquityPct !== undefined
                ? (prop.sellWhenEquityPct * 100).toFixed(0)
                : ""
            }
            placeholder="never"
            step={5}
            onChange={(e) => {
              const v = e.target.value;
              set("sellWhenEquityPct", v === "" ? undefined : Number(v) / 100);
            }}
          />
        </div>

        <div>
          <p className={labelCls}>
            Op. expense (%)
            <Tooltip text="Property-level operating expenses as a percentage of effective rent. Overrides the plan-level default. Covers management, maintenance, insurance, property taxes." />
          </p>
          <input
            type="number"
            className={inputCls}
            value={
              prop.operatingExpensePct !== undefined
                ? (prop.operatingExpensePct * 100).toFixed(0)
                : ""
            }
            placeholder="default"
            step={1}
            onChange={(e) => {
              const v = e.target.value;
              set("operatingExpensePct", v === "" ? undefined : Number(v) / 100);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function PropertyList({ properties, onChange }: Props) {
  function add() {
    onChange([...properties, defaultProperty()]);
  }

  function update(idx: number, p: PropertyOpportunity) {
    const next = [...properties];
    next[idx] = p;
    onChange(next);
  }

  function remove(idx: number) {
    onChange(properties.filter((_, i) => i !== idx));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
        <button
          onClick={add}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          + Add Property
        </button>
      </div>
      {properties.length === 0 && (
        <p className="text-xs text-slate-400 py-4">
          No properties yet. Add one to start the simulation.
        </p>
      )}
      <div className="space-y-3">
        {properties.map((p, i) => (
          <PropertyRow
            key={p.id}
            prop={p}
            onUpdate={(updated) => update(i, updated)}
            onDelete={() => remove(i)}
          />
        ))}
      </div>
    </section>
  );
}
