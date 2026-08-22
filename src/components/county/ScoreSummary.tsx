"use client";

import type { NoScoreReason, PlanningLabel } from "@/types/county";
import { getPlanningLabelDisplayText } from "@/lib/scoring/labels";
import { noScoreReasonText } from "@/lib/scoring/gates";

type IndicatorSummaryProps = {
  title: string;
  score: number | null;
  label: PlanningLabel | null;
  noScoreReason?: NoScoreReason | null;
  subtitle?: string;
};

export function IndicatorSummary({
  title,
  score,
  label,
  noScoreReason,
  subtitle,
}: IndicatorSummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">
          {score !== null ? score : "—"}
        </span>
        {score !== null && <span className="text-sm text-slate-500">/100</span>}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-700">
        {label ?? (noScoreReason === "missing_components" ? "Withheld" : "Unavailable")}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {score !== null
          ? getPlanningLabelDisplayText(label as PlanningLabel)
          : noScoreReasonText(noScoreReason ?? "unavailable")}
      </p>
      {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
