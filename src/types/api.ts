/**
 * GridSignal Texas — API response types
 * Derived from gridsignal_texas_data_contract.md §10
 */

import type { DataQuality } from "./county";

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export type ApiSourceMetadata = {
  sourceName: string;
  lastUpdated: string | null;
  limitation: string;
};

export type WeatherApiResult = {
  countyFips: string;
  highTempF: number | null;
  lowTempF: number | null;
  maxWindMph: number | null;
  precipInches: number | null;
  cloudCoverPercent: number | null;
  fetchedAt: string;
  quality: DataQuality;
  sourceName: string;
  lastUpdated: string | null;
  limitation: string;
};

export type SolarApiResult = {
  countyFips: string;
  annualAcKwh: number | null;
  monthlyAcKwh: number[] | null;
  systemCapacityKw: number;
  fetchedAt: string;
  quality: DataQuality;
  sourceName: string;
  lastUpdated: string | null;
  limitation: string;
};

export type GridStrainResult = {
  region: "Texas" | "ERCOT" | "EIA_BalancingAuthority" | "Unknown";
  currentDemandMw: number | null;
  /**
   * Historical name kept for API compatibility. For live EIA data this holds
   * the MAX of the trailing 720-hour (30-day) ERCO demand window — an observed
   * recent peak, not a forecast. Explanations must not call it a forecast.
   */
  forecastPeakDemandMw: number | null;
  gridStrainScore: number;
  fetchedAt: string;
  quality: DataQuality;
  sourceName: string;
  lastUpdated: string | null;
  limitation: string;
};
