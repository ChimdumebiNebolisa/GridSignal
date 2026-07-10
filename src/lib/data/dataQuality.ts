/**
 * GridSignal Texas — Data quality helpers (v2)
 */

import type { DataQuality, DataQualitySummary } from "@/types/county";

export function getOverallDataQuality(parts: DataQuality[]): DataQuality {
  if (parts.includes("unavailable")) return "unavailable";
  if (parts.includes("fallback")) return "fallback";
  if (parts.includes("estimated")) return "estimated";
  if (parts.includes("cached")) return "cached";
  return "live";
}

/** Score-bearing indicators only — utility context excluded */
export function buildDataQualitySummary(
  structuralNeed: DataQuality,
  feasibility: DataQuality,
  operational: DataQuality,
  utilityContext: DataQuality
): DataQualitySummary {
  return {
    overall: getOverallDataQuality([structuralNeed, feasibility, operational]),
    structuralNeed,
    feasibility,
    operational,
    contextQuality: utilityContext,
  };
}

/** @deprecated Legacy rollup for migration tests */
export function buildLegacyDataQualitySummary(
  weather: DataQuality,
  solar: DataQuality,
  demand: DataQuality,
  grid: DataQuality,
  utility: DataQuality
): DataQualitySummary {
  return {
    overall: getOverallDataQuality([weather, solar, demand, grid]),
    structuralNeed: weather,
    feasibility: solar,
    operational: grid,
    contextQuality: utility,
    weather,
    solar,
    demand,
    grid,
    utility,
  };
}

export function dataQualityLabel(quality: DataQuality): string {
  switch (quality) {
    case "live":
      return "Live";
    case "cached":
      return "Cached";
    case "estimated":
      return "Estimated";
    case "fallback":
      return "Fallback";
    case "unavailable":
      return "Unavailable";
  }
}
