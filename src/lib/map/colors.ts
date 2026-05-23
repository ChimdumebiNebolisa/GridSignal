/**
 * Map color scales for GridSignal Texas layers
 */

import type { BackupPriorityLabel, LayerName } from "@/types/county";

export const PRIORITY_COLORS: Record<BackupPriorityLabel, string> = {
  Low: "#c8e6d4",
  Medium: "#f5e6a8",
  High: "#e8a54b",
  Critical: "#b84a3a",
};

export const PRIORITY_BORDER_COLORS: Record<BackupPriorityLabel, string> = {
  Low: "#5a8f6e",
  Medium: "#9a8a3a",
  High: "#b86e1a",
  Critical: "#7a2e22",
};

export function scoreToPriorityLabel(score: number): BackupPriorityLabel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function getScoreColor(score: number): string {
  return PRIORITY_COLORS[scoreToPriorityLabel(score)];
}

export function getScoreBorderColor(score: number): string {
  return PRIORITY_BORDER_COLORS[scoreToPriorityLabel(score)];
}

export function interpolateScoreColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 40) return PRIORITY_COLORS.Low;
  if (clamped < 60) return PRIORITY_COLORS.Medium;
  if (clamped < 80) return PRIORITY_COLORS.High;
  return PRIORITY_COLORS.Critical;
}

export function getLayerScore(
  layer: LayerName,
  county: {
    backupPriorityScore: number;
    weatherRiskScore: number;
    solarPotentialScore: number;
    demandExposureScore: number;
    statewideGridStrainScore: number;
  }
): number {
  switch (layer) {
    case "backupPriority":
      return county.backupPriorityScore;
    case "weatherRisk":
      return county.weatherRiskScore;
    case "solarPotential":
      return county.solarPotentialScore;
    case "demandExposure":
      return county.demandExposureScore;
    case "statewideGridStrain":
      return county.statewideGridStrainScore;
  }
}

export const LAYER_LABELS: Record<LayerName, string> = {
  backupPriority: "Backup Priority",
  weatherRisk: "Weather Risk",
  solarPotential: "Solar Potential",
  demandExposure: "Demand Exposure",
  statewideGridStrain: "Statewide Grid Strain",
};

export const LAYER_DESCRIPTIONS: Record<LayerName, string> = {
  backupPriority:
    "Weighted backup-planning priority from weather, solar, demand, and statewide grid strain.",
  weatherRisk:
    "Weather risk from precomputed county-centroid conditions (heat, cold, wind, precipitation).",
  solarPotential:
    "Solar potential percentile vs. other Texas counties (4 kW PVWatts assumptions).",
  demandExposure:
    "Population-based demand exposure percentile among Texas counties.",
  statewideGridStrain:
    "Statewide or balancing-authority grid strain (ERCO). Not county-level grid reliability.",
};
