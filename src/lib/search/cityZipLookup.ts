/**
 * GridSignal Texas — City/ZIP to county lookup
 * Uses static JSON lookup files for city→county and ZIP→county mapping.
 */

import type { SearchResult } from "@/types/county";

export type CityLookupEntry = {
  countyFips: string;
  countyName: string;
};

export type ZipLookupEntry = {
  countyFips: string;
  countyName: string;
};

/**
 * Look up a city name in the static city-to-county map.
 */
export function lookupCity(
  cityName: string,
  cityMap: Record<string, CityLookupEntry>
): SearchResult | null {
  const normalized = cityName.trim();

  // Try exact match (case-insensitive)
  for (const [city, entry] of Object.entries(cityMap)) {
    if (city.toLowerCase() === normalized.toLowerCase()) {
      return {
        countyFips: entry.countyFips,
        displayName: `${city} → ${entry.countyName}`,
        matchType: "city",
        confidence: "approximate",
      };
    }
  }

  return null;
}

/**
 * Look up a ZIP code in the static zip-to-county map.
 */
export function lookupZip(
  zip: string,
  zipMap: Record<string, ZipLookupEntry>
): SearchResult | null {
  const normalized = zip.trim();
  const entry = zipMap[normalized];

  if (!entry) return null;

  return {
    countyFips: entry.countyFips,
    displayName: `ZIP ${normalized} → ${entry.countyName}`,
    matchType: "zip",
    confidence: "approximate",
  };
}

/**
 * Check if a string looks like a ZIP code (5 digits).
 */
export function isZipCode(query: string): boolean {
  return /^\d{5}$/.test(query.trim());
}
