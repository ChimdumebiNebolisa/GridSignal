/**
 * GridSignal Texas — Scoring types
 * Derived from gridsignal_texas_data_contract.md §10
 */

import type { BackupPriorityLabel, DataQuality } from "./county";

/** Historical-only composite types retained for migration tests. */
export type ScoreBreakdown = {
  weatherWeighted: number;
  solarWeighted: number;
  demandWeighted: number;
  gridWeighted: number;
  finalScore: number;
};

export type BackupPriorityResult = {
  score: number;
  label: BackupPriorityLabel;
  breakdown: ScoreBreakdown;
};

export type NormalizedScore = {
  value: number;
  quality: DataQuality;
  explanation: string;
};

export const SCORE_WEIGHTS = {
  weatherRisk: 0.30,
  solarPotential: 0.25,
  demandExposure: 0.25,
  statewideGridStrain: 0.20,
} as const;

export const LABEL_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 40,
  low: 0,
} as const;

/** Canonical planning label thresholds. */
export const PLANNING_LABEL_THRESHOLDS = {
  highest: 80,
  elevated: 60,
  moderate: 40,
  lower: 0,
} as const;

/** Equal weight among available structural need components */
export const STRUCTURAL_NEED_WEIGHTS = {
  hazardExposure: 1 / 3,
  socialVulnerability: 1 / 3,
  outageBurden: 1 / 3,
} as const;

export const SCORE_CONFIG_VERSION = "two-axis-v1";
