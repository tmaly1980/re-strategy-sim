"use client";

import type { PlanVariant } from "@/advisory/types";

interface Props {
  variants: PlanVariant[];
  selectedVariantId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function PlanVariantSelector({
  variants,
  selectedVariantId,
  onSelect,
  onDelete,
  onRename,
}: Props) {
  if (variants.length <= 1) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Plan Variants</h3>
      <div className="space-y-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
              v.id === selectedVariantId
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
            onClick={() => onSelect(v.id)}
          >
            <input
              className="flex-1 bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              value={v.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onRename(v.id, e.target.value)}
            />
            {v.isOriginal && (
              <span className="text-xs text-slate-400 shrink-0">Original</span>
            )}
            {!v.isOriginal && (
              <button
                className="text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(v.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        The original plan is never modified. Switch back at any time.
      </p>
    </div>
  );
}
