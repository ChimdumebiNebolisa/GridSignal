import { describe, expect, it } from "vitest";
import {
  applyFeasibilityGate,
  applyStructuralGate,
  gatesFromManifest,
  noScoreReasonText,
} from "@/lib/scoring/gates";
import { computeScenarioScore, isCanonicalScenario } from "@/lib/scoring/scenario";
import { matrixPosition, QUADRANT_LABELS } from "@/lib/map/matrix";
import type { DataManifest } from "@/types/county";

const passing = { structuralPass: true, feasibilityPass: true, rankingsPublished: true };
const failing = { structuralPass: false, feasibilityPass: false, rankingsPublished: false };

function needResult(score: number | null) {
  return {
    score,
    label: score === null ? null : ("Elevated" as const),
    noScoreReason: null,
    components: {} as never,
    missingComponents: [],
    quality: "cached" as const,
  };
}

function feasResult(score: number | null) {
  return {
    score,
    label: score === null ? null : ("Moderate" as const),
    noScoreReason: null,
    components: {} as never,
    quality: "cached" as const,
  };
}

describe("ranking gates", () => {
  it("passes results through when gates pass", () => {
    expect(applyStructuralGate(needResult(72), passing).score).toBe(72);
    expect(applyFeasibilityGate(feasResult(44), failing.feasibilityPass ? passing : passing).score).toBe(44);
  });

  it("withholds scores with an explicit reason when gates fail", () => {
    const gated = applyStructuralGate(needResult(72), failing);
    expect(gated.score).toBeNull();
    expect(gated.label).toBeNull();
    expect(gated.noScoreReason).toBe("gates_failed");

    const gatedFeas = applyFeasibilityGate(feasResult(44), failing);
    expect(gatedFeas.score).toBeNull();
    expect(gatedFeas.noScoreReason).toBe("gates_failed");
  });

  it("never resurrects already-withheld results", () => {
    const gated = applyStructuralGate(needResult(null), passing);
    expect(gated.score).toBeNull();
  });

  it("treats a manifest without gate info as unpublishable", () => {
    expect(gatesFromManifest({} as DataManifest).rankingsPublished).toBe(false);
    expect(gatesFromManifest(null).structuralPass).toBe(false);
  });

  it("renders human text for every no-score reason", () => {
    for (const reason of ["missing_components", "unavailable", "gates_failed"] as const) {
      expect(noScoreReasonText(reason)).toMatch(/\w/);
    }
  });
});

describe("scenario exploration", () => {
  const values = { hazardExposure: 90, socialVulnerability: 60, outageBurden: 30 };

  it("matches the canonical equal-weight result by default", () => {
    const s = computeScenarioScore(values);
    expect(s.score).toBe(60);
    expect(isCanonicalScenario(s.weightsUsed)).toBe(true);
  });

  it("responds deterministically to weight changes", () => {
    const weighted = computeScenarioScore(values, {
      hazardExposure: 1,
      socialVulnerability: 0.5,
      outageBurden: 0.5,
    });
    // (90*1 + 60*0.5 + 30*0.5) / (1 + 0.5 + 0.5) = 67.5 -> 68
    expect(weighted.score).toBe(68);
    expect(computeScenarioScore(values, { socialVulnerability: 0.5 }).score).toBe(
      computeScenarioScore(values, { socialVulnerability: 0.5 }).score
    );
    expect(isCanonicalScenario({ hazardExposure: 1, socialVulnerability: 0.5 })).toBe(false);
  });

  it("withholds under scenario exactly when the canonical gate would withhold", () => {
    // One missing component: canonical gate allows scoring.
    expect(
      computeScenarioScore({ hazardExposure: 90, socialVulnerability: 60, outageBurden: null })
        .score
    ).not.toBeNull();
    // Two missing components: withheld under any weights.
    expect(
      computeScenarioScore({ hazardExposure: 90, socialVulnerability: null, outageBurden: null })
        .score
    ).toBeNull();
  });
});

describe("need vs feasibility matrix placement", () => {
  it("plots only counties with both values", () => {
    expect(matrixPosition(null, 50)).toEqual({ plottable: false });
    expect(matrixPosition(60, null)).toEqual({ plottable: false });
    const ok = matrixPosition(80, 20);
    expect(ok.plottable).toBe(true);
  });

  it("classifies quadrants deterministically", () => {
    expect(matrixPosition(80, 80)).toMatchObject({ quadrant: "higherNeedHigherFeasibility", x: 80 });
    expect(matrixPosition(70, 10)).toMatchObject({ quadrant: "higherNeedLowerFeasibility" });
    expect(matrixPosition(20, 90)).toMatchObject({ quadrant: "lowerNeedHigherFeasibility" });
    expect(matrixPosition(10, 10)).toMatchObject({ quadrant: "lowerNeedLowerFeasibility" });
  });

  it("labels every quadrant with non-color text", () => {
    for (const label of Object.values(QUADRANT_LABELS)) {
      expect(label.length).toBeGreaterThan(5);
    }
  });
});
