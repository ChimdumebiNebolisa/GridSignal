import { describe, expect, it, vi } from "vitest";
import { getSampleGridStrain } from "@/lib/data/counties";

describe("eia adapter fallback", () => {
  it("returns valid grid strain shape from sample fallback", async () => {
    const sample = getSampleGridStrain();
    expect(sample.gridStrainScore).toBeGreaterThanOrEqual(0);
    expect(sample.gridStrainScore).toBeLessThanOrEqual(100);
    expect(sample.quality).toBe("fallback");
    expect(sample.limitation).toMatch(/not county-level/i);
  });

  it("fetchGridStrain uses fallback without API key", async () => {
    vi.stubEnv("EIA_API_KEY", "");
    vi.resetModules();
    const { fetchGridStrain } = await import("@/lib/api/eia");
    const result = await fetchGridStrain();
    expect(result.quality).toBe("fallback");
    vi.unstubAllEnvs();
  });
});
