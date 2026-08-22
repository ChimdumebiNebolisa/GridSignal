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
import {
  applyFeasibilityGate,
  applyStructuralGate,
  gatesFromManifest,
} from "@/lib/scoring/gates";
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
    feasibilityScore: null,
    components: {
      solarResource: {
        value: null,
        quality: "unavailable" as const,
        source: "pvgis_nsrdb",
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
      source: "fema_nri",
      sourceName: "FEMA National Risk Index (v1.20 counties)",
      quality: profile.structuralNeed.components.hazardExposure.quality,
      fetchedAt: profile.structuralNeed.components.hazardExposure.acquiredAt ?? null,
      lastUpdated: profile.structuralNeed.components.hazardExposure.acquiredAt ?? profileAssembledAt,
      limitation:
        "Composite NRI risk score percentile among Texas counties; not an outage forecast or reliability measure.",
      message: "Structural need — hazard risk component (FEMA NRI RISK_SCORE).",
    },
    {
      source: "cdc_svi",
      sourceName: "CDC/ATSDR Social Vulnerability Index 2022",
      quality: profile.structuralNeed.components.socialVulnerability.quality,
      fetchedAt: profile.structuralNeed.components.socialVulnerability.acquiredAt ?? null,
      lastUpdated:
        profile.structuralNeed.components.socialVulnerability.acquiredAt ?? profileAssembledAt,
      limitation:
        "Overall SVI percentile (RPL_THEMES) as published by ATSDR; a planning indicator, not grid reliability.",
      message: "Structural need — social vulnerability component.",
    },
    {
      source: "eagle_i",
      sourceName: "DOE EAGLE-I outage burden (2014-2022)",
      quality: profile.structuralNeed.components.outageBurden.quality,
      fetchedAt: profile.structuralNeed.components.outageBurden.acquiredAt ?? null,
      lastUpdated: profile.structuralNeed.components.outageBurden.acquiredAt ?? null,
      limitation:
        profile.structuralNeed.components.outageBurden.value === null
          ? "Component withheld: the authoritative EAGLE-I archive is not yet ingested (see sources/eagle_i/blocked.json). No proxy value is used."
          : "Historical outage burden percentile; a planning indicator, not an outage forecast.",
      message: "Structural need — historical outage burden component.",
    },
    {
      source: "pvgis_nsrdb",
      sourceName: "EC JRC PVGIS v5.2 / NSRDB solar simulation",
      quality: profile.feasibility.quality,
      fetchedAt: profile.feasibility.components.solarResource.acquiredAt ?? null,
      lastUpdated: solarUpdated,
      limitation:
        "County-centroid 4 kW fixed-tilt PV simulation on NSRDB irradiance (2005-2015); relative comparison only, not site-specific design and not an NREL PVWatts result.",
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
  const gateState = gatesFromManifest(manifest);
  const structuralNeed = applyStructuralGate(
    calculateStructuralNeed(
      getStructuralNeedByFips(base.countyFips) ?? defaultStructuralNeedRecord(base.countyFips)
    ),
    gateState
  );
  const feasibility = applyFeasibilityGate(
    calculateFeasibility(
      getFeasibilityByFips(base.countyFips) ?? defaultFeasibilityRecord(base.countyFips)
    ),
    gateState
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
