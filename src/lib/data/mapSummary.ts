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
    feasibilityScore: p.feasibility.score,
    feasibilityLabel: p.feasibility.label,
    weatherStressScore: p.operationalContext.weatherStressScore,
    backupPriorityScore: p.backupPriorityScore,
    backupPriorityLabel: p.backupPriorityLabel,
    weatherRiskScore: p.weatherRiskScore,
    solarPotentialScore: p.solarPotentialScore,
    demandExposureScore: p.demandExposureScore,
    statewideGridStrainScore: p.statewideGridStrainScore,
    dataQuality: p.dataQuality,
  };
}
