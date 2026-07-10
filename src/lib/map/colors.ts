/**
 * Map color scales for GridSignal Texas layers (v2)
 */

import type { LayerName, MapCountySummary, PlanningLabel } from "@/types/county";
import { PLANNING_LABEL_THRESHOLDS } from "@/types/scoring";

export const PLANNING_COLORS: Record<PlanningLabel, string> = {
  Lower: "#c8e6d4",
  Moderate: "#f5e6a8",
  Elevated: "#e8a54b",
  Highest: "#b84a3a",
};

export const PLANNING_BORDER_COLORS: Record<PlanningLabel, string> = {
  Lower: "#5a8f6e",
  Moderate: "#9a8a3a",
  Elevated: "#b86e1a",
  Highest: "#7a2e22",
};

export function scoreToPlanningLabel(score: number | null): PlanningLabel {
  if (score === null) return "Moderate";
  if (score >= PLANNING_LABEL_THRESHOLDS.highest) return "Highest";
  if (score >= PLANNING_LABEL_THRESHOLDS.elevated) return "Elevated";
  if (score >= PLANNING_LABEL_THRESHOLDS.moderate) return "Moderate";
  return "Lower";
}

export function getPlanningColor(score: number | null): string {
  return PLANNING_COLORS[scoreToPlanningLabel(score)];
}

export function getPlanningBorderColor(score: number | null): string {
  return PLANNING_BORDER_COLORS[scoreToPlanningLabel(score)];
}

/** Quadrant colors: high need + high feasibility = amber-green blend logic */
export function getQuadrantColor(need: number | null, feasibility: number): string {
  const n = need ?? 50;
  const f = feasibility;
  if (n >= 60 && f >= 60) return "#c45c26";
  if (n >= 60 && f < 60) return "#b84a3a";
  if (n < 60 && f >= 60) return "#5a8f6e";
  return "#94a3b8";
}

export function interpolateScoreColor(score: number | null): string {
  if (score === null) return "#cbd5e1";
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 40) return PLANNING_COLORS.Lower;
  if (clamped < 60) return PLANNING_COLORS.Moderate;
  if (clamped < 80) return PLANNING_COLORS.Elevated;
  return PLANNING_COLORS.Highest;
}

export function getLayerScore(layer: LayerName, county: MapCountySummary): number | null {
  switch (layer) {
    case "structuralNeed":
      return county.structuralNeedScore;
    case "feasibility":
      return county.feasibilityScore;
    case "needFeasibilityQuadrant":
      return county.structuralNeedScore;
    case "weatherStress":
      return county.weatherStressScore;
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

export function getLayerColor(layer: LayerName, county: MapCountySummary): string {
  if (layer === "needFeasibilityQuadrant") {
    return getQuadrantColor(county.structuralNeedScore, county.feasibilityScore);
  }
  const score = getLayerScore(layer, county);
  return interpolateScoreColor(score);
}

export const LAYER_LABELS: Record<LayerName, string> = {
  structuralNeed: "Structural Resilience Need",
  feasibility: "Backup Feasibility",
  needFeasibilityQuadrant: "Need vs Feasibility",
  weatherStress: "Current Weather Stress",
  backupPriority: "Legacy Composite (deprecated)",
  weatherRisk: "Weather Risk (deprecated)",
  solarPotential: "Solar Potential (deprecated)",
  demandExposure: "Population Context (deprecated)",
  statewideGridStrain: "Grid Strain (deprecated)",
};

export const LAYER_DESCRIPTIONS: Record<LayerName, string> = {
  structuralNeed:
    "Annual structural resilience need from hazard exposure, social vulnerability, and outage burden.",
  feasibility:
    "Annual backup feasibility from solar resource potential (4 kW PVWatts assumptions).",
  needFeasibilityQuadrant:
    "Quadrant view combining structural need and backup feasibility.",
  weatherStress:
    "Near-term weather stress from county-centroid forecast (operational context).",
  backupPriority: "Deprecated composite — withheld from primary use.",
  weatherRisk: "Deprecated weather layer.",
  solarPotential: "Deprecated solar layer.",
  demandExposure: "Deprecated population context layer.",
  statewideGridStrain: "Deprecated statewide grid layer.",
};

export const ACTIVE_LAYERS: LayerName[] = [
  "structuralNeed",
  "feasibility",
  "needFeasibilityQuadrant",
  "weatherStress",
];
