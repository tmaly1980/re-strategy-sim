"use client";

import type { ValidationIssue, ValidationSeverity } from "@/validation/types";

interface Props {
  issues: ValidationIssue[];
}

function worstSeverity(issues: ValidationIssue[]): ValidationSeverity | null {
  if (issues.some((i) => i.severity === "error")) return "error";
  if (issues.some((i) => i.severity === "warning")) return "warning";
  if (issues.some((i) => i.severity === "info")) return "info";
  return null;
}

export function ValidationBadge({ issues }: Props) {
  if (issues.length === 0) return null;

  const severity = worstSeverity(issues);

  const styles: Record<NonNullable<typeof severity>, string> = {
    error: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-600 border-blue-200",
  };

  const icons: Record<NonNullable<typeof severity>, string> = {
    error: "✕",
    warning: "⚠",
    info: "●",
  };

  if (!severity) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[10px] font-medium leading-none ${styles[severity]}`}
      title={`${issues.length} validation ${issues.length === 1 ? "issue" : "issues"}`}
    >
      <span>{icons[severity]}</span>
      <span>{issues.length}</span>
    </span>
  );
}
