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
  weather: ReturnType<typeof normalizeWeatherRisk>,
  solar: ReturnType<typeof normalizeSolarPotential>,
  demand: ReturnType<typeof normalizeDemandExposure>,
  grid: ReturnType<typeof normalizeGridStrain>,
  inputs: Pick<MergeInputs, "weather" | "gridStrain">,
  utilityQ: DataQuality,
  lastUpdated: string
): SourceStatus {
  return [
    {
      source: "county_geojson",
      sourceName: "Bundled Texas county GeoJSON",
      quality: "cached",
      fetchedAt: null,
      lastUpdated,
      limitation: "County boundaries are static bundled geography.",
      message: "Texas county boundaries from bundled GeoJSON.",
    },
    {
      source: "open_meteo",
      sourceName: inputs.weather.sourceName,
      quality: weather.quality,
      fetchedAt: inputs.weather.fetchedAt,
      lastUpdated: inputs.weather.lastUpdated ?? inputs.weather.fetchedAt,
      limitation: inputs.weather.limitation,
      message:
        weather.quality === "live"
          ? "Weather fetched from Open-Meteo."
          : weather.explanation,
    },
    {
      source: "nrel_pvwatts",
      sourceName: "NREL PVWatts / bundled solar cache",
      quality: solar.quality,
      fetchedAt: null,
      lastUpdated,
      limitation:
        "Solar score is normalized against bundled Texas county solar cache using standard 4 kW assumptions.",
      message:
        solar.quality === "live"
          ? "Solar from NREL PVWatts."
          : solar.explanation,
    },
    {
      source: "census_population",
      sourceName: "U.S. Census population cache",
      quality: demand.quality,
      fetchedAt: null,
      lastUpdated,
      limitation:
        "Demand exposure is population-based and does not represent real-time electricity load.",
      message: demand.explanation,
    },
    {
      source: "eia_grid_monitor",
      sourceName: inputs.gridStrain.sourceName,
      quality: grid.quality,
      fetchedAt: inputs.gridStrain.fetchedAt,
      lastUpdated: inputs.gridStrain.lastUpdated ?? inputs.gridStrain.fetchedAt,
      limitation: inputs.gridStrain.limitation,
      message: grid.explanation,
    },
    {
      source: "puct_utility_context",
      sourceName: "Static utility context lookup",
      quality: utilityQ,
      fetchedAt: null,
      lastUpdated,
      limitation:
        "Utility context is informational only, may be unavailable, and does not affect the score.",
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
      weatherScore,
      solarScore,
      demandScore,
      gridScore,
      { weather, gridStrain },
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
      sourceName: "Estimated weather fallback",
      lastUpdated: new Date().toISOString(),
      limitation:
        "Weather data unavailable for this county profile; using neutral planning estimate.",
    };
    return mergeCountyProfile({ base, weather, solarCache, gridStrain });
  });
}
