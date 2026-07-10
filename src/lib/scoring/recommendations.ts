/**
 * GridSignal Texas — Recommendation builder (v2)
 */

import type { CountyEnergyProfile } from "@/types/county";

export function buildRecommendation(profile: CountyEnergyProfile): string {
  const need = profile.structuralNeed;
  const feas = profile.feasibility;
  const drivers = getTopDrivers(profile);

  const driverText =
    drivers.length > 0 ? ` Key factors: ${drivers.join(", ")}.` : "";

  if (need.score === null) {
    return `Structural resilience need cannot be summarized as a single score due to missing indicator data.${driverText} Review component breakdown and data gaps. Backup feasibility is ${feas.label.toLowerCase()}. This is a planning signal, not an outage prediction.`;
  }

  if (need.label === "Highest" || need.label === "Elevated") {
    return `This county shows ${need.label.toLowerCase()} structural resilience need based on hazard, vulnerability, and outage burden indicators.${driverText} Backup feasibility is ${feas.label.toLowerCase()} — solar resource may ${feas.score >= 60 ? "support" : "limit"} distributed backup options. Planning signal only; not an outage prediction.`;
  }

  if (feas.score >= 70 && (need.score ?? 0) < 50) {
    return `Backup implementation may be relatively feasible here (solar resource), though structural need is ${need.label.toLowerCase()}.${driverText} Evaluate backup options in local planning context.`;
  }

  return `This county shows ${need.label.toLowerCase()} structural resilience need and ${feas.label.toLowerCase()} backup feasibility.${driverText} Scores reflect public data signals, not guaranteed outcomes.`;
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

  if (profile.feasibility.score >= 70) drivers.push("strong solar feasibility");

  return drivers;
}
