/**
 * GridSignal Texas — County report builder (v2)
 */

import type { CountyEnergyProfile } from "@/types/county";
import { getPlanningLabelDisplayText } from "@/lib/scoring/labels";

export function buildCountyReport(profile: CountyEnergyProfile): string {
  const {
    countyName,
    structuralNeed,
    feasibility,
    operationalContext,
    recommendation,
    likelyUtilityTerritories,
    dataQuality,
    lastUpdated,
    profileAssembledAt,
    dataManifestVersion,
  } = profile;

  const utilityText =
    likelyUtilityTerritories.length > 0
      ? likelyUtilityTerritories.join(", ")
      : "Unknown";

  const sourceNotes = profile.sourceStatus
    .map(
      (status) =>
        `- ${status.sourceName}: ${status.quality}. ${status.message} ${status.limitation}`
    )
    .join("\n");

  const needScoreText =
    structuralNeed.score !== null
      ? `${structuralNeed.score}/100 (${structuralNeed.label})`
      : "Withheld — missing indicator data";

  return `GridSignal Texas Report
${countyName}, Texas
Data schema: ${dataManifestVersion}

STRUCTURAL RESILIENCE NEED
Score: ${needScoreText}
${structuralNeed.score !== null ? getPlanningLabelDisplayText(structuralNeed.label) : ""}
- Hazard exposure: ${structuralNeed.components.hazardExposure.value ?? "unavailable"}/100
- Social vulnerability: ${structuralNeed.components.socialVulnerability.value ?? "unavailable"}/100
- Outage burden: ${structuralNeed.components.outageBurden.value ?? "unavailable"}/100
${structuralNeed.missingComponents.length > 0 ? `Missing: ${structuralNeed.missingComponents.join(", ")}` : ""}

BACKUP FEASIBILITY
Score: ${feasibility.score}/100 (${feasibility.label})
- Solar resource: ${feasibility.components.solarResource.value ?? "unavailable"}/100

CURRENT CONDITIONS (statewide context — not county rank)
- Weather stress: ${operationalContext.weatherStressScore}/100
- ERCO load context: ${operationalContext.statewideGridStrainScore}/100
${operationalContext.limitation}

Recommendation:
${recommendation}

Utility Context:
Likely utility/service territory: ${utilityText}
Utility context is informational only and does not affect scores.

Limitations:
GridSignal Texas presents structural resilience need and backup feasibility using public data. It does not predict outages, determine exact utility reliability, or provide legal, engineering, investment, or energy advice.

Data Quality:
Overall: ${dataQuality.overall}
Structural need: ${dataQuality.structuralNeed}
Feasibility: ${dataQuality.feasibility}
Operational: ${dataQuality.operational}
Utility context: ${dataQuality.contextQuality}

Source Notes:
${sourceNotes}

Oldest source data: ${lastUpdated}
Profile assembled: ${profileAssembledAt}`;
}
