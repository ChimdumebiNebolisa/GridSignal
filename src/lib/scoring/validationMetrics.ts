/**
 * GridSignal Texas — Deterministic scoring-validation metrics.
 *
 * Pure functions only: no wall-clock time, no randomness, no filesystem access.
 * The same bundled inputs always produce identical metric objects, which makes
 * the sensitivity analysis reproducible and testable (audit F-007 / R4).
 *
 * NOTE ON WEIGHT SWEEPS: `calculateStructuralNeed` reads the canonical weight
 * constant internally, so weight perturbations are evaluated with
 * `weightedStructuralScore`, which mirrors its gate-and-renormalize math
 * exactly. Parity is enforced by tests (scoringContract.test.ts).
 */

import type { CountyStructuralNeedRecord } from "@/types/county";
import { STRUCTURAL_NEED_WEIGHTS } from "@/types/scoring";
import {
  MAX_MISSING_FOR_STRUCTURAL_NEED,
  calculateStructuralNeed,
} from "@/lib/scoring/structuralNeed";

export type StructuralRecord = CountyStructuralNeedRecord;
export type StructuralComponentKey =
  | "hazardExposure"
  | "socialVulnerability"
  | "outageBurden";

const COMPONENT_KEYS: StructuralComponentKey[] = [
  "hazardExposure",
  "socialVulnerability",
  "outageBurden",
];

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function weightedStructuralScore(
  values: Record<StructuralComponentKey, number | null>,
  weights: Record<StructuralComponentKey, number> = STRUCTURAL_NEED_WEIGHTS
): number | null {
  const available = COMPONENT_KEYS.filter((key) => values[key] !== null);
  if (available.length === 0) return null;
  const missingCount = COMPONENT_KEYS.length - available.length;
  if (missingCount > MAX_MISSING_FOR_STRUCTURAL_NEED) return null;

  const totalWeight = available.reduce((sum, key) => sum + weights[key], 0);
  const raw =
    available.reduce((sum, key) => sum + (values[key] ?? 0) * weights[key], 0) /
    totalWeight;
  return clampScore(raw);
}

export function scoresFromRecords(
  records: StructuralRecord[],
  scoreFn: (r: StructuralRecord) => number | null
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const r of records) map.set(r.countyFips, scoreFn(r));
  return map;
}

/** Descending-rank map over non-null scores. Ties resolve deterministically by input order (stable sort). */
export function descendingRanks(
  scores: Map<string, number | null>
): Map<string, number> {
  const entries = [...scores.entries()]
    .filter(([, score]) => score !== null)
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const ranks = new Map<string, number>();
  entries.forEach(([fips], index) => ranks.set(fips, index));
  return ranks;
}

export function rankStabilityShare(
  baseScores: Map<string, number | null>,
  perturbedScores: Map<string, number | null>,
  tolerance = 5
): number {
  const baseRanks = descendingRanks(baseScores);
  const perturbedRanks = descendingRanks(perturbedScores);
  let stable = 0;
  let compared = 0;
  for (const [fips, baseRank] of baseRanks) {
    const perturbedRank = perturbedRanks.get(fips);
    if (perturbedRank === undefined) continue;
    compared++;
    if (Math.abs(baseRank - perturbedRank) <= tolerance) stable++;
  }
  return compared === 0 ? 1 : stable / compared;
}

export function spearmanRho(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2 || x.length !== y.length) return 0;
  const rank = (arr: number[]): number[] => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(n).fill(0);
    sorted.forEach((item, rankIdx) => {
      ranks[item.i] = rankIdx + 1;
    });
    return ranks;
  };
  const rx = rank(x);
  const ry = rank(y);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function pairedValues(
  records: StructuralRecord[],
  other: Map<string, number | null>
): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (const r of records) {
    const need = calculateStructuralNeed(r).score;
    const o = other.get(r.countyFips);
    if (need !== null && o != null) {
      x.push(need);
      y.push(o);
    }
  }
  return { x, y };
}

export function outcomeProxyCorrelation(records: StructuralRecord[]): number {
  const other = new Map<string, number | null>(
    records.map((r) => [r.countyFips, r.components.outageBurden.value])
  );
  const { x, y } = pairedValues(records, other);
  return spearmanRho(x, y);
}

export function populationCorrelation(
  records: StructuralRecord[],
  populations: Map<string, number>
): number {
  const other = new Map<string, number | null>(
    records.map((r) => [r.countyFips, populations.get(r.countyFips) ?? null])
  );
  const { x, y } = pairedValues(records, other);
  return spearmanRho(x, y);
}

