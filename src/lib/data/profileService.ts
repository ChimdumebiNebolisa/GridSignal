/**
 * Shared profile builder for API routes
 */

import {
  getCountyStaticProfiles,
  getSolarCache,
  getWeatherCache,
} from "@/lib/data/counties";
import { mergeCountyProfile, mergeAllCountyProfiles } from "@/lib/data/mergeCountyProfile";
import { fetchGridStrain } from "@/lib/api/eia";
import type { CountyEnergyProfile } from "@/types/county";
import type { GridStrainResult } from "@/types/api";

let profilesCache: CountyEnergyProfile[] | null = null;
let gridStrainCache: GridStrainResult | null = null;

export async function getSharedGridStrain(): Promise<GridStrainResult> {
  if (!gridStrainCache) {
    gridStrainCache = await fetchGridStrain();
  }
  return gridStrainCache;
}

export async function buildAllCountyProfiles(): Promise<CountyEnergyProfile[]> {
  if (profilesCache) return profilesCache;

  const bases = getCountyStaticProfiles();
  const solarCache = getSolarCache();
  const weatherCache = getWeatherCache();
  const gridStrain = await getSharedGridStrain();

  const weatherByFips = new Map(weatherCache.map((w) => [w.countyFips, w]));

  profilesCache = mergeAllCountyProfiles(bases, weatherByFips, solarCache, gridStrain);
  return profilesCache;
}

export async function buildCountyProfileByFips(
  fips: string
): Promise<CountyEnergyProfile | null> {
  const base = getCountyStaticProfiles().find((c) => c.countyFips === fips);
  if (!base) return null;

  const weather =
    getWeatherCache().find((w) => w.countyFips === fips) ?? {
      countyFips: fips,
      highTempF: null,
      lowTempF: null,
      maxWindMph: null,
      precipInches: null,
      cloudCoverPercent: null,
      fetchedAt: new Date().toISOString(),
      quality: "estimated" as const,
    };

  const gridStrain = await getSharedGridStrain();

  return mergeCountyProfile({
    base,
    weather,
    solarCache: getSolarCache(),
    gridStrain,
  });
}

export type MapCountySummary = {
  countyFips: string;
  countyName: string;
  backupPriorityScore: number;
  backupPriorityLabel: string;
  weatherRiskScore: number;
  solarPotentialScore: number;
  demandExposureScore: number;
  statewideGridStrainScore: number;
  dataQuality: CountyEnergyProfile["dataQuality"];
};

export async function buildMapSummaries(): Promise<MapCountySummary[]> {
  const profiles = await buildAllCountyProfiles();
  return profiles.map((p) => ({
    countyFips: p.countyFips,
    countyName: p.countyName,
    backupPriorityScore: p.backupPriorityScore,
    backupPriorityLabel: p.backupPriorityLabel,
    weatherRiskScore: p.weatherRiskScore,
    solarPotentialScore: p.solarPotentialScore,
    demandExposureScore: p.demandExposureScore,
    statewideGridStrainScore: p.statewideGridStrainScore,
    dataQuality: p.dataQuality,
  }));
}
