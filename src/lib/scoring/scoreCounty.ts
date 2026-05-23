/**
 * GridSignal Texas — Score calculation
 * Implements data contract §7 weighted formula.
 * Pure function — no React, no I/O.
 */

import type { ScoreInput } from "@/types/county";
import type { BackupPriorityResult, ScoreBreakdown } from "@/types/scoring";
import { SCORE_WEIGHTS } from "@/types/scoring";
import { clamp } from "@/lib/utils/clamp";
import { getBackupPriorityLabel } from "./labels";

export type ScoreInputs = {
  weatherRisk: ScoreInput;
  solarPotential: ScoreInput;
  demandExposure: ScoreInput;
  gridStrain: ScoreInput;
};

/**
 * Calculate the Backup Priority Score using the fixed weighted formula:
 *   0.30 × weather + 0.25 × solar + 0.25 × demand + 0.20 × grid
 *
 * All inputs must already be normalized to 0–100.
 * The final score is rounded to nearest integer and clamped 0–100.
 */
export function calculateBackupPriorityScore(
  inputs: ScoreInputs
): BackupPriorityResult {
  const weatherWeighted = SCORE_WEIGHTS.weatherRisk * inputs.weatherRisk.value;
  const solarWeighted = SCORE_WEIGHTS.solarPotential * inputs.solarPotential.value;
  const demandWeighted = SCORE_WEIGHTS.demandExposure * inputs.demandExposure.value;
  const gridWeighted = SCORE_WEIGHTS.statewideGridStrain * inputs.gridStrain.value;

  const rawScore = weatherWeighted + solarWeighted + demandWeighted + gridWeighted;
  const finalScore = clamp(Math.round(rawScore), 0, 100);
  const label = getBackupPriorityLabel(finalScore);

  const breakdown: ScoreBreakdown = {
    weatherWeighted: Math.round(weatherWeighted * 100) / 100,
    solarWeighted: Math.round(solarWeighted * 100) / 100,
    demandWeighted: Math.round(demandWeighted * 100) / 100,
    gridWeighted: Math.round(gridWeighted * 100) / 100,
    finalScore,
  };

  return { score: finalScore, label, breakdown };
}
