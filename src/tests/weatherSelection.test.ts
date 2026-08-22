import { describe, expect, it } from "vitest";
import { selectWeatherResult } from "@/lib/data/weatherSelection";
import { buildStatewideOperationalContext } from "@/lib/scoring/operationalContext";
import type { WeatherApiResult } from "@/types/api";
import type { GridStrainResult } from "@/types/api";

function weather(
  overrides: Partial<WeatherApiResult> = {},
  fetchedAt = "2026-08-20T00:00:00.000Z"
): WeatherApiResult {
  return {
    countyFips: "48001",
    highTempF: 90,
    lowTempF: 70,
    maxWindMph: 10,
    precipInches: 0,
    cloudCoverPercent: null,
    fetchedAt,
    quality: "cached",
    sourceName: "test",
    lastUpdated: fetchedAt,
    limitation: "test",
    ...overrides,
  };
}

const now = Date.parse("2026-08-21T00:00:00.000Z");

describe("selectWeatherResult", () => {
  it("prefers live data untouched", () => {
    const live = weather({ quality: "live" });
    expect(selectWeatherResult(live, undefined, now)).toBe(live);
  });

  it("labels old cache as stale when live is unavailable", () => {
    const live = weather({ quality: "unavailable" });
    const cached = weather({}, "2026-05-23T04:42:55.000Z");
    const result = selectWeatherResult(live, cached, now);
    expect(result.quality).toBe("stale");
  });

  it("keeps fresh cache quality within the freshness window", () => {
    const live = weather({ quality: "unavailable" });
    const cached = weather({}, "2026-08-20T12:00:00.000Z");
    expect(selectWeatherResult(live, cached, now).quality).toBe("cached");
  });

  it("returns the unavailable live result when no cache exists", () => {
    const live = weather({ quality: "unavailable" });
    expect(selectWeatherResult(live, undefined, now).quality).toBe("unavailable");
  });
});

function gridStrain(score: number): GridStrainResult {
  return {
    region: "ERCOT",
    currentDemandMw: null,
    forecastPeakDemandMw: null,
    gridStrainScore: score,
    fetchedAt: "2026-08-20T00:00:00.000Z",
    quality: "fallback",
    sourceName: "test",
    lastUpdated: "2026-08-20T00:00:00.000Z",
    limitation: "test",
  };
}

describe("buildStatewideOperationalContext", () => {
  it("uses the median across counties, not a single arbitrary county", () => {
    const weathers = [
      weather({ highTempF: 105 }, "2026-08-20T00:00:00.001Z"), // hot -> high stress
      weather({ highTempF: 70 }),
      weather({ highTempF: 72 }),
      weather({ highTempF: 74 }),
      weather({ highTempF: 76 }),
    ];
    const context = buildStatewideOperationalContext(weathers, gridStrain(50));
    const individual = weathers.map((w) => w.highTempF);
    // Median county is 72°F; a single-county reading would be 105°F.
    expect(individual[0]).toBe(105);
    expect(context.weatherStressScore).toBeLessThan(40);
    expect(context.weatherStressBasis).toMatch(/Median of 5/i);
  });

  it("reports bundle staleness in the basis and honors oldest asOf", () => {
    const weathers = [
      weather({ highTempF: 80 }, "2026-05-01T00:00:00.000Z"),
      weather({ highTempF: 82 }, "2026-08-20T00:00:00.000Z"),
    ];
    const context = buildStatewideOperationalContext(weathers, gridStrain(50));
    expect(context.weatherStressBasis).toMatch(/stale/i);
    expect(context.asOf).toBe("2026-05-01T00:00:00.000Z");
  });

  it("never lets operational context carry structural fields", () => {
    const context = buildStatewideOperationalContext(
      [weather()],
      gridStrain(50)
    );
    expect(context).not.toHaveProperty("structuralNeedScore");
    expect(context).not.toHaveProperty("feasibilityScore");
  });
});
