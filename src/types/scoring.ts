/**
 * GridSignal Texas — Scoring types
 * Derived from gridsignal_texas_data_contract.md §10
 */

import type { BackupPriorityLabel, DataQuality, ScoreInput } from "./county";

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

/** Weights for the Backup Priority Score formula — immutable */
export const SCORE_WEIGHTS = {
  weatherRisk: 0.30,
  solarPotential: 0.25,
  demandExposure: 0.25,
  statewideGridStrain: 0.20,
} as const;

/** Label thresholds — immutable */
export const LABEL_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 40,
  low: 0,
} as const;
