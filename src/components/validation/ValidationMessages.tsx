"use client";

import { useState } from "react";
import type { ValidationIssue, ValidationSeverity } from "@/validation/types";

interface Props {
  issues: ValidationIssue[];
}

const SEVERITY_ORDER: ValidationSeverity[] = ["error", "warning", "info"];

const STYLES: Record<ValidationSeverity, { container: string; icon: string }> = {
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: "✕",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "⚠",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-700",
    icon: "ℹ",
  },
};

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const [expanded, setExpanded] = useState(false);
  const style = STYLES[issue.severity];

  return (
    <div className={`rounded border px-2.5 py-1.5 text-xs ${style.container}`}>
      <div className="flex items-start gap-1.5">
        <span className="shrink-0 font-bold mt-px">{style.icon}</span>
        <span className="flex-1 leading-snug">{issue.message}</span>
        {issue.details && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-[10px] opacity-60 hover:opacity-100 transition-opacity underline"
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </div>
      {expanded && issue.details && (
        <p className="mt-1.5 ml-5 text-[11px] opacity-80 leading-relaxed">{issue.details}</p>
      )}
    </div>
  );
}

export function ValidationMessages({ issues }: Props) {
  if (issues.length === 0) return null;

  const sorted = [...issues].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="space-y-1">
      {sorted.map((issue) => (
        <IssueRow key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
