import type { LayerName, MapCountySummary } from "@/types/county";

export const PLANNING_COLORS = {
  Lower: "#d8d0c4",
  Moderate: "#c7a66b",
  Elevated: "#c97945",
  Highest: "#a9473b",
} as const;

export function getQuadrantColor(need: number | null, feasibility: number | null): string {
  if (need === null || feasibility === null) return "#cbd5e1";
  if (need >= 60 && feasibility >= 60) return "#c45c26";
  if (need >= 60) return "#b84a3a";
  if (feasibility >= 60) return "#5a8f6e";
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
    case "structuralNeed": return county.structuralNeedScore;
    case "feasibility": return county.feasibilityScore;
    case "needFeasibilityQuadrant": return county.structuralNeedScore;
    case "weatherStress": return county.weatherStressScore;
  }
}

export function getLayerColor(layer: LayerName, county: MapCountySummary): string {
  if (layer === "needFeasibilityQuadrant") {
    return getQuadrantColor(county.structuralNeedScore, county.feasibilityScore);
  }
  return interpolateScoreColor(getLayerScore(layer, county));
}

export const LAYER_LABELS: Record<LayerName, string> = {
  structuralNeed: "Structural Resilience Need",
  feasibility: "Backup Feasibility",
  needFeasibilityQuadrant: "Need vs Feasibility",
  weatherStress: "Current Weather Stress",
};

export const LAYER_DESCRIPTIONS: Record<LayerName, string> = {
  structuralNeed: "Annual structural resilience need from hazard exposure, social vulnerability, and outage burden.",
  feasibility: "Annual backup feasibility from solar resource potential using a standard 4 kW assumption.",
  needFeasibilityQuadrant: "Quadrant view combining structural need and backup feasibility.",
  weatherStress: "Near-term weather stress from county-centroid forecast; operational context only.",
};

export const ACTIVE_LAYERS: LayerName[] = [
  "structuralNeed",
  "feasibility",
  "needFeasibilityQuadrant",
  "weatherStress",
];
