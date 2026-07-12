/** Deterministic recommendation text for the canonical two-axis model. */

import type { CountyEnergyProfile } from "@/types/county";

export function buildRecommendation(profile: CountyEnergyProfile): string {
  const need = profile.structuralNeed;
  const feasibility = profile.feasibility;
  const drivers = getTopDrivers(profile);
  const driverText = drivers.length > 0 ? ` Key factors: ${drivers.join(", ")}.` : "";
  const feasibilityLabel = feasibility.label?.toLowerCase() ?? "unavailable";

  if (need.score === null) {
    const reason =
      need.noScoreReason === "missing_components"
        ? "more than one indicator component is missing"
        : "the required indicator data is unavailable";
    return `Structural resilience need is withheld because ${reason}.${driverText} Review the component breakdown and data gaps. Backup feasibility is ${feasibilityLabel}. This is a planning signal, not an outage prediction.`;
  }

  const needLabel = need.label?.toLowerCase() ?? "unavailable";
  if (need.label === "Highest" || need.label === "Elevated") {
    return `This county shows ${needLabel} structural resilience need based on hazard, vulnerability, and outage burden indicators.${driverText} Backup feasibility is ${feasibilityLabel} — solar resource may ${feasibility.score !== null && feasibility.score >= 60 ? "support" : "limit"} distributed backup options. Planning signal only; not an outage prediction.`;
  }

  if (feasibility.score !== null && feasibility.score >= 70 && need.score < 50) {
    return `Backup implementation may be relatively feasible here (solar resource), though structural need is ${needLabel}.${driverText} Evaluate backup options in local planning context.`;
  }

  return `This county shows ${needLabel} structural resilience need and ${feasibilityLabel} backup feasibility.${driverText} Scores reflect public data signals, not guaranteed outcomes.`;
}

function getTopDrivers(profile: CountyEnergyProfile): string[] {
  const drivers: string[] = [];
  const { hazardExposure, socialVulnerability, outageBurden } =
    profile.structuralNeed.components;

  if ((hazardExposure.value ?? 0) >= 70) drivers.push("elevated hazard exposure");
  if ((socialVulnerability.value ?? 0) >= 70) drivers.push("elevated social vulnerability");
  if ((outageBurden.value ?? 0) >= 70) drivers.push("elevated historical outage burden");
  if (profile.operationalContext.weatherStressScore >= 70) {
    drivers.push("near-term weather stress");
  }
  if (profile.operationalContext.statewideGridStrainScore >= 70) {
    drivers.push("elevated statewide grid load context");
  }
  if (profile.feasibility.score !== null && profile.feasibility.score >= 70) {
    drivers.push("strong solar feasibility");
  }
  return drivers;
}
