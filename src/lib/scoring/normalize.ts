/**
 * GridSignal Texas — Score normalization functions
 * Implements data contract §6 normalization rules.
 * Pure functions — no React, no I/O, fully testable.
 */

import type { WeatherApiResult, GridStrainResult } from "@/types/api";
import type { ScoreInput, SolarCacheEntry } from "@/types/county";
import { clamp } from "@/lib/utils/clamp";

// ---------- Helpers ----------

/**
 * Compute the percentile rank of `value` within `allValues`.
 * Returns 0–100. The value at the top of the list gets ~100.
 */
export function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const belowCount = sorted.filter((v) => v < value).length;
  const equalCount = sorted.filter((v) => v === value).length;
  const rank = ((belowCount + 0.5 * equalCount) / sorted.length) * 100;
  return clamp(Math.round(rank), 0, 100);
}

// ---------- Weather Risk ----------

/**
 * Deterministic weather sub-scores per data contract §6.
 * Weights: heat 40%, cold 25%, wind 20%, precip 15%.
 */
export function normalizeWeatherRisk(weather: WeatherApiResult): ScoreInput {
  // If all weather data is null, return estimated fallback
  if (
    weather.highTempF === null &&
    weather.lowTempF === null &&
    weather.maxWindMph === null &&
    weather.precipInches === null
  ) {
    return {
      value: 50,
      quality: "estimated",
      explanation: "Weather data unavailable. Using neutral estimate.",
    };
  }

  const highTempF = weather.highTempF ?? 85; // neutral default
  const lowTempF = weather.lowTempF ?? 50;   // neutral default
  const maxWindMph = weather.maxWindMph ?? 10;
  const precipInches = weather.precipInches ?? 0;

  // Heat risk step function
  const heatRisk =
    highTempF >= 105 ? 100 :
    highTempF >= 100 ? 85 :
    highTempF >= 95 ? 70 :
    highTempF >= 90 ? 50 :
    highTempF >= 85 ? 30 :
    10;

  // Cold risk step function
  const coldRisk =
    lowTempF <= 15 ? 100 :
    lowTempF <= 25 ? 85 :
    lowTempF <= 32 ? 70 :
    lowTempF <= 40 ? 40 :
    10;

  // Wind risk step function
  const windRisk =
    maxWindMph >= 45 ? 100 :
    maxWindMph >= 35 ? 80 :
    maxWindMph >= 25 ? 60 :
    maxWindMph >= 15 ? 35 :
    10;

  // Precipitation risk step function
  const precipRisk =
    precipInches >= 2.0 ? 100 :
    precipInches >= 1.0 ? 75 :
    precipInches >= 0.5 ? 50 :
    precipInches > 0 ? 25 :
    10;

  const score = clamp(
    Math.round(
      0.40 * heatRisk +
      0.25 * coldRisk +
      0.20 * windRisk +
      0.15 * precipRisk
    ),
    0,
    100
  );

  const quality = weather.quality;

  // Build human-readable explanation
  const drivers: string[] = [];
  if (heatRisk >= 70) drivers.push(`high heat (${highTempF}°F)`);
  if (coldRisk >= 70) drivers.push(`cold risk (${lowTempF}°F low)`);
  if (windRisk >= 60) drivers.push(`strong winds (${maxWindMph} mph)`);
  if (precipRisk >= 50) drivers.push(`precipitation (${precipInches}" expected)`);
  if (drivers.length === 0) drivers.push("moderate weather conditions");

  return {
    value: score,
    quality,
    explanation: `Weather risk driven by ${drivers.join(", ")}.`,
  };
}

// ---------- Solar Potential ----------

/**
 * Percentile-rank normalization of solar output across all TX counties.
 */
export function normalizeSolarPotential(
  countyFips: string,
  allSolarData: SolarCacheEntry[]
): ScoreInput {
  const countyEntry = allSolarData.find((s) => s.countyFips === countyFips);

  if (!countyEntry || countyEntry.annualAcKwh <= 0) {
    return {
      value: 50,
      quality: "estimated",
      explanation: "Solar potential data unavailable. Using neutral estimate.",
    };
  }

  const allKwh = allSolarData
    .filter((s) => s.annualAcKwh > 0)
    .map((s) => s.annualAcKwh);

  const score = percentileRank(countyEntry.annualAcKwh, allKwh);

  return {
    value: score,
    quality: countyEntry.quality,
    explanation: `Solar potential is ${score >= 75 ? "strong" : score >= 50 ? "moderate" : "lower"} relative to other Texas counties (${Math.round(countyEntry.annualAcKwh).toLocaleString()} kWh/yr for a 4 kW system).`,
  };
}

// ---------- Demand Exposure ----------

/**
 * Percentile-rank normalization of county population.
 */
export function normalizeDemandExposure(
  population: number | null,
  allPopulations: number[]
): ScoreInput {
  if (population === null || population <= 0) {
    return {
      value: 50,
      quality: "estimated",
      explanation: "Population data unavailable. Using neutral demand estimate.",
    };
  }

  const validPops = allPopulations.filter((p) => p > 0);
  const score = percentileRank(population, validPops);

  return {
    value: score,
    quality: "cached", // population comes from static cache
    explanation: `Demand exposure based on county population of ${population.toLocaleString()} (${score >= 75 ? "high" : score >= 50 ? "moderate" : "lower"} relative to other Texas counties).`,
  };
}

// ---------- Statewide Grid Strain ----------

/**
 * Normalize grid strain from EIA/ERCOT demand data.
 * This is statewide, NOT county-specific.
 */
export function normalizeGridStrain(gridData: GridStrainResult): ScoreInput {
  // If no real data, use the pre-computed score from the result
  if (gridData.quality === "estimated" || gridData.quality === "unavailable") {
    return {
      value: clamp(gridData.gridStrainScore, 0, 100),
      quality: gridData.quality,
      explanation: "Grid strain data unavailable. Using cached or neutral statewide estimate.",
    };
  }

  const score = clamp(Math.round(gridData.gridStrainScore), 0, 100);

  let explanation: string;
  if (gridData.currentDemandMw !== null && gridData.forecastPeakDemandMw !== null) {
    explanation = `Statewide grid strain at ${score}/100 based on ${gridData.currentDemandMw.toLocaleString()} MW demand vs. ${gridData.forecastPeakDemandMw.toLocaleString()} MW forecast peak. This is a statewide signal, not county-level grid reliability.`;
  } else if (gridData.currentDemandMw !== null) {
    explanation = `Statewide grid strain at ${score}/100 based on ${gridData.currentDemandMw.toLocaleString()} MW current demand. This is a statewide signal, not county-level grid reliability.`;
  } else {
    explanation = `Statewide grid strain estimated at ${score}/100. This is a balancing-authority-level signal, not county-level grid reliability.`;
  }

  return {
    value: score,
    quality: gridData.quality,
    explanation,
  };
}
