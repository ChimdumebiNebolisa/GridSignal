/**
 * GridSignal Texas — Ranking publication gates.
 *
 * The build pipeline evaluates coverage/sensitivity gates
 * (scripts/build-indicators.ts) and records them in the data manifest. At
 * runtime these gates are applied to computed axes: when a gate fails, the
 * ordinal claim (score + label) is withheld with an explicit reason while the
 * underlying component values stay visible (audit ADR-003).
 */

import type {
  DataManifest,
  FeasibilityProfile,
  NoScoreReason,
  StructuralNeedProfile,
} from "@/types/county";

export type GateState = {
  structuralPass: boolean;
  feasibilityPass: boolean;
  rankingsPublished: boolean;
};

export function gatesFromManifest(manifest: DataManifest | null): GateState {
  const gates = manifest?.gates;
  if (!gates) {
    // Manifest without gate information cannot be trusted to publish rankings.
    return { structuralPass: false, feasibilityPass: false, rankingsPublished: false };
  }
  return {
    structuralPass: gates.structural.pass,
    feasibilityPass: gates.feasibility.pass,
    rankingsPublished: gates.rankingsPublished,
  };
}

export function applyStructuralGate(
  result: StructuralNeedProfile,
  state: GateState
): StructuralNeedProfile {
  if (result.score === null || state.structuralPass) return result;
  const gated: StructuralNeedProfile = {
    ...result,
    score: null,
    label: null,
    noScoreReason: "gates_failed",
  };
  return gated;
}

export function applyFeasibilityGate(
  result: FeasibilityProfile,
  state: GateState
): FeasibilityProfile {
  if (result.score === null || state.feasibilityPass) return result;
  return {
    ...result,
    score: null,
    label: null,
    noScoreReason: "gates_failed",
  };
}

export function noScoreReasonText(reason: NoScoreReason): string {
  switch (reason) {
    case "missing_components":
      return "Score withheld because more than one indicator component is missing";
    case "unavailable":
      return "Score unavailable because required indicator data is unavailable";
    case "gates_failed":
      return "Ranking withheld: coverage or sensitivity validation gates failed for this bundle";
  }
}
