/**
 * GridSignal Texas — Recommendation builder
 * Generates deterministic, cautious planning-language recommendations.
 * Must never say "outage prediction," "buy solar," or "this utility is unreliable."
 */

import type { CountyEnergyProfile, BackupPriorityLabel } from "@/types/county";

/**
 * Build a recommendation string based on the county profile.
 * Uses approved wording from PRD §5 and guardrails §5.
 */
export function buildRecommendation(profile: CountyEnergyProfile): string {
  const { backupPriorityLabel, weatherRiskScore, solarPotentialScore, demandExposureScore } = profile;

  // Identify top score drivers
  const drivers = getTopDrivers(profile);
  const driverText = drivers.length > 0
    ? ` Key factors: ${drivers.join(", ")}.`
    : "";

  switch (backupPriorityLabel) {
    case "Critical":
      return `This county shows the highest backup-planning priority based on public data signals.${driverText} Solar plus battery backup may be worth evaluating for homes, small businesses, and essential facilities. This is a planning signal, not an outage prediction.`;

    case "High":
      return `Backup energy planning may be useful here.${driverText} Consider evaluating solar plus battery backup options for homes and essential facilities. This is a planning signal based on public data, not a prediction.`;

    case "Medium":
      return `This county shows moderate backup-planning priority.${driverText} Backup planning may be worth considering depending on individual circumstances. Scores reflect public data signals, not guaranteed outcomes.`;

    case "Low":
      return `This county currently shows lower backup-planning priority based on available public data signals.${driverText} Individual circumstances may still warrant backup planning. This score is a general planning signal.`;
  }
}

/**
 * Identify the top contributing factors to communicate in the recommendation.
 */
function getTopDrivers(profile: CountyEnergyProfile): string[] {
  const drivers: string[] = [];

  if (profile.weatherRiskScore >= 70) {
    drivers.push("elevated weather exposure");
  } else if (profile.weatherRiskScore >= 50) {
    drivers.push("moderate weather exposure");
  }

  if (profile.solarPotentialScore >= 70) {
    drivers.push("strong solar potential");
  } else if (profile.solarPotentialScore >= 50) {
    drivers.push("moderate solar potential");
  }

  if (profile.demandExposureScore >= 70) {
    drivers.push("high population demand");
  } else if (profile.demandExposureScore >= 50) {
    drivers.push("moderate population demand");
  }

  if (profile.statewideGridStrainScore >= 70) {
    drivers.push("elevated statewide grid strain");
  } else if (profile.statewideGridStrainScore >= 50) {
    drivers.push("moderate statewide grid strain");
  }

  return drivers;
}
