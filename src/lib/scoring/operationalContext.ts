/**
 * GridSignal Texas — Operational context (live/contextual, not county-ranked)
 */

import type { GridStrainResult, WeatherApiResult } from "@/types/api";
import type { OperationalContext } from "@/types/county";
import { normalizeGridStrain, normalizeWeatherRisk } from "@/lib/scoring/normalize";
import { deriveProfileTimestamps } from "@/lib/data/timestamps";

export function buildOperationalContext(
  weather: WeatherApiResult,
  gridStrain: GridStrainResult
): OperationalContext {
  const weatherScore = normalizeWeatherRisk(weather);
  const gridScore = normalizeGridStrain(gridStrain);
  const { profileAssembledAt } = deriveProfileTimestamps([
    weather.fetchedAt,
    gridStrain.fetchedAt,
  ]);

  return {
    weatherStressScore: weatherScore.value,
    weatherStressExplanation: weatherScore.explanation,
    statewideGridStrainScore: gridScore.value,
    statewideGridStrainExplanation: gridScore.explanation,
    asOf: profileAssembledAt,
    limitation:
      "Current conditions are near-term and statewide context only. They do not represent county-level grid reliability or structural resilience need.",
  };
}
