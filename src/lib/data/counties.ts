/**
 * GridSignal Texas — Static county data loaders
 * Server-side only — reads bundled JSON/GeoJSON files.
 */

import { readFileSync } from "fs";
import path from "path";
import type { FeatureCollection } from "geojson";
import type {
  CountyCentroidRecord,
  CountyPopulationRecord,
  CountyUtilityContextRecord,
  SolarCacheEntry,
} from "@/types/county";
import type { GridStrainResult, WeatherApiResult } from "@/types/api";
import type { CountyBaseRecord } from "@/types/county";
import countyCentroids from "@/data/county-centroids.json";
import countyPopulation from "@/data/county-population.json";
import countyUtilityContext from "@/data/county-utility-context.json";
import countyStaticProfiles from "@/data/county-static-profiles.json";
import solarPotentialCache from "@/data/cache/solar-potential-by-county.json";
import weatherRiskCache from "@/data/cache/weather-risk-by-county.json";
import sampleGridStrain from "@/data/sample-grid-strain.json";
import cityToCounty from "@/data/city-to-county.json";
import zipToCounty from "@/data/zip-to-county.json";

export const TEXAS_COUNTY_COUNT = 254;

let texasGeoJsonCache: FeatureCollection | null = null;

export function getTexasGeoJson(): FeatureCollection {
  if (!texasGeoJsonCache) {
    const filePath = path.join(
      process.cwd(),
      "src",
      "data",
      "texas-counties.geojson"
    );
    texasGeoJsonCache = JSON.parse(
      readFileSync(filePath, "utf-8")
    ) as FeatureCollection;
  }
  return texasGeoJsonCache;
}

export function getCountyCentroids(): CountyCentroidRecord[] {
  return countyCentroids as CountyCentroidRecord[];
}

export function getCountyPopulation(): CountyPopulationRecord[] {
  return countyPopulation as CountyPopulationRecord[];
}

export function getCountyUtilityContext(): CountyUtilityContextRecord[] {
  return countyUtilityContext as CountyUtilityContextRecord[];
}

export function getCountyStaticProfiles(): CountyBaseRecord[] {
  return countyStaticProfiles as CountyBaseRecord[];
}

export function getSolarCache(): SolarCacheEntry[] {
  return solarPotentialCache as SolarCacheEntry[];
}

export function getWeatherCache(): WeatherApiResult[] {
  return weatherRiskCache as WeatherApiResult[];
}

export function getSampleGridStrain(): GridStrainResult {
  return sampleGridStrain as GridStrainResult;
}

export function getCityToCountyMap(): Record<
  string,
  { countyFips: string; countyName: string }
> {
  return cityToCounty as Record<string, { countyFips: string; countyName: string }>;
}

export function getZipToCountyMap(): Record<
  string,
  { countyFips: string; countyName: string }
> {
  return zipToCounty as Record<string, { countyFips: string; countyName: string }>;
}

export function getCentroidByFips(fips: string): CountyCentroidRecord | undefined {
  return getCountyCentroids().find((c) => c.countyFips === fips);
}

export function getPopulationByFips(fips: string): CountyPopulationRecord | undefined {
  return getCountyPopulation().find((c) => c.countyFips === fips);
}

export function getUtilityContextByFips(
  fips: string
): CountyUtilityContextRecord | undefined {
  return getCountyUtilityContext().find((c) => c.countyFips === fips);
}

export function getStaticProfileByFips(fips: string): CountyBaseRecord | undefined {
  return getCountyStaticProfiles().find((c) => c.countyFips === fips);
}

export function getSolarCacheByFips(fips: string): SolarCacheEntry | undefined {
  return getSolarCache().find((c) => c.countyFips === fips);
}

export function getWeatherCacheByFips(fips: string): WeatherApiResult | undefined {
  return getWeatherCache().find((c) => c.countyFips === fips);
}

export function getAllPopulations(): number[] {
  return getCountyPopulation().map((p) => p.population);
}
