/**
 * Client-safe map summary helpers (no server-only imports)
 */

import type { CountyEnergyProfile, MapCountySummary } from "@/types/county";

export function summaryFromProfile(p: CountyEnergyProfile): MapCountySummary {
  return {
    countyFips: p.countyFips,
    countyName: p.countyName,
    structuralNeedScore: p.structuralNeed.score,
    structuralNeedLabel: p.structuralNeed.label,
    structuralNeedNoScoreReason: p.structuralNeed.noScoreReason,
    feasibilityScore: p.feasibility.score,
    feasibilityLabel: p.feasibility.label,
    feasibilityNoScoreReason: p.feasibility.noScoreReason,
    weatherStressScore: p.operationalContext.weatherStressScore,
    dataQuality: p.dataQuality,
  };
}
