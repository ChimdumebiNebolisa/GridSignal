import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { deriveProfileTimestamps } from "@/lib/data/timestamps";
import { buildDataQualitySummary } from "@/lib/data/dataQuality";
import { mergeCountyProfile } from "@/lib/data/mergeCountyProfile";
import { getSampleGridStrain, getSolarCache, getWeatherCache } from "@/lib/data/counties";
import type { CountyBaseRecord } from "@/types/county";
import type { WeatherApiResult } from "@/types/api";

describe("deriveProfileTimestamps", () => {
  it("uses oldest fetchedAt as lastUpdated", () => {
    const { lastUpdated, profileAssembledAt } = deriveProfileTimestamps([
      "2026-05-23T04:42:55.000Z",
      "2026-07-10T12:00:00.000Z",
    ]);
    expect(lastUpdated).toBe("2026-05-23T04:42:55.000Z");
    expect(profileAssembledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("buildDataQualitySummary", () => {
  it("excludes utility unavailable from overall score quality", () => {
    const summary = buildDataQualitySummary("cached", "cached", "live", "unavailable");
    expect(summary.overall).toBe("cached");
    expect(summary.contextQuality).toBe("unavailable");
  });
});

describe("mergeCountyProfile timestamps", () => {
  it("lastUpdated reflects bundled weather fetchedAt not merge time", () => {
    const weatherCache = getWeatherCache();
    const staleWeather = weatherCache[0];
    const base: CountyBaseRecord = {
      countyFips: staleWeather.countyFips,
      countyName: "Test County",
      state: "TX",
      centroidLat: 30,
      centroidLon: -97,
      population: 100000,
      likelyUtilityTerritories: [],
      utilityContextQuality: "unknown",
      gridRegion: "ERCOT",
      countyGeometryId: staleWeather.countyFips,
    };

    const profile = mergeCountyProfile({
      base,
      weather: staleWeather as WeatherApiResult,
      solarCache: getSolarCache(),
      gridStrain: getSampleGridStrain(),
    });

    const grid = getSampleGridStrain();
    const manifestGenerated = profile.dataManifestVersion;

    expect(profile.lastUpdated).not.toBe(profile.profileAssembledAt);
    expect(
      [staleWeather.fetchedAt, grid.fetchedAt].includes(profile.lastUpdated)
    ).toBe(true);
    expect(manifestGenerated).toBe("2.0.0");
  });
});

describe("getSharedGridStrain delegates to eia TTL cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("delegates to fetchGridStrain without profileService-level indefinite cache", async () => {
    vi.stubEnv("EIA_API_KEY", "");
    const eia = await import("@/lib/api/eia");
    const fetchSpy = vi.spyOn(eia, "fetchGridStrain");

    const { getSharedGridStrain } = await import("@/lib/data/profileService");
    await getSharedGridStrain();
    await getSharedGridStrain();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
