import { describe, expect, it } from "vitest";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { calculateFeasibility } from "@/lib/scoring/feasibility";

const component = (value: number | null) => ({
  value,
  quality: value === null ? ("unavailable" as const) : ("estimated" as const),
  source: "test",
  vintage: "2026",
  explanation: "test",
});

describe("canonical two-axis scoring", () => {
  it("computes the equal-weight structural need score", () => {
    const result = calculateStructuralNeed({
      countyFips: "48001",
      structuralNeedScore: null,
      components: {
        hazardExposure: component(90),
        socialVulnerability: component(60),
        outageBurden: component(30),
      },
      missingComponents: [],
      quality: "estimated",
    });
    expect(result.score).toBe(60);
    expect(result.label).toBe("Elevated");
    expect(result.noScoreReason).toBeNull();
  });

  it("withholds structural need when more than one component is missing", () => {
    const result = calculateStructuralNeed({
      countyFips: "48001",
      structuralNeedScore: null,
      components: {
        hazardExposure: component(80),
        socialVulnerability: component(null),
        outageBurden: component(null),
      },
      missingComponents: ["socialVulnerability", "outageBurden"],
      quality: "estimated",
    });
    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
    expect(result.noScoreReason).toBe("missing_components");
  });

  it("returns an unavailable feasibility score rather than zero", () => {
    const result = calculateFeasibility({
      countyFips: "48001",
      feasibilityScore: null,
      components: { solarResource: component(null) },
      quality: "unavailable",
    });
    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
    expect(result.noScoreReason).toBe("unavailable");
  });
});
