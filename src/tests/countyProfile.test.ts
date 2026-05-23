import { describe, expect, it } from "vitest";
import { mergeCountyProfile } from "@/lib/data/mergeCountyProfile";
import { calculateBackupPriorityScore } from "@/lib/scoring/scoreCounty";
import { runStaticDataValidation } from "@/lib/data/validateStaticData";
import {
  getCountyCentroids,
  getCountyStaticProfiles,
  getSolarCache,
  getTexasGeoJson,
  getWeatherCache,
  getSampleGridStrain,
  TEXAS_COUNTY_COUNT,
} from "@/lib/data/counties";
import type { CountyBaseRecord } from "@/types/county";

describe("static data validation", () => {
  it("has exactly 254 Texas counties", () => {
    const centroids = getCountyCentroids();
    const geo = getTexasGeoJson();
    const validation = runStaticDataValidation({
      countyCount: centroids.length,
      fipsList: centroids.map((c) => c.countyFips),
      centroids,
      geoFips: geo.features
        .map((f) => (f.properties as { GEOID?: string } | null)?.GEOID)
        .filter((fips): fips is string => Boolean(fips)),
    });
    expect(centroids.length).toBe(TEXAS_COUNTY_COUNT);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});

describe("mergeCountyProfile", () => {
  const bases = getCountyStaticProfiles();
  const base: CountyBaseRecord = bases[0];
  const weather =
    getWeatherCache().find((w) => w.countyFips === base.countyFips) ?? {
      countyFips: base.countyFips,
      highTempF: 92,
      lowTempF: 72,
      maxWindMph: 12,
      precipInches: 0.1,
      cloudCoverPercent: null,
      fetchedAt: new Date().toISOString(),
      quality: "cached" as const,
    };
  const solarCache = getSolarCache();
  const gridStrain = getSampleGridStrain();

  it("produces a complete profile", () => {
    const profile = mergeCountyProfile({ base, weather, solarCache, gridStrain });
    expect(profile.backupPriorityScore).toBeGreaterThanOrEqual(0);
    expect(profile.backupPriorityScore).toBeLessThanOrEqual(100);
    expect(profile.countyFips).toBe(base.countyFips);
    expect(profile.recommendation.length).toBeGreaterThan(0);
  });

  it("does not change score when utility territories are added", () => {
    const baseWithUtility: CountyBaseRecord = {
      ...base,
      likelyUtilityTerritories: ["Example Electric Co-op"],
      utilityContextQuality: "static_lookup",
    };
    const without = mergeCountyProfile({ base, weather, solarCache, gridStrain });
    const withUtility = mergeCountyProfile({
      base: baseWithUtility,
      weather,
      solarCache,
      gridStrain,
    });
    expect(withUtility.backupPriorityScore).toBe(without.backupPriorityScore);
  });

  it("final score matches weighted formula", () => {
    const profile = mergeCountyProfile({ base, weather, solarCache, gridStrain });
    const computed = calculateBackupPriorityScore({
      weatherRisk: profile.scoreExplanation.weatherRisk,
      solarPotential: profile.scoreExplanation.solarPotential,
      demandExposure: profile.scoreExplanation.demandExposure,
      gridStrain: profile.scoreExplanation.statewideGridStrain,
    });
    expect(profile.backupPriorityScore).toBe(computed.score);
  });
});
