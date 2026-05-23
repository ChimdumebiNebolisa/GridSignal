/**
 * GridSignal Texas — Static data validation
 */

import type { CountyCentroidRecord } from "@/types/county";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateCountyCount(count: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (count !== 254) {
    errors.push(`Expected 254 Texas counties, found ${count}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateUniqueFips(fipsList: string[]): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const fips of fipsList) {
    if (seen.has(fips)) errors.push(`Duplicate FIPS: ${fips}`);
    seen.add(fips);
    if (!fips.startsWith("48") || fips.length !== 5) {
      errors.push(`Invalid Texas FIPS format: ${fips}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}

export function validateCentroids(centroids: CountyCentroidRecord[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const c of centroids) {
    if (c.centroidLat < 24 || c.centroidLat > 38) {
      warnings.push(`${c.countyFips}: unusual latitude ${c.centroidLat}`);
    }
    if (c.centroidLon > -92 || c.centroidLon < -108) {
      warnings.push(`${c.countyFips}: unusual longitude ${c.centroidLon}`);
    }
    if (!c.countyName) {
      errors.push(`${c.countyFips}: missing county name`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateGeoJsonFeatureMatch(
  geoFips: string[],
  centroidFips: string[]
): ValidationResult {
  const errors: string[] = [];
  const geoSet = new Set(geoFips);
  const centroidSet = new Set(centroidFips);

  for (const fips of geoSet) {
    if (!centroidSet.has(fips)) {
      errors.push(`GeoJSON feature ${fips} has no matching centroid`);
    }
  }
  for (const fips of centroidSet) {
    if (!geoSet.has(fips)) {
      errors.push(`Centroid ${fips} has no matching GeoJSON feature`);
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}

export function runStaticDataValidation(input: {
  countyCount: number;
  fipsList: string[];
  centroids: CountyCentroidRecord[];
  geoFips: string[];
}): ValidationResult {
  const results = [
    validateCountyCount(input.countyCount),
    validateUniqueFips(input.fipsList),
    validateCentroids(input.centroids),
    validateGeoJsonFeatureMatch(input.geoFips, input.fipsList),
  ];

  return {
    valid: results.every((r) => r.valid),
    errors: results.flatMap((r) => r.errors),
    warnings: results.flatMap((r) => r.warnings),
  };
}
