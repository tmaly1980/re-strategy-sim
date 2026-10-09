"use client";

import { useState } from "react";
import type { MarketTimeline, MarketEvent, OneTimeEvent } from "@/simulation/types";
import type { Recommendation } from "@/advisory/types";
import { nanoid } from "@/lib/nanoid";
import { MarketEventRow, MarketEventEditor } from "./MarketEventRow";
import { OneTimeEventRow, OneTimeEventEditor } from "./OneTimeEventRow";
import { RecommendationRow } from "../advisory/RecommendationRow";
import type { ValidationIssue } from "@/validation/types";
import { ValidationBadge } from "@/components/validation/ValidationBadge";
import { ValidationMessages } from "@/components/validation/ValidationMessages";

interface Props {
  timeline: MarketTimeline;
  recommendations: Recommendation[];
  validationIssues?: ValidationIssue[];
  onUpdate: (t: MarketTimeline) => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  onAcceptRec: (id: string) => void;
  onRejectRec: (id: string) => void;
  onCreateVariant: () => void;
  hasVariant: boolean;
}

function defaultMarketEvent(): MarketEvent {
  return {
    id: nanoid(), name: "New Market Event",
    startDate: { year: 2030, month: 1 },
    endDate: { year: 2032, month: 12 },
  };
}
function defaultOneTimeEvent(): OneTimeEvent {
  return {
    id: nanoid(), name: "New One-Time Event",
    date: { year: 2031, month: 6 },
    type: "propertyValueShock",
    magnitude: -0.20,
  };
}

export function TimelineWorkspace({
  timeline,
  recommendations,
  validationIssues = [],
  onUpdate,
  onRename,
  onDuplicate,
  onDelete,
  canDelete,
  onAcceptRec,
  onRejectRec,
  onCreateVariant,
  hasVariant,
}: Props) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingShockId, setEditingShockId] = useState<string | null>(null);

  function updateEvent(idx: number, e: MarketEvent) {
    const next = [...timeline.marketEvents];
    next[idx] = e;
    onUpdate({ ...timeline, marketEvents: next });
  }
  function removeEvent(idx: number) {
    onUpdate({ ...timeline, marketEvents: timeline.marketEvents.filter((_, i) => i !== idx) });
    setEditingEventId(null);
  }
  function addEvent() {
    const e = defaultMarketEvent();
    onUpdate({ ...timeline, marketEvents: [...timeline.marketEvents, e] });
    setEditingEventId(e.id);
  }

  function updateShock(idx: number, e: OneTimeEvent) {
    const next = [...timeline.oneTimeEvents];
    next[idx] = e;
    onUpdate({ ...timeline, oneTimeEvents: next });
  }
  function removeShock(idx: number) {
    onUpdate({ ...timeline, oneTimeEvents: timeline.oneTimeEvents.filter((_, i) => i !== idx) });
    setEditingShockId(null);
  }
  function addShock() {
    const e = defaultOneTimeEvent();
    onUpdate({ ...timeline, oneTimeEvents: [...timeline.oneTimeEvents, e] });
    setEditingShockId(e.id);
  }

  const visibleRecs = recommendations.filter((r) => r.status !== "rejected");
  const acceptedCount = recommendations.filter((r) => r.status === "accepted").length;

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-slate-200 bg-white p-4 space-y-4">
      {/* Timeline header */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="rounded border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={timeline.name}
          onChange={(e) => onRename(e.target.value)}
        />
        {validationIssues.length > 0 && <ValidationBadge issues={validationIssues} />}
        <button onClick={onDuplicate} className="text-xs text-slate-400 hover:text-blue-600 transition-colors">Duplicate</button>
        {canDelete && (
          <button onClick={() => { if (confirm(`Delete "${timeline.name}"?`)) onDelete(); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Delete</button>
        )}
      </div>
      {validationIssues.filter((i) => i.scope === "timeline").length > 0 && (
        <ValidationMessages issues={validationIssues.filter((i) => i.scope === "timeline")} />
      )}

      {/* Market Events */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-600">Market Conditions</p>
          <button onClick={addEvent} className="text-xs text-blue-600 hover:underline">+ Add event</button>
        </div>
        {timeline.marketEvents.length === 0 && (
          <p className="text-xs text-slate-400 py-1">No market events. Base conditions apply throughout.</p>
        )}
        <div className="space-y-1.5">
          {timeline.marketEvents.map((e, idx) =>
            editingEventId === e.id ? (
              <MarketEventEditor
                key={e.id}
                event={e}
                onUpdate={(updated) => updateEvent(idx, updated)}
                onDone={() => setEditingEventId(null)}
                onDelete={() => removeEvent(idx)}
              />
            ) : (
              <MarketEventRow
                key={e.id}
                event={e}
                validationIssues={validationIssues.filter((i) => i.entityId === e.id)}
                onEdit={() => setEditingEventId(e.id)}
                onDelete={() => removeEvent(idx)}
              />
            )
          )}
        </div>
      </div>

      {/* One-Time Events */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-600">One-Time Shocks</p>
          <button onClick={addShock} className="text-xs text-blue-600 hover:underline">+ Add shock</button>
        </div>
        {timeline.oneTimeEvents.length === 0 && (
          <p className="text-xs text-slate-400 py-1">No one-time events.</p>
        )}
        <div className="space-y-1.5">
          {timeline.oneTimeEvents.map((e, idx) =>
            editingShockId === e.id ? (
              <OneTimeEventEditor
                key={e.id}
                event={e}
                onUpdate={(updated) => updateShock(idx, updated)}
                onDone={() => setEditingShockId(null)}
                onDelete={() => removeShock(idx)}
              />
            ) : (
              <OneTimeEventRow
                key={e.id}
                event={e}
                onEdit={() => setEditingShockId(e.id)}
                onDelete={() => removeShock(idx)}
              />
            )
          )}
        </div>
      </div>

      {/* Advisory */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600">
            Advisory — {timeline.name}
          </p>
          <p className="text-[10px] text-slate-400 italic">Scenario analysis only</p>
        </div>

        {visibleRecs.length === 0 ? (
          <p className="text-xs text-slate-400">No recommendations for this timeline.</p>
        ) : (
          <div className="space-y-3">
            {visibleRecs.map((rec) => (
              <RecommendationRow
                key={rec.id}
                rec={rec}
                onAccept={() => onAcceptRec(rec.id)}
                onReject={() => onRejectRec(rec.id)}
              />
            ))}
          </div>
        )}

        {acceptedCount > 0 && !hasVariant && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              onClick={onCreateVariant}
              className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Create Recommended Plan ({acceptedCount} accepted)
            </button>
          </div>
        )}
        {hasVariant && acceptedCount > 0 && (
          <p className="mt-2 text-[10px] text-slate-400">Recommended plan created. See Plan Comparison below.</p>
        )}
      </div>
    </div>
  );
}
