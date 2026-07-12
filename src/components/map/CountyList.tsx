"use client";

import type { MapCountySummary } from "@/types/county";

type CountyListProps = {
  counties: MapCountySummary[];
  selectedFips: string | null;
  onSelectCounty: (fips: string) => void;
};

export function CountyList({ counties, selectedFips, onSelectCounty }: CountyListProps) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur-sm">
      <summary className="cursor-pointer px-1 text-xs font-semibold text-slate-700">
        Browse counties without the map
      </summary>
      <div className="mt-2 max-h-64 overflow-y-auto" role="list" aria-label="Texas counties">
        {counties.map((county) => (
          <button
            key={county.countyFips}
            type="button"
            className={`block w-full rounded px-2 py-1 text-left text-xs focus:outline-none focus:ring-2 focus:ring-slate-700 ${selectedFips === county.countyFips ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            aria-pressed={selectedFips === county.countyFips}
            onClick={() => onSelectCounty(county.countyFips)}
          >
            <span>{county.countyName}</span>
            <span className="ml-2 text-[10px] opacity-75">
              Need {county.structuralNeedScore ?? "withheld"} · Feasibility {county.feasibilityScore ?? "unavailable"}
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}
