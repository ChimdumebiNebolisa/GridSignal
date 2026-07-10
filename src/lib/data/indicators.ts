/**
 * GridSignal Texas — Data manifest and indicator loaders
 */

import "server-only";
import type {
  CountyFeasibilityRecord,
  CountyStructuralNeedRecord,
  DataManifest,
} from "@/types/county";
import dataManifest from "@/data/manifests/data-version.json";
import structuralNeedIndicators from "@/data/indicators/county-structural-need.json";
import feasibilityIndicators from "@/data/indicators/county-feasibility.json";

export function getDataManifest(): DataManifest {
  return dataManifest as DataManifest;
}

export function getStructuralNeedIndicators(): CountyStructuralNeedRecord[] {
  return structuralNeedIndicators as CountyStructuralNeedRecord[];
}

export function getFeasibilityIndicators(): CountyFeasibilityRecord[] {
  return feasibilityIndicators as CountyFeasibilityRecord[];
}

export function getStructuralNeedByFips(
  fips: string
): CountyStructuralNeedRecord | undefined {
  return getStructuralNeedIndicators().find((r) => r.countyFips === fips);
}

export function getFeasibilityByFips(
  fips: string
): CountyFeasibilityRecord | undefined {
  return getFeasibilityIndicators().find((r) => r.countyFips === fips);
}
