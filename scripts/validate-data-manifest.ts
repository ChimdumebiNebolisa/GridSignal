/**
 * Validate data manifest and county indicator coverage.
 * Run: npx tsx scripts/validate-data-manifest.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const DATA = resolve(__dirname, "../src/data");
const EXPECTED_COUNTIES = 254;

type Manifest = {
  schemaVersion: string;
  scoreConfigVersion: string;
  generatedAt: string;
  sources: Array<{
    id: string;
    vintage: string;
    fetchedAt: string;
    coverage: string;
    quality: string;
    owner?: string;
    url?: string;
    limitation?: string;
  }>;
};

type StructuralRecord = {
  countyFips: string;
  structuralNeedScore: number | null;
  components: Record<string, { value: number | null }>;
  missingComponents: string[];
};

type FeasibilityRecord = {
  countyFips: string;
  feasibilityScore: number | null;
  components: { solarResource: { value: number | null } };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function main(): void {
  const errors: string[] = [];
  const manifest = readJson<Manifest>(resolve(DATA, "manifests/data-version.json"));
  const structural = readJson<StructuralRecord[]>(
    resolve(DATA, "indicators/county-structural-need.json")
  );
  const feasibility = readJson<FeasibilityRecord[]>(
    resolve(DATA, "indicators/county-feasibility.json")
  );

  if (manifest.schemaVersion !== "2.1.0") {
    errors.push(`Expected schemaVersion 2.1.0, got ${manifest.schemaVersion}`);
  }
  if (!manifest.generatedAt) {
    errors.push("manifest.generatedAt is required");
  }
  if (manifest.sources.length < 1) {
    errors.push("manifest.sources must not be empty");
  }
  if (!manifest.scoreConfigVersion || manifest.scoreConfigVersion === "none") {
    errors.push("scoreConfigVersion must identify the canonical scoring configuration");
  }
  for (const source of manifest.sources) {
    if (!source.id || !source.vintage || !source.fetchedAt || !source.coverage || !source.quality) {
      errors.push("each manifest source requires id, vintage, fetchedAt, coverage, and quality");
    }
    if (!source.limitation) {
      errors.push(source.id + ": source limitation is required");
    }
  }
  if (structural.length !== EXPECTED_COUNTIES) {
    errors.push(`structural need: expected ${EXPECTED_COUNTIES}, got ${structural.length}`);
  }
  if (feasibility.length !== EXPECTED_COUNTIES) {
    errors.push(`feasibility: expected ${EXPECTED_COUNTIES}, got ${feasibility.length}`);
  }

  const structuralFips = new Set(structural.map((r) => r.countyFips));
  const feasibilityFips = new Set(feasibility.map((r) => r.countyFips));
  if (structuralFips.size !== EXPECTED_COUNTIES) {
    errors.push("structural need: duplicate or missing FIPS");
  }
  if (feasibilityFips.size !== EXPECTED_COUNTIES) {
    errors.push("feasibility: duplicate or missing FIPS");
  }

  for (const record of structural) {
    const values = Object.values(record.components).map((component) => component.value);
    const available = values.filter((value): value is number => value !== null);
    const expectedMissing = values.length - available.length;
    if (record.missingComponents.length !== expectedMissing) {
      errors.push(record.countyFips + ": structural missingComponents does not match null components");
    }
    if (expectedMissing <= 1 && record.structuralNeedScore === null) {
      errors.push(record.countyFips + ": structural score is null despite sufficient components");
    }
    if (expectedMissing > 1 && record.structuralNeedScore !== null) {
      errors.push(record.countyFips + ": structural score must be null when more than one component is missing");
    }
  }

  for (const record of feasibility) {
    const solarValue = record.components.solarResource.value;
    if (solarValue === null && record.feasibilityScore !== null) {
      errors.push(record.countyFips + ": feasibility score must be null when solar value is null");
    }
    if (solarValue !== null && record.feasibilityScore === null) {
      errors.push(record.countyFips + ": feasibility score is null despite an available solar value");
    }
  }

  if (errors.length > 0) {
    console.error("Data validation FAILED:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("Data validation passed.");
}

main();
