"use client";

import type { OperationalContext } from "@/types/county";

type OperationalContextBarProps = {
  context: OperationalContext | null;
  loading?: boolean;
};

export function OperationalContextBar({ context, loading }: OperationalContextBarProps) {
  if (loading || !context) {
    return (
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        Loading statewide current conditions…
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700">
      <span className="font-semibold text-slate-800">Current conditions (operational context):</span>{" "}
      Weather stress {context.weatherStressScore}/100
      {context.weatherStressBasis ? ` (${context.weatherStressBasis})` : ""} · ERCO load context{" "}
      {context.statewideGridStrainScore}/100 · As of{" "}
      {new Date(context.asOf).toLocaleString("en-US", {
        timeZone: "UTC",
        timeStyle: "short",
        dateStyle: "short",
      })}{" "}
      UTC. {context.limitation}
    </div>
  );
}
