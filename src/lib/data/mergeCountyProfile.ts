/**
 * GridSignal Texas — Merge county base record with score inputs into full profile
 */

import type {
  CountyBaseRecord,
  CountyEnergyProfile,
  DataQuality,
  ScoreExplanation,
  SourceStatus,
} from "@/types/county";
import type { GridStrainResult, WeatherApiResult } from "@/types/api";
import type { SolarCacheEntry } from "@/types/county";
import {
  normalizeWeatherRisk,
  normalizeSolarPotential,
  normalizeDemandExposure,
  normalizeGridStrain,
} from "@/lib/scoring/normalize";
import { calculateBackupPriorityScore } from "@/lib/scoring/scoreCounty";
import { buildRecommendation } from "@/lib/scoring/recommendations";
import { buildDataQualitySummary } from "@/lib/data/dataQuality";
import { getAllPopulations } from "@/lib/data/counties";

export type MergeInputs = {
  base: CountyBaseRecord;
  weather: WeatherApiResult;
  solarCache: SolarCacheEntry[];
  gridStrain: GridStrainResult;
};

function buildScoreExplanation(
  weather: ReturnType<typeof normalizeWeatherRisk>,
  solar: ReturnType<typeof normalizeSolarPotential>,
  demand: ReturnType<typeof normalizeDemandExposure>,
  grid: ReturnType<typeof normalizeGridStrain>
): ScoreExplanation {
  const drivers: string[] = [];
  if (weather.value >= 60) drivers.push("weather exposure");
  if (solar.value >= 60) drivers.push("solar potential");
  if (demand.value >= 60) drivers.push("demand exposure");
  if (grid.value >= 60) drivers.push("statewide grid strain");

  const summary =
    drivers.length > 0
      ? `Backup priority reflects ${drivers.join(", ")} from public data signals.`
      : "Backup priority reflects moderate public data signals across all inputs.";

  return {
    weatherRisk: weather,
    solarPotential: solar,
    demandExposure: demand,
    statewideGridStrain: grid,
    finalSummary: summary,
  };
}

function buildSourceStatus(
  weatherQ: DataQuality,
  solarQ: DataQuality,
  demandQ: DataQuality,
  gridQ: DataQuality,
  utilityQ: DataQuality,
  lastUpdated: string
): SourceStatus {
  return [
    {
      source: "county_geojson",
      quality: "cached",
      lastUpdated,
      message: "Texas county boundaries from bundled GeoJSON.",
    },
    {
      source: "open_meteo",
      quality: weatherQ,
      lastUpdated,
      message:
        weatherQ === "live"
          ? "Weather fetched from Open-Meteo."
          : "Weather from precomputed cache or estimated fallback.",
    },
    {
      source: "nrel_pvwatts",
      quality: solarQ,
      lastUpdated,
      message:
        solarQ === "live"
          ? "Solar from NREL PVWatts."
          : "Solar from static cache or estimated proxy.",
    },
    {
      source: "census_population",
      quality: demandQ,
      lastUpdated,
      message: "Population from static Census cache.",
    },
    {
      source: "eia_grid_monitor",
      quality: gridQ,
      lastUpdated,
      message:
        "Statewide grid strain from EIA ERCO balancing-authority data or fallback.",
    },
    {
      source: "puct_utility_context",
      quality: utilityQ,
      lastUpdated,
      message: "Utility context is informational only and does not affect score.",
    },
  ];
}

export function mergeCountyProfile(inputs: MergeInputs): CountyEnergyProfile {
  const { base, weather, solarCache, gridStrain } = inputs;
  const allPops = getAllPopulations();

  const weatherScore = normalizeWeatherRisk(weather);
  const solarScore = normalizeSolarPotential(base.countyFips, solarCache);
  const demandScore = normalizeDemandExposure(base.population, allPops);
  const gridScore = normalizeGridStrain(gridStrain);

  const result = calculateBackupPriorityScore({
    weatherRisk: weatherScore,
    solarPotential: solarScore,
    demandExposure: demandScore,
    gridStrain: gridScore,
  });

  const lastUpdated = new Date().toISOString();

  const utilityQuality: DataQuality =
    base.utilityContextQuality === "unknown" ||
    base.likelyUtilityTerritories.length === 0
      ? "unavailable"
      : "estimated";

  const dataQuality = buildDataQualitySummary(
    weatherScore.quality,
    solarScore.quality,
    demandScore.quality,
    gridScore.quality,
    utilityQuality as DataQuality
  );

  const scoreExplanation = buildScoreExplanation(
    weatherScore,
    solarScore,
    demandScore,
    gridScore
  );

  const profile: CountyEnergyProfile = {
    ...base,
    weatherRiskScore: weatherScore.value,
    solarPotentialScore: solarScore.value,
    demandExposureScore: demandScore.value,
    statewideGridStrainScore: gridScore.value,
    backupPriorityScore: result.score,
    backupPriorityLabel: result.label,
    scoreExplanation,
    recommendation: "",
    dataQuality,
    sourceStatus: buildSourceStatus(
      weatherScore.quality,
      solarScore.quality,
      demandScore.quality,
      gridScore.quality,
      utilityQuality as DataQuality,
      lastUpdated
    ),
    lastUpdated,
  };

  profile.recommendation = buildRecommendation(profile);
  return profile;
}

export function mergeAllCountyProfiles(
  bases: CountyBaseRecord[],
  weatherByFips: Map<string, WeatherApiResult>,
  solarCache: SolarCacheEntry[],
  gridStrain: GridStrainResult
): CountyEnergyProfile[] {
  return bases.map((base) => {
    const weather = weatherByFips.get(base.countyFips) ?? {
      countyFips: base.countyFips,
      highTempF: null,
      lowTempF: null,
      maxWindMph: null,
      precipInches: null,
      cloudCoverPercent: null,
      fetchedAt: new Date().toISOString(),
      quality: "estimated" as const,
    };
    return mergeCountyProfile({ base, weather, solarCache, gridStrain });
  });
}
