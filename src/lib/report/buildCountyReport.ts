/**
 * GridSignal Texas — County report builder
 * Generates a plain-text report for copy/export.
 * Matches the format defined in design spec §8.
 */

import type { CountyEnergyProfile } from "@/types/county";
import { getLabelDisplayText } from "@/lib/scoring/labels";

/**
 * Build a shareable plain-text county report.
 * Includes all required fields: score, breakdown, recommendation,
 * utility context, data quality, limitation statement, last updated.
 */
export function buildCountyReport(profile: CountyEnergyProfile): string {
  const {
    countyName,
    backupPriorityScore,
    backupPriorityLabel,
    weatherRiskScore,
    solarPotentialScore,
    demandExposureScore,
    statewideGridStrainScore,
    recommendation,
    likelyUtilityTerritories,
    dataQuality,
    lastUpdated,
  } = profile;

  const utilityText =
    likelyUtilityTerritories.length > 0
      ? likelyUtilityTerritories.join(", ")
      : "Unknown";

  return `GridSignal Texas Report
${countyName}, Texas

Backup Priority: ${backupPriorityLabel}
Score: ${backupPriorityScore}/100
${getLabelDisplayText(backupPriorityLabel)}

Score Breakdown:
- Weather Risk: ${weatherRiskScore}/100 (weight: 30%)
- Solar Potential: ${solarPotentialScore}/100 (weight: 25%)
- Demand Exposure: ${demandExposureScore}/100 (weight: 25%)
- Statewide Grid Strain: ${statewideGridStrainScore}/100 (weight: 20%)

Recommendation:
${recommendation}

Utility Context:
Likely utility/service territory: ${utilityText}
Utility context is informational only and does not directly affect the score.

Limitations:
GridSignal Texas estimates backup energy planning priority using public data. It does not predict outages, determine exact utility reliability, or provide legal, engineering, investment, or energy advice.

Data Quality:
Weather: ${dataQuality.weather}
Solar: ${dataQuality.solar}
Population: ${dataQuality.demand}
Grid strain: ${dataQuality.grid}
Utility context: ${dataQuality.utility}

Last updated: ${lastUpdated}`;
}
