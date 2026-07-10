import { describe, expect, it } from "vitest";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { calculateFeasibility } from "@/lib/scoring/feasibility";
import { getPlanningLabel } from "@/lib/scoring/labels";

describe("structuralNeed", () => {
  it("withholds composite when more than one component missing", () => {
    const result = calculateStructuralNeed({
      countyFips: "48001",
      structuralNeedScore: null,
      components: {
        hazardExposure: {
          value: 80,
          quality: "estimated",
          source: "fema_nri",
          vintage: "2025",
          explanation: "test",
        },
        socialVulnerability: {
          value: null,
          quality: "unavailable",
          source: "cdc_svi",
          vintage: "2022",
          explanation: "missing",
        },
        outageBurden: {
          value: null,
          quality: "unavailable",
          source: "eagle_i",
          vintage: "2014-2022",
          explanation: "missing",
        },
      },
      missingComponents: ["socialVulnerability", "outageBurden"],
      quality: "estimated",
    });
    expect(result.score).toBeNull();
  });

  it("computes equal-weight average when components available", () => {
    const result = calculateStructuralNeed({
      countyFips: "48001",
      structuralNeedScore: null,
      components: {
        hazardExposure: {
          value: 90,
          quality: "estimated",
          source: "fema_nri",
          vintage: "2025",
          explanation: "test",
        },
        socialVulnerability: {
          value: 60,
          quality: "estimated",
          source: "cdc_svi",
          vintage: "2022",
          explanation: "test",
        },
        outageBurden: {
          value: 30,
          quality: "estimated",
          source: "eagle_i",
          vintage: "2014-2022",
          explanation: "test",
        },
      },
      missingComponents: [],
      quality: "estimated",
    });
    expect(result.score).toBe(60);
  });
});

describe("planning labels", () => {
  it("uses Highest not Critical", () => {
    expect(getPlanningLabel(85)).toBe("Highest");
  });
});

describe("feasibility", () => {
  it("marks imputed solar as estimated quality", () => {
    const result = calculateFeasibility({
      countyFips: "48001",
      feasibilityScore: 50,
      components: {
        solarResource: {
          value: 50,
          quality: "estimated",
          source: "nrel_pvwatts",
          vintage: "2026",
          explanation: "test",
          imputed: true,
        },
      },
      quality: "estimated",
    });
    expect(result.quality).toBe("estimated");
    expect(result.score).toBe(50);
  });
});
