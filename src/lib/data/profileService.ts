/**
 * Shared profile builder for API routes (v2)
 */

import "server-only";
import {
  getCountyStaticProfiles,
  getSolarCache,
  getWeatherCache,
} from "@/lib/data/counties";
import { mergeCountyProfile, mergeAllCountyProfiles } from "@/lib/data/mergeCountyProfile";
import { fetchGridStrain } from "@/lib/api/eia";
import { buildOperationalContext } from "@/lib/scoring/operationalContext";
import type { CountyEnergyProfile, MapCountySummary, OperationalContext } from "@/types/county";

let profilesCache: CountyEnergyProfile[] | null = null;
const PROFILES_CACHE_TTL_MS = 15 * 60 * 1000;
let profilesCacheTimestamp = 0;

function estimatedWeather(countyFips: string) {
  const fetchedAt = new Date().toISOString();
  return {
    countyFips,
    highTempF: null,
    lowTempF: null,
    maxWindMph: null,
    precipInches: null,
    cloudCoverPercent: null,
    fetchedAt,
    quality: "estimated" as const,
    sourceName: "Estimated weather fallback",
    lastUpdated: fetchedAt,
    limitation:
      "Weather data unavailable for this county profile; using neutral planning estimate.",
  };
}

/** Delegates to eia.ts 15-minute TTL cache — no indefinite pinning */
export async function getSharedGridStrain() {
  return fetchGridStrain();
}

export async function buildAllCountyProfiles(): Promise<CountyEnergyProfile[]> {
  const now = Date.now();
  if (profilesCache && now - profilesCacheTimestamp < PROFILES_CACHE_TTL_MS) {
    return profilesCache;
  }

  const bases = getCountyStaticProfiles();
  const solarCache = getSolarCache();
  const weatherCache = getWeatherCache();
  const gridStrain = await getSharedGridStrain();

  const weatherByFips = new Map(weatherCache.map((w) => [w.countyFips, w]));

  profilesCache = mergeAllCountyProfiles(bases, weatherByFips, solarCache, gridStrain);
  profilesCacheTimestamp = now;
  return profilesCache;
}

export async function buildCountyProfileByFips(
  fips: string
): Promise<CountyEnergyProfile | null> {
  const base = getCountyStaticProfiles().find((c) => c.countyFips === fips);
  if (!base) return null;

  const weather =
    getWeatherCache().find((w) => w.countyFips === fips) ?? estimatedWeather(fips);

  const gridStrain = await getSharedGridStrain();

  return mergeCountyProfile({
    base,
    weather,
    solarCache: getSolarCache(),
    gridStrain,
  });
}

export type { MapCountySummary };

export async function buildMapSummaries(): Promise<MapCountySummary[]> {
  const profiles = await buildAllCountyProfiles();
  return profiles.map((p) => ({
    countyFips: p.countyFips,
    countyName: p.countyName,
    structuralNeedScore: p.structuralNeed.score,
    structuralNeedLabel: p.structuralNeed.label,
    feasibilityScore: p.feasibility.score,
    feasibilityLabel: p.feasibility.label,
    weatherStressScore: p.operationalContext.weatherStressScore,
    backupPriorityScore: p.backupPriorityScore,
    backupPriorityLabel: p.backupPriorityLabel,
    weatherRiskScore: p.weatherRiskScore,
    solarPotentialScore: p.solarPotentialScore,
    demandExposureScore: p.demandExposureScore,
    statewideGridStrainScore: p.statewideGridStrainScore,
    dataQuality: p.dataQuality,
  }));
}

export async function buildOperationalContextSummary(): Promise<OperationalContext> {
  const weatherCache = getWeatherCache();
  const sampleWeather = weatherCache[0] ?? estimatedWeather("48001");
  const gridStrain = await getSharedGridStrain();
  return buildOperationalContext(sampleWeather, gridStrain);
}
