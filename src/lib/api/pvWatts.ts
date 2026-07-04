/**
 * GridSignal Texas — NREL PVWatts API client
 * Uses the NREL developer API.
 * Requires NREL_API_KEY. Server-side only.
 */

import "server-only";
import type { SolarApiResult } from "@/types/api";
import { getNrelApiKey } from "@/lib/utils/env";
import { fetchJson, FetchError } from "@/lib/utils/fetchJson";
import { getSolarCacheByFips } from "@/lib/data/counties";

const PVWATTS_ENDPOINT = "https://developer.nrel.gov/api/pvwatts/v8.json";
const SOURCE_NAME = "NREL PVWatts";
const LIVE_LIMITATION =
  "PVWatts uses a standard 4 kW system at the county centroid; it is not a site-specific solar design.";
const CACHE_LIMITATION =
  "Live PVWatts was not available; using bundled county solar cache or deterministic estimated proxy.";

/** Standard system assumptions per data contract §6 */
const SYSTEM_DEFAULTS = {
  system_capacity: 4,
  module_type: 0,
  array_type: 1,
  tilt: 20,
  azimuth: 180,
  losses: 14.08,
} as const;

type PVWattsResponse = {
  outputs?: {
    ac_annual?: number;
    ac_monthly?: number[];
  };
  errors?: { error: string }[];
};

function solarFromCache(countyFips: string): SolarApiResult {
  const cached = getSolarCacheByFips(countyFips);
  const fetchedAt = cached?.fetchedAt ?? new Date().toISOString();
  return {
    countyFips,
    annualAcKwh: cached?.annualAcKwh ?? null,
    monthlyAcKwh: null,
    systemCapacityKw: SYSTEM_DEFAULTS.system_capacity,
    fetchedAt,
    quality: cached?.quality ?? "estimated",
    sourceName: SOURCE_NAME,
    lastUpdated: fetchedAt,
    limitation: CACHE_LIMITATION,
  };
}

/**
 * Fetch PVWatts solar estimate for a given lat/lon, with static cache fallback.
 */
export async function fetchSolarPotential(
  countyFips: string,
  lat: number,
  lon: number
): Promise<SolarApiResult> {
  const apiKey = getNrelApiKey();
  if (!apiKey) {
    return solarFromCache(countyFips);
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    lat: lat.toString(),
    lon: lon.toString(),
    system_capacity: SYSTEM_DEFAULTS.system_capacity.toString(),
    module_type: SYSTEM_DEFAULTS.module_type.toString(),
    array_type: SYSTEM_DEFAULTS.array_type.toString(),
    tilt: SYSTEM_DEFAULTS.tilt.toString(),
    azimuth: SYSTEM_DEFAULTS.azimuth.toString(),
    losses: SYSTEM_DEFAULTS.losses.toString(),
  });

  try {
    const data = await fetchJson<PVWattsResponse>(
      `${PVWATTS_ENDPOINT}?${params.toString()}`
    );

    if (data.errors && data.errors.length > 0) {
      console.error(`[PVWatts] API errors for ${countyFips}:`, data.errors);
      return solarFromCache(countyFips);
    }

    if (data.outputs?.ac_annual != null) {
      const fetchedAt = new Date().toISOString();
      return {
        countyFips,
        annualAcKwh: data.outputs.ac_annual,
        monthlyAcKwh: data.outputs.ac_monthly ?? null,
        systemCapacityKw: SYSTEM_DEFAULTS.system_capacity,
        fetchedAt,
        quality: "live",
        sourceName: SOURCE_NAME,
        lastUpdated: fetchedAt,
        limitation: LIVE_LIMITATION,
      };
    }
  } catch (error) {
    console.error(
      `[PVWatts] request failed for ${countyFips}:`,
      error instanceof FetchError ? error.message : error
    );
  }

  return solarFromCache(countyFips);
}

export { SYSTEM_DEFAULTS };
