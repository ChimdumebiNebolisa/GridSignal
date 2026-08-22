import { describe, expect, it } from "vitest";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { calculateFeasibility } from "@/lib/scoring/feasibility";
import { getPlanningLabel } from "@/lib/scoring/labels";
import { percentileRank } from "@/lib/scoring/normalize";
import {
  weightedStructuralScore,
  type StructuralComponentKey,
} from "@/lib/scoring/validationMetrics";
import type { CountyStructuralNeedRecord } from "@/types/county";

const COMPONENT_KEYS: StructuralComponentKey[] = [
  "hazardExposure",
  "socialVulnerability",
  "outageBurden",
];

function recordWith(
  values: Partial<Record<StructuralComponentKey, number | null>>
): CountyStructuralNeedRecord {
  const missing: string[] = [];
  const components = Object.fromEntries(
    COMPONENT_KEYS.map((key) => {
      const value = values[key] !== undefined ? values[key] : 50;
      if (value === null) missing.push(key);
      return [
        key,
        {
          value,
          quality: value === null ? ("unavailable" as const) : ("estimated" as const),
          source: "test",
          vintage: "test",
          explanation: "test",
        },
      ];
    })
  );
  return {
    countyFips: "48001",
    structuralNeedScore: null,
    components: components as CountyStructuralNeedRecord["components"],
    missingComponents: missing,
    quality: "estimated",
  };
}

describe("structural need withholding boundary", () => {
  it("scores when all three components are present", () => {
    const result = calculateStructuralNeed(recordWith({}));
    expect(result.score).not.toBeNull();
    expect(result.noScoreReason).toBeNull();
  });

  it("still scores with exactly one missing component (exclude-and-reweight)", () => {
    const result = calculateStructuralNeed(
      recordWith({ socialVulnerability: null })
    );
    // (50 + 50) / 2 = 50 after renormalization
    expect(result.score).toBe(50);
    expect(result.noScoreReason).toBeNull();
    expect(result.missingComponents).toEqual(["socialVulnerability"]);
  });

  it("withholds with two missing components and exposes the reason", () => {
    const result = calculateStructuralNeed(
      recordWith({ socialVulnerability: null, outageBurden: null })
    );
    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
    expect(result.noScoreReason).toBe("missing_components");
  });

  it("reports 'unavailable' (not missing_components) with zero components", () => {
    const result = calculateStructuralNeed(recordWith({
      hazardExposure: null,
      socialVulnerability: null,
      outageBurden: null,
    }));
    expect(result.score).toBeNull();
    expect(result.noScoreReason).toBe("unavailable");
  });
});

describe("zero versus missing semantics", () => {
  it("treats 0 as an observed value that participates in scoring", () => {
    const result = calculateStructuralNeed(
      recordWith({ hazardExposure: 0, socialVulnerability: 100, outageBurden: 100 })
    );
    expect(result.score).toBe(67); // round(200/3)
  });

  it("excludes null rather than imputing neutral 50", () => {
    const withNull = calculateStructuralNeed(
      recordWith({ hazardExposure: null, socialVulnerability: 80, outageBurden: 40 })
    );
    expect(withNull.score).toBe(60); // (80+40)/2, not (50+80+40)/3 = 57
  });

  it("a zero component pulls the score down while a missing one does not", () => {
    const zeroed = calculateStructuralNeed(
      recordWith({ hazardExposure: 0, socialVulnerability: 90, outageBurden: 90 })
    );
    const nulled = calculateStructuralNeed(
      recordWith({ hazardExposure: null, socialVulnerability: 90, outageBurden: 90 })
    );
    const zeroedScore = zeroed.score as number;
    const nulledScore = nulled.score as number;
    expect(zeroedScore).toBeLessThan(nulledScore);
    expect(nulledScore).toBe(90);
    expect(zeroedScore).toBe(60);
  });
});

describe("weightedStructuralScore mirrors the canonical scorer", () => {
  const grid = [null, 0, 17, 33, 50, 66, 84, 100];
  const cases: Array<Record<StructuralComponentKey, number | null>> = [];
  for (const h of grid) {
    for (const s of grid) {
      for (const o of grid) {
        cases.push({ hazardExposure: h, socialVulnerability: s, outageBurden: o });
      }
    }
  }

  it("matches calculateStructuralNeed over a 512-case input grid", () => {
    for (const values of cases) {
      const expected = calculateStructuralNeed(recordWith(values)).score;
      const actual = weightedStructuralScore(values);
      expect(actual).toBe(expected);
    }
  });

  it("renormalizes weights across available components only", () => {
    expect(weightedStructuralScore({
      hazardExposure: 90,
      socialVulnerability: null,
      outageBurden: 30,
    })).toBe(60);
  });
});

describe("planning label thresholds", () => {
  it.each([
    [0, "Lower"],
    [39, "Lower"],
    [40, "Moderate"],
    [59, "Moderate"],
    [60, "Elevated"],
    [79, "Elevated"],
    [80, "Highest"],
    [100, "Highest"],
  ] as const)("label(%i) === %s", (score, label) => {
    expect(getPlanningLabel(score)).toBe(label);
  });

  it("never returns Critical (legacy label retired)", () => {
    expect(getPlanningLabel(95)).not.toBe("Critical");
  });
});

describe("percentileRank tie behavior is deterministic mid-rank", () => {
  it("assigns tied values identical scores regardless of list order", () => {
    const a = percentileRank(50, [10, 50, 50, 50, 90]);
    const b = percentileRank(50, [90, 50, 50, 50, 10]);
    expect(a).toBe(b);
  });

  it("mid-rank of the middle tied element is 50", () => {
    expect(percentileRank(50, [10, 50, 50, 50, 90])).toBe(50);
  });
});

describe("feasibility null propagation", () => {
  it("withholds score when solar resource is null", () => {
    const result = calculateFeasibility({
      countyFips: "48001",
      feasibilityScore: null,
      components: {
        solarResource: {
          value: null,
          quality: "unavailable",
          source: "synthetic_solar",
          vintage: "synthetic-v1",
          explanation: "unavailable",
        },
      },
      quality: "unavailable",
    });
    expect(result.score).toBeNull();
    expect(result.noScoreReason).toBe("unavailable");
    expect(result.label).toBeNull();
  });
});
