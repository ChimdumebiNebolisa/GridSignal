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
  sources: unknown[];
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function main(): void {
  const errors: string[] = [];
  const manifest = readJson<Manifest>(resolve(DATA, "manifests/data-version.json"));
  const structural = readJson<{ countyFips: string }[]>(
    resolve(DATA, "indicators/county-structural-need.json")
  );
  const feasibility = readJson<{ countyFips: string }[]>(
    resolve(DATA, "indicators/county-feasibility.json")
  );

  if (manifest.schemaVersion !== "2.0.0") {
    errors.push(`Expected schemaVersion 2.0.0, got ${manifest.schemaVersion}`);
  }
  if (!manifest.generatedAt) {
    errors.push("manifest.generatedAt is required");
  }
  if (manifest.sources.length < 1) {
    errors.push("manifest.sources must not be empty");
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

  if (errors.length > 0) {
    console.error("Data validation FAILED:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("Data validation passed.");
}

main();
