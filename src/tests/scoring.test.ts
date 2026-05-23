import { describe, expect, it } from "vitest";
import { calculateBackupPriorityScore } from "@/lib/scoring/scoreCounty";
import { getBackupPriorityLabel } from "@/lib/scoring/labels";
import { LABEL_THRESHOLDS } from "@/types/scoring";
import type { ScoreInput } from "@/types/county";

function input(value: number): ScoreInput {
  return { value, quality: "cached", explanation: "test" };
}

describe("calculateBackupPriorityScore", () => {
  it("applies the fixed weighted formula", () => {
    const result = calculateBackupPriorityScore({
      weatherRisk: input(80),
      solarPotential: input(60),
      demandExposure: input(40),
      gridStrain: input(50),
    });
    expect(result.score).toBe(
      Math.round(0.3 * 80 + 0.25 * 60 + 0.25 * 40 + 0.2 * 50)
    );
    expect(result.score).toBe(59);
  });

  it("clamps final score to 0-100", () => {
    const high = calculateBackupPriorityScore({
      weatherRisk: input(100),
      solarPotential: input(100),
      demandExposure: input(100),
      gridStrain: input(100),
    });
    expect(high.score).toBe(100);

    const low = calculateBackupPriorityScore({
      weatherRisk: input(0),
      solarPotential: input(0),
      demandExposure: input(0),
      gridStrain: input(0),
    });
    expect(low.score).toBe(0);
  });
});

describe("getBackupPriorityLabel", () => {
  it("uses exact thresholds", () => {
    expect(getBackupPriorityLabel(39)).toBe("Low");
    expect(getBackupPriorityLabel(LABEL_THRESHOLDS.medium)).toBe("Medium");
    expect(getBackupPriorityLabel(59)).toBe("Medium");
    expect(getBackupPriorityLabel(LABEL_THRESHOLDS.high)).toBe("High");
    expect(getBackupPriorityLabel(79)).toBe("High");
    expect(getBackupPriorityLabel(LABEL_THRESHOLDS.critical)).toBe("Critical");
    expect(getBackupPriorityLabel(100)).toBe("Critical");
  });
});