export function weightSweepStability(
  records: StructuralRecord[],
  deltas: number[] = [-0.2, -0.1, 0.1, 0.2],
  tolerance = 5
): Array<{ component: StructuralComponentKey; delta: number; stableShare: number }> {
  const base = scoresFromRecords(records, (r) =>
    weightedStructuralScore({
      hazardExposure: r.components.hazardExposure.value,
      socialVulnerability: r.components.socialVulnerability.value,
      outageBurden: r.components.outageBurden.value,
    })
  );

  const rows: Array<{
    component: StructuralComponentKey;
    delta: number;
    stableShare: number;
  }> = [];
  for (const component of COMPONENT_KEYS) {
    for (const delta of deltas) {
      const weights = { ...STRUCTURAL_NEED_WEIGHTS };
      weights[component] = STRUCTURAL_NEED_WEIGHTS[component] * (1 + delta);
      const perturbed = scoresFromRecords(records, (r) =>
        weightedStructuralScore(
          {
            hazardExposure: r.components.hazardExposure.value,
            socialVulnerability: r.components.socialVulnerability.value,
            outageBurden: r.components.outageBurden.value,
          },
          weights
        )
      );
      rows.push({ component, delta, stableShare: rankStabilityShare(base, perturbed, tolerance) });
    }
  }
  return rows;
}

export function leaveOneOutStability(
  records: StructuralRecord[],
  tolerance = 5
): Array<{ component: StructuralComponentKey; stableShare: number; scoredCounties: number }> {
  const base = scoresFromRecords(records, (r) => calculateStructuralNeed(r).score);

  return COMPONENT_KEYS.map((component) => {
    const dropped = records.map((r) => ({
      ...r,
      components: {
        ...r.components,
        [component]: {
          ...r.components[component],
          value: null,
          quality: "unavailable" as const,
        },
      },
      missingComponents: [
        ...new Set([...r.missingComponents, component]),
      ],
    }));
    const perturbed = scoresFromRecords(dropped, (r) => calculateStructuralNeed(r).score);
    return {
      component,
      stableShare: rankStabilityShare(base, perturbed, tolerance),
      scoredCounties: [...perturbed.values()].filter((v) => v !== null).length,
    };
  });
}

export function inputPerturbationStability(
  records: StructuralRecord[],
  deltas: number[] = [-10, 10],
  tolerance = 5
): Array<{ delta: number; stableShare: number }> {
  const base = scoresFromRecords(records, (r) => calculateStructuralNeed(r).score);

  return deltas.map((delta) => {
    const shifted = records.map((r) => ({
      ...r,
      components: {
        hazardExposure: {
          ...r.components.hazardExposure,
          value:
            r.components.hazardExposure.value === null
              ? null
              : clampScore(r.components.hazardExposure.value + delta),
        },
        socialVulnerability: {
          ...r.components.socialVulnerability,
          value:
            r.components.socialVulnerability.value === null
              ? null
              : clampScore(r.components.socialVulnerability.value + delta),
        },
        outageBurden: {
          ...r.components.outageBurden,
          value:
            r.components.outageBurden.value === null
              ? null
              : clampScore(r.components.outageBurden.value + delta),
        },
      },
    }));
    const perturbed = scoresFromRecords(shifted, (r) => calculateStructuralNeed(r).score);
    return { delta, stableShare: rankStabilityShare(base, perturbed, tolerance) };
  });
}

export type ValidationSummary = {
  scoredCounties: number;
  rhoOutageBurden: number;
  rhoPopulation: number;
  weightSweeps: ReturnType<typeof weightSweepStability>;
  leaveOneOut: ReturnType<typeof leaveOneOutStability>;
  inputPerturbations: ReturnType<typeof inputPerturbationStability>;
  hazardWeightStabilityMin: number;
  compositePublishDecision: "ALLOW" | "WITHHOLD";
};

/**
 * Full deterministic summary. The composite gate preserves the original rule:
 * outcome-proxy correlation ≥ 0.4 AND worst-case ±20% hazard-weight rank
 * stability ≥ 80%.
 */
export function computeValidationSummary(
  records: StructuralRecord[],
  populations: Map<string, number>
): ValidationSummary {
  const scored = records.filter((r) => calculateStructuralNeed(r).score !== null).length;
  const rhoOutage = outcomeProxyCorrelation(records);
  const rhoPopulation = populationCorrelation(records, populations);
  const weightSweeps = weightSweepStability(records);
  const hazardStabilityMin = Math.min(
    ...weightSweeps.filter((row) => row.component === "hazardExposure").map((row) => row.stableShare)
  );
  const leaveOneOut = leaveOneOutStability(records);
  const inputPerturbations = inputPerturbationStability(records);

  return {
    scoredCounties: scored,
    rhoOutageBurden: rhoOutage,
    rhoPopulation,
    weightSweeps,
    leaveOneOut,
    inputPerturbations,
    hazardWeightStabilityMin: hazardStabilityMin,
    compositePublishDecision:
      rhoOutage >= 0.4 && hazardStabilityMin >= 0.8 ? "ALLOW" : "WITHHOLD",
  };
}
