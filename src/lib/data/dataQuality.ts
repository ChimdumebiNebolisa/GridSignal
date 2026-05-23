/**
 * GridSignal Texas — Data quality helpers
 */

import type { DataQuality, DataQualitySummary } from "@/types/county";

export function getOverallDataQuality(parts: DataQuality[]): DataQuality {
  if (parts.includes("unavailable")) return "unavailable";
  if (parts.includes("estimated")) return "estimated";
  if (parts.includes("cached")) return "cached";
  return "live";
}

export function buildDataQualitySummary(
  weather: DataQuality,
  solar: DataQuality,
  demand: DataQuality,
  grid: DataQuality,
  utility: DataQuality
): DataQualitySummary {
  return {
    overall: getOverallDataQuality([weather, solar, demand, grid, utility]),
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
    case "unavailable":
      return "Unavailable";
  }
}
