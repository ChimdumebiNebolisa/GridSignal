/**
 * GridSignal Texas — Merge canonical county indicators with operational context.
 */

import type {
  CountyBaseRecord,
  CountyEnergyProfile,
  DataQuality,
  SourceStatus,
} from "@/types/county";
import type { GridStrainResult, WeatherApiResult } from "@/types/api";
import type { SolarCacheEntry } from "@/types/county";
import { buildDataQualitySummary } from "@/lib/data/dataQuality";
import { getDataManifest, getFeasibilityByFips, getStructuralNeedByFips } from "@/lib/data/indicators";
import { calculateFeasibility } from "@/lib/scoring/feasibility";
import { buildOperationalContext } from "@/lib/scoring/operationalContext";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { buildRecommendation } from "@/lib/scoring/recommendations";
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
      hazardExposure: { ...unavailable, source: "synthetic_hazard" },
      socialVulnerability: { ...unavailable, source: "synthetic_svi" },
      outageBurden: { ...unavailable, source: "synthetic_outage" },
    },
    missingComponents: ["hazardExposure", "socialVulnerability", "outageBurden"],
    quality: "unavailable" as const,
  };
}

function defaultFeasibilityRecord(countyFips: string) {
  return {
    countyFips,
    feasibilityScore: null,
    components: {
      solarResource: {
        value: null,
        quality: "unavailable" as const,
        source: "synthetic_solar",
        vintage: "n/a",
        explanation: "Solar feasibility data unavailable.",
      },
    },
    quality: "unavailable" as const,
  };
}

function buildSourceStatus(
  countyFips: string,
  profile: {
    structuralNeed: ReturnType<typeof calculateStructuralNeed>;
    feasibility: ReturnType<typeof calculateFeasibility>;
  },
  weather: WeatherApiResult,
  gridStrain: GridStrainResult,
  solarCache: SolarCacheEntry[],
  utilityQuality: DataQuality,
  profileAssembledAt: string
): SourceStatus {
  const solar = solarCache.find((entry) => entry.countyFips === countyFips);
  const solarUpdated = solar?.fetchedAt ?? profileAssembledAt;

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
      source: "synthetic_hazard",
      sourceName: "Hazard exposure proxy (synthetic)",
      quality: profile.structuralNeed.components.hazardExposure.quality,
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation:
        "Synthetic planning proxy derived from county-centroid geometry and population placeholders. Not FEMA NRI data; pending authoritative ingest.",
      message: "Structural need — hazard exposure component (synthetic proxy).",
    },
    {
      source: "synthetic_svi",
      sourceName: "Social vulnerability proxy (synthetic)",
      quality: profile.structuralNeed.components.socialVulnerability.quality,
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation:
        "Population-based synthetic placeholder. Not CDC/ATSDR SVI data; pending authoritative ingest.",
      message: "Structural need — social vulnerability component (synthetic proxy).",
    },
    {
      source: "synthetic_outage",
      sourceName: "Outage burden proxy (synthetic)",
      quality: profile.structuralNeed.components.outageBurden.quality,
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation:
        "Synthetic placeholder, not an outage forecast or reliability measure. Not DOE EAGLE-I data; pending authoritative ingest.",
      message: "Structural need — historical outage burden component (synthetic proxy).",
    },
    {
      source: "synthetic_solar",
      sourceName: "Solar resource proxy (synthetic)",
      quality: profile.feasibility.quality,
      fetchedAt: solar?.fetchedAt ?? null,
      lastUpdated: solarUpdated,
      limitation:
        "Synthetic longitude/latitude solar proxy for a standard 4 kW county-centroid system. Not NREL PVWatts output; live PVWatts is used per-request when an API key is configured.",
      message: profile.feasibility.components.solarResource.explanation,
    },
    {
      source: "open_meteo",
      sourceName: weather.sourceName,
      quality: weather.quality,
      fetchedAt: weather.fetchedAt,
      lastUpdated: weather.lastUpdated ?? weather.fetchedAt,
      limitation: weather.limitation,
      message: "Operational weather stress; not a county planning rank.",
    },
    {
      source: "eia_grid_monitor",
      sourceName: gridStrain.sourceName,
      quality: gridStrain.quality,
      fetchedAt: gridStrain.fetchedAt,
      lastUpdated: gridStrain.lastUpdated ?? gridStrain.fetchedAt,
      limitation: gridStrain.limitation,
      message: "Statewide or balancing-authority grid context; not county-specific.",
    },
    {
      source: "puct_utility_context",
      sourceName: "Static utility context lookup",
      quality: utilityQuality,
      fetchedAt: null,
      lastUpdated: profileAssembledAt,
      limitation: "Utility context is informational only and does not affect scores.",
      message: "Utility context is informational only.",
    },
  ];
}

export function mergeCountyProfile(inputs: MergeInputs): CountyEnergyProfile {
  const { base, weather, solarCache, gridStrain } = inputs;
  const manifest = getDataManifest();
  const structuralNeed = calculateStructuralNeed(
    getStructuralNeedByFips(base.countyFips) ?? defaultStructuralNeedRecord(base.countyFips)
  );
  const feasibility = calculateFeasibility(
    getFeasibilityByFips(base.countyFips) ?? defaultFeasibilityRecord(base.countyFips)
  );
  const operationalContext = buildOperationalContext(weather, gridStrain);
  const { lastUpdated, profileAssembledAt } = deriveProfileTimestamps([
    weather.lastUpdated ?? weather.fetchedAt,
    gridStrain.lastUpdated ?? gridStrain.fetchedAt,
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
    weather.quality,
    utilityQuality
  );
  const profile = {
    ...base,
    structuralNeed,
    feasibility,
    operationalContext,
    dataManifestVersion: manifest.schemaVersion,
    profileAssembledAt,
    lastUpdated,
    recommendation: "",
    dataQuality,
    sourceStatus: buildSourceStatus(
      base.countyFips,
      { structuralNeed, feasibility },
      weather,
      gridStrain,
      solarCache,
      utilityQuality,
      profileAssembledAt
    ),
  } satisfies CountyEnergyProfile;

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
    const fetchedAt = new Date().toISOString();
    const weather = weatherByFips.get(base.countyFips) ?? {
      countyFips: base.countyFips,
      highTempF: null,
      lowTempF: null,
      maxWindMph: null,
      precipInches: null,
      cloudCoverPercent: null,
      fetchedAt,
      quality: "unavailable" as const,
      sourceName: "Open-Meteo Forecast API",
      lastUpdated: null,
      limitation: "Weather data unavailable for this county profile.",
    };
    return mergeCountyProfile({ base, weather, solarCache, gridStrain });
  });
}
