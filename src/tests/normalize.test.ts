import { describe, expect, it } from "vitest";
import {
  normalizeWeatherRisk,
  normalizeSolarPotential,
  normalizeDemandExposure,
  normalizeGridStrain,
  percentileRank,
} from "@/lib/scoring/normalize";
import type { WeatherApiResult, GridStrainResult } from "@/types/api";
import type { SolarCacheEntry } from "@/types/county";

function weatherFixture(
  overrides: Partial<WeatherApiResult> = {}
): WeatherApiResult {
  const fetchedAt = new Date().toISOString();
  return {
    countyFips: "48113",
    highTempF: null,
    lowTempF: null,
    maxWindMph: null,
    precipInches: null,
    cloudCoverPercent: null,
    fetchedAt,
    quality: "cached",
    sourceName: "Test weather source",
    lastUpdated: fetchedAt,
    limitation: "Test weather limitation.",
    ...overrides,
  };
}

function gridFixture(
  overrides: Partial<GridStrainResult> = {}
): GridStrainResult {
  const fetchedAt = new Date().toISOString();
  return {
    region: "EIA_BalancingAuthority",
    currentDemandMw: 45000,
    forecastPeakDemandMw: 50000,
    gridStrainScore: 72,
    fetchedAt,
    quality: "cached",
    sourceName: "Test grid source",
    lastUpdated: fetchedAt,
    limitation: "Test grid limitation.",
    ...overrides,
  };
}

describe("percentileRank", () => {
  it("returns 0-100", () => {
    expect(percentileRank(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBeGreaterThanOrEqual(0);
    expect(percentileRank(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBeLessThanOrEqual(100);
  });
});

describe("normalizeWeatherRisk", () => {
  it("returns estimated neutral with imputed flag when all inputs null", () => {
    const weather = weatherFixture({
      quality: "unavailable",
    });
    const result = normalizeWeatherRisk(weather);
    expect(result.value).toBe(50);
    expect(result.quality).toBe("estimated");
    expect(result.imputed).toBe(true);
  });

  it("scores high heat higher", () => {
    const hot = weatherFixture({
      highTempF: 105,
      lowTempF: 80,
      maxWindMph: 10,
      precipInches: 0,
    });
    const mild: WeatherApiResult = { ...hot, highTempF: 75 };
    expect(normalizeWeatherRisk(hot).value).toBeGreaterThan(
      normalizeWeatherRisk(mild).value
    );
  });
});

describe("normalizeSolarPotential", () => {
  const cache: SolarCacheEntry[] = [
    { countyFips: "48001", annualAcKwh: 1000, systemCapacityKw: 4, fetchedAt: "", quality: "cached" },
    { countyFips: "48003", annualAcKwh: 5000, systemCapacityKw: 4, fetchedAt: "", quality: "cached" },
    { countyFips: "48005", annualAcKwh: 9000, systemCapacityKw: 4, fetchedAt: "", quality: "cached" },
  ];

  it("ranks higher solar counties higher", () => {
    const low = normalizeSolarPotential("48001", cache);
    const high = normalizeSolarPotential("48005", cache);
    expect(high.value).toBeGreaterThan(low.value);
  });

  it("uses neutral 50 when missing", () => {
    const result = normalizeSolarPotential("99999", cache);
    expect(result.value).toBe(50);
    expect(result.quality).toBe("estimated");
  });
});

describe("normalizeDemandExposure", () => {
  it("ranks larger populations higher", () => {
    const pops = [1000, 50000, 100000, 500000, 2000000];
    const low = normalizeDemandExposure(1000, pops);
    const high = normalizeDemandExposure(2000000, pops);
    expect(high.value).toBeGreaterThan(low.value);
  });
});

describe("normalizeGridStrain", () => {
  it("labels statewide context in explanation", () => {
    const grid = gridFixture();
    const result = normalizeGridStrain(grid);
    expect(result.explanation).toMatch(/statewide/i);
    expect(result.value).toBe(72);
  });

  it("preserves fallback grid quality", () => {
    const grid = gridFixture({
      currentDemandMw: null,
      forecastPeakDemandMw: null,
      gridStrainScore: 50,
      quality: "fallback",
    });
    const result = normalizeGridStrain(grid);
    expect(result.value).toBe(50);
    expect(result.quality).toBe("fallback");
  });
});
