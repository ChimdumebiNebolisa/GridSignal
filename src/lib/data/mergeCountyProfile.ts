/**
 * GridSignal Texas — Merge county base record with score inputs into full profile (v2)
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
  normalizePopulationContext,
  normalizeGridStrain,
} from "@/lib/scoring/normalize";
import { calculateBackupPriorityScore } from "@/lib/scoring/scoreCounty";
import { buildRecommendation } from "@/lib/scoring/recommendations";
import { buildDataQualitySummary } from "@/lib/data/dataQuality";
import { getAllPopulations } from "@/lib/data/counties";
import {
  getDataManifest,
  getFeasibilityByFips,
  getStructuralNeedByFips,
} from "@/lib/data/indicators";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { calculateFeasibility } from "@/lib/scoring/feasibility";
import { buildOperationalContext } from "@/lib/scoring/operationalContext";
import { deriveProfileTimestamps } from "@/lib/data/timestamps";

export type MergeInputs = {
  base: CountyBaseRecord;
  weather: WeatherApiResult;
  solarCache: SolarCacheEntry[];
  gridStrain: GridStrainResult;
};

function defaultStructuralNeedRecord(countyFips: string) {
  const unavailable = {
    value: null as number | null,
    quality: "unavailable" as const,
    source: "unavailable",
    vintage: "n/a",
    explanation: "Indicator data unavailable for this county.",
  };
  return {
    countyFips,
    structuralNeedScore: null,
    components: {
      hazardExposure: { ...unavailable, source: "fema_nri" },
      socialVulnerability: { ...unavailable, source: "cdc_svi" },
      outageBurden: { ...unavailable, source: "eagle_i" },
    },
    missingComponents: ["hazardExposure", "socialVulnerability", "outageBurden"],
    quality: "unavailable" as const,
  };
}

function defaultFeasibilityRecord(countyFips: string) {
  return {
    countyFips,
    feasibilityScore: 0,
    components: {
      solarResource: {
        value: null,
        quality: "unavailable" as const,
        source: "nrel_pvwatts",
        vintage: "n/a",
        explanation: "Solar feasibility data unavailable.",
        imputed: true,
      },
    },
    quality: "unavailable" as const,
  };
}

function buildScoreExplanation(
  weather: ReturnType<typeof normalizeWeatherRisk>,
  solar: ReturnType<typeof normalizeSolarPotential>,
  population: ReturnType<typeof normalizePopulationContext>,
  grid: ReturnType<typeof normalizeGridStrain>
): ScoreExplanation {
  const drivers: string[] = [];
  if (weather.value >= 60) drivers.push("weather exposure");
  if (solar.value >= 60) drivers.push("solar potential");
  if (population.value >= 60) drivers.push("population context");
  if (grid.value >= 60) drivers.push("statewide grid strain");

  const summary =
    drivers.length > 0
      ? `Legacy composite reflects ${drivers.join(", ")} from public data signals. Primary view uses structural need and feasibility axes.`
      : "Legacy composite reflects moderate public data signals. Primary view uses structural need and feasibility axes.";

  return {
    weatherRisk: weather,
    solarPotential: solar,
    demandExposure: population,
    statewideGridStrain: grid,
    finalSummary: summary,
  };
}

function buildSourceStatus(
  weather: ReturnType<typeof normalizeWeatherRisk>,
  solar: ReturnType<typeof normalizeSolarPotential>,
  population: ReturnType<typeof normalizePopulationContext>,
  grid: ReturnType<typeof normalizeGridStrain>,
  inputs: Pick<MergeInputs, "weather" | "gridStrain">,
  utilityQ: DataQuality,
  profileAssembledAt: string
): SourceStatus {
  return [
    {
      source: "county_geojson",
      sourceName: "Bundled Texas county GeoJSON",
      quality: "cached",
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation: "County boundaries are static bundled geography.",
      message: "Texas county boundaries from bundled GeoJSON.",
    },
    {
      source: "fema_nri",
      sourceName: "FEMA National Risk Index",
      quality: "estimated",
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation: "Hazard exposure from bundled annual snapshot.",
      message: "Structural need — hazard exposure component.",
    },
    {
      source: "cdc_svi",
      sourceName: "CDC/ATSDR Social Vulnerability Index",
      quality: "estimated",
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation: "Social vulnerability from bundled annual snapshot.",
      message: "Structural need — social vulnerability component.",
    },
    {
      source: "eagle_i",
      sourceName: "DOE EAGLE-I outage burden",
      quality: "estimated",
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation: "Historical outage burden proxy from bundled snapshot.",
      message: "Structural need — outage burden component.",
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
          ? "Operational weather stress from Open-Meteo."
          : weather.explanation,
    },
    {
      source: "nrel_pvwatts",
      sourceName: "NREL PVWatts / bundled solar cache",
      quality: solar.quality,
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation:
        "Solar feasibility from bundled Texas county solar cache (4 kW assumptions).",
      message: solar.explanation,
    },
    {
      source: "census_population",
      sourceName: "U.S. Census population cache",
      quality: population.quality,
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation:
        "Population context only — does not represent electricity demand.",
      message: population.explanation,
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
      lastUpdated: profileAssembledAt,
      limitation:
        "Utility context is informational only and does not affect scores.",
      message: "Utility context is informational only.",
    },
  ];
}

export function mergeCountyProfile(inputs: MergeInputs): CountyEnergyProfile {
  const { base, weather, solarCache, gridStrain } = inputs;
  const allPops = getAllPopulations();
  const manifest = getDataManifest();

  const weatherScore = normalizeWeatherRisk(weather);
  const solarScore = normalizeSolarPotential(base.countyFips, solarCache);
  const populationScore = normalizePopulationContext(base.population, allPops);
  const gridScore = normalizeGridStrain(gridStrain);

  const structuralNeed = calculateStructuralNeed(
    getStructuralNeedByFips(base.countyFips) ?? defaultStructuralNeedRecord(base.countyFips)
  );
  const feasibility = calculateFeasibility(
    getFeasibilityByFips(base.countyFips) ?? defaultFeasibilityRecord(base.countyFips)
  );
  const operationalContext = buildOperationalContext(weather, gridStrain);

  const result = calculateBackupPriorityScore({
    weatherRisk: weatherScore,
    solarPotential: solarScore,
    demandExposure: populationScore,
    gridStrain: gridScore,
  });

  const { lastUpdated, profileAssembledAt } = deriveProfileTimestamps([
    weather.fetchedAt,
    gridStrain.fetchedAt,
    manifest.generatedAt,
  ]);

  const utilityQuality: DataQuality =
    base.utilityContextQuality === "unknown" ||
    base.likelyUtilityTerritories.length === 0
      ? "unavailable"
      : "estimated";

  const dataQuality = buildDataQualitySummary(
    structuralNeed.quality,
    feasibility.quality,
    weatherScore.imputed || weatherScore.quality === "estimated"
      ? "estimated"
      : weatherScore.quality,
    utilityQuality
  );

  const scoreExplanation = buildScoreExplanation(
    weatherScore,
    solarScore,
    populationScore,
    gridScore
  );

  const profile: CountyEnergyProfile = {
    ...base,
    structuralNeed,
    feasibility,
    operationalContext,
    dataManifestVersion: manifest.schemaVersion,
    profileAssembledAt,
    lastUpdated,
    weatherRiskScore: weatherScore.value,
    solarPotentialScore: solarScore.value,
    demandExposureScore: populationScore.value,
    statewideGridStrainScore: gridScore.value,
    backupPriorityScore: result.score,
    backupPriorityLabel: result.label,
    scoreExplanation,
    recommendation: "",
    dataQuality,
    sourceStatus: buildSourceStatus(
      weatherScore,
      solarScore,
      populationScore,
      gridScore,
      { weather, gridStrain },
      utilityQuality,
      profileAssembledAt
    ),
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
