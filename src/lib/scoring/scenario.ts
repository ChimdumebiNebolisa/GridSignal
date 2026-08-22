/**
 * GridSignal Texas — Deterministic what-if weight scenarios.
 *
 * Scenario exploration recomputes the structural-need formula from the SAME
 * published component values with user-adjusted weights. It never changes
 * canonical scores, is computed client-side from exposed data, and is always
 * labeled as a local what-if (ADR-003).
 */

import { STRUCTURAL_NEED_WEIGHTS } from "@/types/scoring";
import type { StructuralComponentKey } from "@/lib/scoring/validationMetrics";
import { weightedStructuralScore } from "@/lib/scoring/validationMetrics";

export type ScenarioWeights = Record<StructuralComponentKey, number>;

export const DEFAULT_SCENARIO_WEIGHTS: ScenarioWeights = {
  hazardExposure: STRUCTURAL_NEED_WEIGHTS.hazardExposure,
  socialVulnerability: STRUCTURAL_NEED_WEIGHTS.socialVulnerability,
  outageBurden: STRUCTURAL_NEED_WEIGHTS.outageBurden,
};

export type ComponentValues = {
  hazardExposure: number | null;
  socialVulnerability: number | null;
  outageBurden: number | null;
};

/**
 * Recompute the structural score under a scenario. Returns null when the
 * canonical withholding gate would also withhold (0 available or >1 missing).
 */
export function computeScenarioScore(
  values: ComponentValues,
  weights: Partial<ScenarioWeights> = {}
): { score: number | null; weightsUsed: ScenarioWeights } {
  const weightsUsed: ScenarioWeights = {
    ...DEFAULT_SCENARIO_WEIGHTS,
    ...Object.fromEntries(
      Object.entries(weights).filter(([, v]) => typeof v === "number" && v >= 0)
    ),
  } as ScenarioWeights;

  return {
    score: weightedStructuralScore(values, weightsUsed),
    weightsUsed,
  };
}

/** True when the scenario differs materially from the canonical equal-weight config. */
export function isCanonicalScenario(weights: Partial<ScenarioWeights>): boolean {
  return Object.entries(DEFAULT_SCENARIO_WEIGHTS).every(
    ([key, w]) => Math.abs((weights[key as StructuralComponentKey] ?? w) - w) < 1e-9
  );
}
