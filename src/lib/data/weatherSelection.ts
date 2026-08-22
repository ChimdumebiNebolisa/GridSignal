/**
 * GridSignal Texas — Weather result selection for API responses.
 *
 * When live Open-Meteo data is unavailable, the bundled cached forecast may be
 * returned, but its freshness must be re-evaluated so a months-old snapshot is
 * labeled "stale" rather than silently presented as fresh cache (audit F-005).
 * A value must not move between provenance categories between endpoints.
 */

import type { WeatherApiResult } from "@/types/api";
import { markStale } from "@/lib/data/freshness";

export const WEATHER_CACHE_MAX_AGE_HOURS = 72;

export function selectWeatherResult(
  live: WeatherApiResult,
  cached: WeatherApiResult | undefined,
  now = Date.now()
): WeatherApiResult {
  if (live.quality !== "unavailable") return live;
  if (!cached) return live;

  return {
    ...cached,
    quality: markStale(
      cached.quality,
      cached.fetchedAt,
      WEATHER_CACHE_MAX_AGE_HOURS,
      now
    ),
  };
}
