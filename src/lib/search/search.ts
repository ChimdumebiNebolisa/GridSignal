/**
 * GridSignal Texas — Unified search (county, city, ZIP)
 */

import type { SearchResult } from "@/types/county";
import { searchCountyNames } from "./countySearch";
import { lookupCity, lookupZip, isZipCode } from "./cityZipLookup";
import {
  getCityToCountyMap,
  getCountyCentroids,
  getZipToCountyMap,
} from "@/lib/data/counties";

export function searchAll(query: string, limit = 10): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const counties = getCountyCentroids();
  const results: SearchResult[] = [];
  const seenFips = new Set<string>();

  const add = (result: SearchResult) => {
    const key = `${result.matchType}:${result.countyFips}:${result.displayName}`;
    if (seenFips.has(key)) return;
    seenFips.add(key);
    results.push(result);
  };

  if (isZipCode(trimmed)) {
    const zipResult = lookupZip(trimmed, getZipToCountyMap());
    if (zipResult) add(zipResult);
  }

  const cityResult = lookupCity(trimmed, getCityToCountyMap());
  const countyResults = searchCountyNames(trimmed, counties, limit);
  const exactNamesakeCounty = countyResults.find(
    (r) =>
      r.confidence === "exact" &&
      r.displayName.toLowerCase() === `${trimmed.toLowerCase()} county`
  );

  const preferCityFirst =
    cityResult &&
    exactNamesakeCounty &&
    exactNamesakeCounty.countyFips !== cityResult.countyFips &&
    !trimmed.toLowerCase().includes("county");

  if (preferCityFirst && cityResult) {
    add(cityResult);
  }

  for (const countyResult of countyResults) {
    add(countyResult);
  }

  if (cityResult && !preferCityFirst) {
    add(cityResult);
  }

  return results.slice(0, limit);
}

export { getCountyCentroids };
