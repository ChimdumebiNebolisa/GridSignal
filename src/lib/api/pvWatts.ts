/**
 * GridSignal Texas — NREL PVWatts API client
 * Uses current NLR developer domain per NREL docs.
 * Requires NREL_API_KEY. Server-side only.
 */

import type { SolarApiResult } from "@/types/api";
import { getNrelApiKey } from "@/lib/utils/env";
import { fetchJson, FetchError } from "@/lib/utils/fetchJson";
import { getSolarCacheByFips } from "@/lib/data/counties";

const PVWATTS_ENDPOINTS = [
  "https://developer.nlr.gov/api/pvwatts/v8.json",
  "https://developer.nrel.gov/api/pvwatts/v8.json",
];

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
  return {
    countyFips,
    annualAcKwh: cached?.annualAcKwh ?? null,
    monthlyAcKwh: null,
    systemCapacityKw: SYSTEM_DEFAULTS.system_capacity,
    fetchedAt: cached?.fetchedAt ?? new Date().toISOString(),
    quality: cached?.quality ?? "estimated",
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

  for (const base of PVWATTS_ENDPOINTS) {
    try {
      const data = await fetchJson<PVWattsResponse>(`${base}?${params.toString()}`);

      if (data.errors && data.errors.length > 0) {
        console.error(`[PVWatts] API errors for ${countyFips}:`, data.errors);
        continue;
      }

      if (data.outputs?.ac_annual != null) {
        return {
          countyFips,
          annualAcKwh: data.outputs.ac_annual,
          monthlyAcKwh: data.outputs.ac_monthly ?? null,
          systemCapacityKw: SYSTEM_DEFAULTS.system_capacity,
          fetchedAt: new Date().toISOString(),
          quality: "live",
        };
      }
    } catch (error) {
      console.error(
        `[PVWatts] ${base} failed for ${countyFips}:`,
        error instanceof FetchError ? error.message : error
      );
    }
  }

  return solarFromCache(countyFips);
}

export { SYSTEM_DEFAULTS };
