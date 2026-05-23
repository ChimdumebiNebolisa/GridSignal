/**
 * GridSignal Texas — EIA Hourly Electric Grid Monitor client
 * Fetches statewide grid strain from the ERCO balancing authority.
 * Normalization uses rolling min/max from the same EIA series (deterministic).
 * Requires EIA_API_KEY. Server-side only.
 */

import type { GridStrainResult } from "@/types/api";
import { getEiaApiKey } from "@/lib/utils/env";
import { fetchJson, FetchError } from "@/lib/utils/fetchJson";
import { clamp } from "@/lib/utils/clamp";
import { getSampleGridStrain } from "@/lib/data/counties";

const EIA_BASE = "https://api.eia.gov/v2/electricity/rto/region-data/data/";

/** Hours of recent ERCO demand used for rolling min/max normalization */
const ROLLING_HOURS = 720; // ~30 days

type EiaResponse = {
  response?: {
    data?: Array<{
      value?: number;
      period?: string;
      respondent?: string;
      type?: string;
    }>;
  };
};

let cachedGridStrain: GridStrainResult | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

function normalizeDemandScore(
  currentDemandMw: number,
  lowMw: number,
  highMw: number
): number {
  if (highMw <= lowMw) return 50;
  const raw =
    ((currentDemandMw - lowMw) / (highMw - lowMw)) * 100;
  return clamp(Math.round(raw), 0, 100);
}

async function fetchErcoDemandSeries(apiKey: string): Promise<number[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: "hourly",
    "data[0]": "value",
    "facets[respondent][]": "ERCO",
    "facets[type][]": "D",
    sort: JSON.stringify([{ column: "period", direction: "desc" }]),
    offset: "0",
    length: String(ROLLING_HOURS),
  });

  const data = await fetchJson<EiaResponse>(
    `${EIA_BASE}?${params.toString()}`,
    { timeoutMs: 20_000 }
  );

  const values = (data.response?.data ?? [])
    .map((r) => r.value)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  return values;
}

/**
 * Fetch current grid strain from EIA ERCO series with rolling min/max normalization.
 */
export async function fetchGridStrain(): Promise<GridStrainResult> {
  const now = Date.now();
  if (cachedGridStrain && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedGridStrain;
  }

  const apiKey = getEiaApiKey();
  if (!apiKey) {
    console.warn("[EIA] EIA_API_KEY not set. Using estimated fallback.");
    return getSampleGridStrain();
  }

  try {
    const values = await fetchErcoDemandSeries(apiKey);

    if (values.length === 0) {
      console.warn("[EIA] No demand values returned. Using fallback.");
      return getSampleGridStrain();
    }

    const currentDemandMw = values[0];
    const lowMw = Math.min(...values);
    const highMw = Math.max(...values);
    const gridStrainScore = normalizeDemandScore(currentDemandMw, lowMw, highMw);

    const result: GridStrainResult = {
      region: "EIA_BalancingAuthority",
      currentDemandMw,
      forecastPeakDemandMw: highMw,
      gridStrainScore,
      fetchedAt: new Date().toISOString(),
      quality: "live",
    };

    cachedGridStrain = result;
    cacheTimestamp = now;
    return result;
  } catch (error) {
    console.error(
      "[EIA] Failed to fetch grid strain:",
      error instanceof FetchError ? error.message : error
    );
    return getSampleGridStrain();
  }
}

export { normalizeDemandScore };
