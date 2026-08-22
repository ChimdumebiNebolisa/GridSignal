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

  it("falls back when the EIA response schema changes (no data array)", async () => {
    vi.stubEnv("EIA_API_KEY", "test-key");
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ response: { data: "unexpected-shape" } }), {
          status: 200,
        })
      )
    );
    try {
      const { fetchGridStrain } = await import("@/lib/api/eia");
      const result = await fetchGridStrain();
      expect(result.quality).toBe("fallback");
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it("falls back when the upstream request fails", async () => {
    vi.stubEnv("EIA_API_KEY", "test-key");
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    try {
      const { fetchGridStrain } = await import("@/lib/api/eia");
      const result = await fetchGridStrain();
      expect(result.quality).toBe("fallback");
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it("does not expose the key-bearing URL in error messages", async () => {
    const { fetchJson, FetchError } = await import("@/lib/utils/fetchJson");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("denied", { status: 403, statusText: "Forbidden" })
      )
    );
    try {
      await fetchJson("https://example.test/?api_key=SECRET", {}).catch((e) => {
        expect(e).toBeInstanceOf(FetchError);
        expect((e as Error).message).not.toContain("SECRET");
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
