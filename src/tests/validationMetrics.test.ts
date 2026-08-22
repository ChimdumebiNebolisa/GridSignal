import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  computeValidationSummary,
  rankStabilityShare,
  weightedStructuralScore,
} from "@/lib/scoring/validationMetrics";
import type { CountyStructuralNeedRecord } from "@/types/county";

const structural = JSON.parse(
  readFileSync(resolve(process.cwd(), "src", "data", "indicators/county-structural-need.json"), "utf-8")
) as CountyStructuralNeedRecord[];
const populations = JSON.parse(
  readFileSync(resolve(process.cwd(), "src", "data", "county-population.json"), "utf-8")
) as { countyFips: string; population: number }[];

const popMap = new Map(populations.map((p) => [p.countyFips, p.population]));

describe("sensitivity analysis reproducibility", () => {
  it("produces byte-identical summaries across repeated runs", () => {
    const a = computeValidationSummary(structural, popMap);
    const b = computeValidationSummary(structural, popMap);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("reproduces documented anchors on the current authoritative bundle", () => {
    const summary = computeValidationSummary(structural, popMap);
    expect(summary.scoredCounties).toBe(254);
    // Anchors for the real-data bundle (FEMA NRI + CDC SVI; EAGLE-I blocked).
    // Outcome-proxy correlation is structurally n/a -> spearmanRho over an
    // empty pairing is 0 by definition.
    expect(summary.rhoOutageBurden).toBe(0);
    expect(summary.rhoPopulation).toBeCloseTo(0.801, 2);
    expect(summary.hazardWeightStabilityMin).toBeCloseTo(0.665, 2);
    expect(summary.compositePublishDecision).toBe("WITHHOLD");
  });

  it("keeps every stability share within [0, 1]", () => {
    const summary = computeValidationSummary(structural, popMap);
    for (const row of summary.weightSweeps) {
      expect(row.stableShare).toBeGreaterThanOrEqual(0);
      expect(row.stableShare).toBeLessThanOrEqual(1);
    }
    for (const row of summary.leaveOneOut) {
      expect(row.stableShare).toBeGreaterThanOrEqual(0);
      expect(row.stableShare).toBeLessThanOrEqual(1);
    }
  });

  it("covers all three structural components in sweeps and leave-one-out", () => {
    const summary = computeValidationSummary(structural, popMap);
    const expectedComponents = [
      "hazardExposure",
      "socialVulnerability",
      "outageBurden",
    ];
    // 3 components x 4 deltas (-20%, -10%, +10%, +20%)
    expect(summary.weightSweeps).toHaveLength(12);
    expect([...new Set(summary.weightSweeps.map((r) => r.component))]).toEqual(
      expectedComponents
    );
    for (const component of expectedComponents) {
      expect(
        summary.weightSweeps.filter((r) => r.component === component).map((r) => r.delta)
      ).toEqual([-0.2, -0.1, 0.1, 0.2]);
    }
    expect(summary.leaveOneOut.map((r) => r.component)).toEqual(expectedComponents);
  });
});

describe("rank stability helper", () => {
  it("returns perfect stability for identical inputs", () => {
    const scores = new Map<string, number | null>([
      ["48001", 90],
      ["48003", 50],
      ["48005", 10],
    ]);
    expect(rankStabilityShare(scores, new Map(scores))).toBe(1);
  });

  it("counts rank shifts beyond tolerance as unstable", () => {
    const base = new Map<string, number | null>([
      ...Array.from({ length: 12 }, (_, i) => [`f${i}`, 100 - i] as [string, number]),
    ]);
    const perturbed = new Map(base);
    perturbed.set("f0", 88); // drops from rank 0 to rank 11
    expect(rankStabilityShare(base, perturbed, 5)).toBe(11 / 12);
  });
});
