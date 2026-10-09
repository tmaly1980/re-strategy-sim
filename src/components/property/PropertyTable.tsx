"use client";

import { useState } from "react";
import type { PropertyOpportunity, SimulationResult } from "@/simulation/types";
import { simDateLabel } from "@/simulation/types";
import { nanoid } from "@/lib/nanoid";
import { PropertyEditor } from "./PropertyEditor";
import type { ValidationIssue } from "@/validation/types";
import { ValidationBadge } from "@/components/validation/ValidationBadge";

interface Props {
  properties: PropertyOpportunity[];
  selectedResult?: SimulationResult;
  validationIssues?: ValidationIssue[];
  onChange: (properties: PropertyOpportunity[]) => void;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
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

export function PropertyTable({ properties, selectedResult, validationIssues = [], onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function update(idx: number, p: PropertyOpportunity) {
    const next = [...properties];
    next[idx] = p;
    onChange(next);
  }
  function remove(idx: number) {
    onChange(properties.filter((_, i) => i !== idx));
    setEditingId(null);
  }
  function addNew() {
    const p = defaultProperty();
    onChange([...properties, p]);
    setEditingId(p.id);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
        <button
          onClick={addNew}
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

      {/* Column headers — desktop only, shown when rows exist and nothing is editing */}
      {properties.length > 0 && (
        <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 px-3 mb-0.5">
          {["Name", "Price", "Rent/mo", "Down", "Available", "Purchased", "Sold", "Equity", ""].map((h, i) => (
            <div key={i} className="px-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide truncate">
              {h}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {properties.map((prop, idx) => {
          const outcome = selectedResult?.propertyOutcomes.find((o) => o.opportunityId === prop.id);
          const isEditing = editingId === prop.id;

          if (isEditing) {
            return (
              <PropertyEditor
                key={prop.id}
                prop={prop}
                outcome={outcome}
                validationIssues={validationIssues.filter((i) => i.entityId === prop.id)}
                onUpdate={(p) => update(idx, p)}
                onDone={() => setEditingId(null)}
                onDelete={() => remove(idx)}
              />
            );
          }

          return (
            <div
              key={prop.id}
              className="flex items-center gap-0 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
            >
              {/* Desktop: horizontal table row */}
              <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] w-full items-center gap-0 divide-x divide-slate-100">
                <Cell>
                  <span className="font-medium text-slate-800 truncate">{prop.name}</span>
                  {validationIssues.filter((i) => i.entityId === prop.id).length > 0 && (
                    <span className="ml-1.5">
                      <ValidationBadge issues={validationIssues.filter((i) => i.entityId === prop.id)} />
                    </span>
                  )}
                </Cell>
                <Cell>{fmt(prop.purchasePrice)}</Cell>
                <Cell>{fmt(prop.monthlyRent)}<span className="text-slate-400">/mo</span></Cell>
                <Cell>{(prop.downPaymentPct * 100).toFixed(0)}%</Cell>
                <Cell>{simDateLabel(prop.earliestPurchaseDate)}</Cell>
                <Cell>
                  {outcome?.purchasedDate
                    ? simDateLabel(outcome.purchasedDate)
                    : <span className="text-slate-300">—</span>}
                </Cell>
                <Cell>
                  {outcome?.soldDate
                    ? simDateLabel(outcome.soldDate)
                    : <span className="text-slate-300">—</span>}
                </Cell>
                <Cell>
                  {outcome?.equity != null
                    ? fmt(outcome.equity)
                    : <span className="text-slate-300">—</span>}
                </Cell>
                <div className="px-3 py-2 flex items-center">
                  <button
                    onClick={() => setEditingId(prop.id)}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Mobile: compact card */}
              <div className="sm:hidden w-full p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-sm">{prop.name}</span>
                  <button
                    onClick={() => setEditingId(prop.id)}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  <span>{fmt(prop.purchasePrice)}</span>
                  <span>{fmt(prop.monthlyRent)}/mo</span>
                  <span>{(prop.downPaymentPct * 100).toFixed(0)}% down</span>
                  {outcome?.purchasedDate && <span>bought {simDateLabel(outcome.purchasedDate)}</span>}
                  {outcome?.soldDate && <span>sold {simDateLabel(outcome.soldDate)}</span>}
                  {outcome?.equity != null && <span>equity {fmt(outcome.equity)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs text-slate-600 tabular-nums truncate">
      {children}
    </div>
  );
}

