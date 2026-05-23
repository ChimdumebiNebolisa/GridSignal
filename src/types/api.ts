/**
 * GridSignal Texas — API response types
 * Derived from gridsignal_texas_data_contract.md §10
 */

import type { DataQuality } from "./county";

export type WeatherApiResult = {
  countyFips: string;
  highTempF: number | null;
  lowTempF: number | null;
  maxWindMph: number | null;
  precipInches: number | null;
  cloudCoverPercent: number | null;
  fetchedAt: string;
  quality: DataQuality;
};

export type SolarApiResult = {
  countyFips: string;
  annualAcKwh: number | null;
  monthlyAcKwh: number[] | null;
  systemCapacityKw: number;
  fetchedAt: string;
  quality: DataQuality;
};

export type GridStrainResult = {
  region: "Texas" | "ERCOT" | "EIA_BalancingAuthority" | "Unknown";
  currentDemandMw: number | null;
  forecastPeakDemandMw: number | null;
  gridStrainScore: number;
  fetchedAt: string;
  quality: DataQuality;
};
