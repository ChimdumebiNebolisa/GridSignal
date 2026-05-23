/**
 * GridSignal Texas — Open-Meteo API client
 * Fetches weather data for a county centroid. No API key required.
 * Server-side only.
 */

import type { WeatherApiResult } from "@/types/api";
import { fetchJson, FetchError } from "@/lib/utils/fetchJson";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

type OpenMeteoResponse = {
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
    // cloud_cover_mean is not directly in daily — we use hourly max if needed
  };
  hourly?: {
    cloud_cover?: number[];
  };
};

/**
 * Convert Celsius to Fahrenheit.
 */
function cToF(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/**
 * Convert km/h to mph.
 */
function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

/**
 * Convert mm to inches.
 */
function mmToInches(mm: number): number {
  return mm * 0.0393701;
}

/**
 * Fetch weather data from Open-Meteo for a given lat/lon.
 * Returns the first day's forecast values.
 */
export async function fetchWeather(
  countyFips: string,
  lat: number,
  lon: number
): Promise<WeatherApiResult> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: "1",
    timezone: "America/Chicago",
  });

  try {
    const data = await fetchJson<OpenMeteoResponse>(
      `${OPEN_METEO_BASE}?${params.toString()}`
    );

    const daily = data.daily;
    if (!daily) {
      return createUnavailableResult(countyFips);
    }

    const highTempC = daily.temperature_2m_max?.[0] ?? null;
    const lowTempC = daily.temperature_2m_min?.[0] ?? null;
    const precipMm = daily.precipitation_sum?.[0] ?? null;
    const windKmh = daily.wind_speed_10m_max?.[0] ?? null;

    return {
      countyFips,
      highTempF: highTempC !== null ? Math.round(cToF(highTempC) * 10) / 10 : null,
      lowTempF: lowTempC !== null ? Math.round(cToF(lowTempC) * 10) / 10 : null,
      maxWindMph: windKmh !== null ? Math.round(kmhToMph(windKmh) * 10) / 10 : null,
      precipInches: precipMm !== null ? Math.round(mmToInches(precipMm) * 100) / 100 : null,
      cloudCoverPercent: null, // Not fetched in daily mode
      fetchedAt: new Date().toISOString(),
      quality: "live",
    };
  } catch (error) {
    console.error(
      `[Open-Meteo] Failed for county ${countyFips}:`,
      error instanceof FetchError ? error.message : error
    );
    return createUnavailableResult(countyFips);
  }
}

function createUnavailableResult(countyFips: string): WeatherApiResult {
  return {
    countyFips,
    highTempF: null,
    lowTempF: null,
    maxWindMph: null,
    precipInches: null,
    cloudCoverPercent: null,
    fetchedAt: new Date().toISOString(),
    quality: "unavailable",
  };
}
