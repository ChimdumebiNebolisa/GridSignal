/**
 * GridSignal Texas — Operational context (live/contextual, not county-ranked)
 */

import type { GridStrainResult, WeatherApiResult } from "@/types/api";
import type { OperationalContext } from "@/types/county";
import { getOverallDataQuality } from "@/lib/data/dataQuality";
import { markStale } from "@/lib/data/freshness";
import { normalizeGridStrain, normalizeWeatherRisk } from "@/lib/scoring/normalize";
import { deriveProfileTimestamps } from "@/lib/data/timestamps";

/** Bundled cached forecasts older than this are labeled stale. */
export const WEATHER_FRESHNESS_HOURS = 72;

function oldestAsOf(timestamps: (string | null | undefined)[]): string {
  const { lastUpdated, profileAssembledAt } = deriveProfileTimestamps(timestamps);
  return lastUpdated || profileAssembledAt;
}

export function buildOperationalContext(
  weather: WeatherApiResult,
  gridStrain: GridStrainResult
): OperationalContext {
  const weatherScore = normalizeWeatherRisk(weather);
  const gridScore = normalizeGridStrain(gridStrain);

  return {
    weatherStressScore: weatherScore.value,
    weatherStressExplanation: weatherScore.explanation,
    weatherStressBasis: `Single county-centroid forecast for this county (${weather.quality}).`,
    statewideGridStrainScore: gridScore.value,
    statewideGridStrainExplanation: gridScore.explanation,
    // Honest "as of": the oldest underlying source capture, not assembly time.
    asOf: oldestAsOf([weather.fetchedAt, gridStrain.fetchedAt]),
    limitation:
      "Current conditions are near-term and statewide context only. They do not represent county-level grid reliability or structural resilience need.",
  };
}

/**
 * Statewide operational context derived from ALL bundled county forecasts.
 * The weather-stress score is the median across counties — never a single
 * arbitrary county's reading presented as statewide (audit F-004).
 */
export function buildStatewideOperationalContext(
  weathers: WeatherApiResult[],
  gridStrain: GridStrainResult
): OperationalContext {
  const marked = weathers.map((w) => ({
    ...w,
    quality: markStale(w.quality, w.fetchedAt, WEATHER_FRESHNESS_HOURS),
  }));

  const scores = marked
    .map((w) => normalizeWeatherRisk(w).value)
    .sort((a, b) => a - b);

  let median = 50;
  if (scores.length > 0) {
    const mid = Math.floor(scores.length / 2);
    median =
      scores.length % 2 === 1
        ? scores[mid]
        : Math.round((scores[mid - 1] + scores[mid]) / 2);
  }

  const gridScore = normalizeGridStrain(gridStrain);
  const quality = getOverallDataQuality(marked.map((w) => w.quality));
  const staleCount = marked.filter((w) => w.quality === "stale").length;

  return {
    weatherStressScore: median,
    weatherStressExplanation:
      "Median per-county weather-stress step score across bundled county-centroid forecasts.",
    weatherStressBasis: `Median of ${marked.length} bundled county forecasts (${staleCount} stale, bundle quality: ${quality}) — not a single-county reading.`,
    statewideGridStrainScore: gridScore.value,
    statewideGridStrainExplanation: gridScore.explanation,
    asOf: oldestAsOf([...marked.map((w) => w.fetchedAt), gridStrain.fetchedAt]),
    limitation:
      "Current conditions are near-term and statewide context only. They do not represent county-level grid reliability or structural resilience need.",
  };
}
