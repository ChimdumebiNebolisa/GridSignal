"use client";

import { useMemo, useState } from "react";
import type { MapCountySummary } from "@/types/county";
import { StatusTag } from "@/components/ui/StatusTag";

type Filter = "all" | "need" | "feasibility" | "weather";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "need", label: "STRUCTURAL NEED" },
  { key: "feasibility", label: "FEASIBILITY" },
  { key: "weather", label: "WEATHER" },
];

/**
 * Comparison table over real map summaries.
 * Sorting is disclosed inline; when ordinal structural rankings are withheld,
 * the need column shows the withholding state instead of a number.
 */
export function CountySignalsTable({ rows }: { rows: MapCountySummary[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(() => {
    const base = [...rows];
    switch (filter) {
      case "need":
        return base.sort(
          (a, b) => (b.structuralNeedScore ?? -1) - (a.structuralNeedScore ?? -1)
        );
      case "feasibility":
        return base.sort((a, b) => (b.feasibilityScore ?? -1) - (a.feasibilityScore ?? -1));
      case "weather":
        return base.sort((a, b) => b.weatherStressScore - a.weatherStressScore);
      default:
        return base.sort((a, b) => a.countyName.localeCompare(b.countyName));
    }
  }, [rows, filter]);

  return (
    <div className="gs-frame overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] px-3 py-2">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Sort comparison table"
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-7 rounded-sm border px-2.5 font-mono text-[10px] tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--gs-blue)] ${
                filter === f.key
                  ? "border-[var(--gs-ink)] bg-[var(--gs-ink)] text-white"
                  : "border-[var(--gs-border)] bg-white text-[var(--gs-muted)] hover:border-[var(--gs-border-strong)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] text-[var(--gs-muted-2)]" aria-live="polite">
          sorted by {filter === "all" ? "county name" : FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            County signals comparison: structural need, backup feasibility,
            weather context, and data quality for selected Texas counties.
            Sorted as indicated by the active filter.
          </caption>
          <thead>
            <tr className="border-b border-[var(--gs-border)] bg-white">
              {["COUNTY", "STRUCTURAL NEED", "BACKUP FEASIBILITY", "WEATHER CONTEXT", "DATA QUALITY"].map((h) => (
                <th key={h} scope="col" className="px-4 py-2 text-left font-mono text-[10px] font-medium tracking-wider text-[var(--gs-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.countyFips} className="border-b border-[var(--gs-border)] last:border-b-0 hover:bg-[var(--gs-canvas)]">
                <td className="whitespace-nowrap px-4 py-2.5 font-medium">{row.countyName}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums">
                  {row.structuralNeedScore !== null
                    ? `${row.structuralNeedScore}/100`
                    : row.structuralNeedNoScoreReason === "gates_failed"
                      ? "withheld · gate"
                      : "unavailable"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums">
                  {row.feasibilityScore !== null ? `${row.feasibilityScore}/100` : "unavailable"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums">
                  {row.weatherStressScore}/100
                </td>
                <td className="px-4 py-2.5">
                  <StatusTag quality={row.dataQuality.overall} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-[var(--gs-border)] bg-[var(--gs-canvas)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--gs-muted)]">
        Selection rule: five highest and three lowest counties by the chosen column among bundled snapshot values. These are planning indicators, not authoritative resilience rankings of real-world county reliability.
      </p>
    </div>
  );
}
