/**
 * GridSignal Texas — Census API client
 * Optional — used only if live Census data is needed.
 * By default, the app uses static cached population from county-population.json.
 * Server-side only.
 */

import type { CountyPopulationRecord } from "@/types/county";
import { getCensusApiKey } from "@/lib/utils/env";
import { fetchJson, FetchError } from "@/lib/utils/fetchJson";

const CENSUS_ACS_BASE = "https://api.census.gov/data/2022/acs/acs5";

type CensusRow = [string, string, string, string]; // NAME, B01003_001E, state, county

/**
 * Fetch Texas county populations from Census ACS 5-Year.
 * Returns null if API key is missing (caller should use static cache).
 */
export async function fetchTexasCountyPopulations(): Promise<CountyPopulationRecord[] | null> {
  const apiKey = getCensusApiKey();

  const params = new URLSearchParams({
    get: "NAME,B01003_001E",
    for: "county:*",
    in: "state:48",
  });

  if (apiKey) {
    params.set("key", apiKey);
  }

  try {
    const data = await fetchJson<CensusRow[]>(
      `${CENSUS_ACS_BASE}?${params.toString()}`
    );

    if (!Array.isArray(data) || data.length < 2) {
      console.warn("[Census] Unexpected response format.");
      return null;
    }

    // First row is headers, rest are data
    const records: CountyPopulationRecord[] = data.slice(1).map((row) => {
      const stateFips = row[2];
      const countyFipsShort = row[3];
      return {
        countyFips: `${stateFips}${countyFipsShort}`,
        countyName: row[0].replace(", Texas", "").trim(),
        population: parseInt(row[1], 10) || 0,
        year: 2022,
        source: "Census API" as const,
      };
    });

    return records;
  } catch (error) {
    console.error(
      "[Census] Failed to fetch populations:",
      error instanceof FetchError ? error.message : error
    );
    return null;
  }
}
