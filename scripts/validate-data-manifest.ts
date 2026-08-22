/**
 * Validate data manifest, county indicator coverage, provenance consistency,
 * and content fingerprints.
 * Run: npx tsx scripts/validate-data-manifest.ts
 */

import { readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";

const DATA = resolve(__dirname, "../src/data");
const EXPECTED_COUNTIES = 254;
const EXPECTED_SCHEMA_VERSION = "2.2.0";

/**
 * Bundled indicator components must use synthetic proxy ids only. Attributing
 * placeholder values to authoritative providers is a provenance violation
 * (audit F-001/F-002) and fails this gate.
 */
const FORBIDDEN_BUNDLED_SOURCE_IDS = new Set([
  "fema_nri",
  "cdc_svi",
  "eagle_i",
  "nrel_pvwatts",
]);

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
    method?: string;
    status?: string;
  }>;
  fingerprints?: {
    algorithm?: string;
    artifacts?: Record<string, string>;
  };
};

type StructuralRecord = {
  countyFips: string;
  structuralNeedScore: number | null;
  components: Record<string, { value: number | null; source: string }>;
  missingComponents: string[];
};

type FeasibilityRecord = {
  countyFips: string;
  feasibilityScore: number | null;
  components: { solarResource: { value: number | null; source: string } };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main(): void {
  const errors: string[] = [];
  const manifestPath = resolve(DATA, "manifests/data-version.json");
  const manifest = readJson<Manifest>(manifestPath);
  const structural = readJson<StructuralRecord[]>(
    resolve(DATA, "indicators/county-structural-need.json")
  );
  const feasibility = readJson<FeasibilityRecord[]>(
    resolve(DATA, "indicators/county-feasibility.json")
  );

  if (manifest.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
    errors.push(
      `Expected schemaVersion ${EXPECTED_SCHEMA_VERSION}, got ${manifest.schemaVersion}`
    );
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
    if (source.id.startsWith("synthetic_") && !source.method) {
      errors.push(source.id + ": synthetic sources must document their derivation method");
    }
    if (
      source.id.startsWith("synthetic_") &&
      source.owner &&
      /^(fema|cdc|doe|nrel|noaa|usgs)/i.test(source.owner)
    ) {
      errors.push(
        source.id + ": synthetic sources must not claim an authoritative owner"
      );
    }
  }
  const manifestSourceIds = new Set(manifest.sources.map((s) => s.id));

  // --- Fingerprint verification (reproducibility / tamper detection) ---
  const fingerprints = manifest.fingerprints?.artifacts ?? {};
  if (Object.keys(fingerprints).length === 0) {
    errors.push("manifest.fingerprints.artifacts is required for reproducibility");
  } else {
    if (manifest.fingerprints?.algorithm !== "sha256") {
      errors.push("manifest.fingerprints.algorithm must be sha256");
    }
    for (const [relPath, expectedHash] of Object.entries(fingerprints)) {
      const absPath = resolve(DATA, relPath);
      try {
        const actual = sha256File(absPath);
        if (actual !== expectedHash) {
          errors.push(
            `fingerprint mismatch for ${relPath}: manifest=${expectedHash} actual=${actual}`
          );
        }
      } catch {
        errors.push(`fingerprint target missing on disk: ${relPath}`);
      }
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

  const usedComponentSources = new Set<string>();
  for (const record of structural) {
    for (const component of Object.values(record.components)) {
      usedComponentSources.add(component.source);
    }
  }
  for (const record of feasibility) {
    usedComponentSources.add(record.components.solarResource.source);
  }

  for (const sourceId of usedComponentSources) {
    if (FORBIDDEN_BUNDLED_SOURCE_IDS.has(sourceId)) {
      errors.push(
        `bundled indicators reference forbidden source id '${sourceId}' — bundled values are synthetic placeholders and must use synthetic_* ids`
      );
    }
    if (sourceId !== "unavailable" && !manifestSourceIds.has(sourceId)) {
      errors.push(
        `component source '${sourceId}' has no matching manifest.sources entry`
      );
    }
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
