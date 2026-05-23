/**
 * GridSignal Texas — County name search
 * Case-insensitive partial match on county names.
 */

import type { SearchResult } from "@/types/county";
import type { CountyCentroidRecord } from "@/types/county";

/**
 * Search county names with case-insensitive partial matching.
 * Returns up to `limit` results.
 */
export function searchCountyNames(
  query: string,
  counties: CountyCentroidRecord[],
  limit: number = 10
): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Exact match first, then starts-with, then contains
  const exact: SearchResult[] = [];
  const startsWith: SearchResult[] = [];
  const contains: SearchResult[] = [];

  for (const county of counties) {
    const name = county.countyName.toLowerCase();
    // Also match without "county" suffix
    const nameNoSuffix = name.replace(/ county$/, "");

    if (name === q || nameNoSuffix === q) {
      exact.push({
        countyFips: county.countyFips,
        displayName: county.countyName,
        matchType: "county",
        confidence: "exact",
      });
    } else if (name.startsWith(q) || nameNoSuffix.startsWith(q)) {
      startsWith.push({
        countyFips: county.countyFips,
        displayName: county.countyName,
        matchType: "county",
        confidence: "exact",
      });
    } else if (name.includes(q) || nameNoSuffix.includes(q)) {
      contains.push({
        countyFips: county.countyFips,
        displayName: county.countyName,
        matchType: "county",
        confidence: "exact",
      });
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}
