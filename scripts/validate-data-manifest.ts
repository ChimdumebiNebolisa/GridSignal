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
const EXPECTED_SCHEMA_VERSION = "2.3.0";

/**
 * Placeholder ids are forbidden everywhere: bundled values must come from
 * authoritative ingests only (ADR 002/003). A synthetic value in the bundle
 * is a provenance violation and fails this gate.
 */
const FORBIDDEN_SYNTHETIC_SOURCE_IDS = new Set([
  "synthetic_hazard",
  "synthetic_svi",
  "synthetic_outage",
  "synthetic_solar",
]);

type Manifest = {
  schemaVersion: string;
  scoreConfigVersion: string;
  generatedAt: string;
  gates?: {
    structural: {
      coverageShare: number;
      coveragePass: boolean;
      stabilityWorstCase: number | null;
      stabilityPass: boolean | null;
      proxyCorrelation: number | null;
      proxyPass: boolean | null;
      pass: boolean;
      notes: string[];
    };
    feasibility: { coverageShare: number; coveragePass: boolean; pass: boolean };
    rankingsPublished: boolean;
  };
  sources: Array<{
    id: string;
    vintage: string;
    fetchedAt: string;
    coverage: string;
    quality: string;
    owner?: string;
    url?: string;
    endpoint?: string;
    limitation?: string;
    method?: string;
    status?: string;
    role?: string;
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
  const manifest = readJson<Manifest>(resolve(DATA, "manifests/data-version.json"));
  const structural = readJson<StructuralRecord[]>(
    resolve(DATA, "indicators/county-structural-need.json")
  );
  const feasibility = readJson<FeasibilityRecord[]>(
    resolve(DATA, "indicators/county-feasibility.json")
  );

  if (manifest.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
    errors.push(`Expected schemaVersion ${EXPECTED_SCHEMA_VERSION}, got ${manifest.schemaVersion}`);
  }
  if (!manifest.generatedAt) errors.push("manifest.generatedAt is required");
  if (manifest.sources.length < 1) errors.push("manifest.sources must not be empty");
  if (!manifest.scoreConfigVersion || manifest.scoreConfigVersion === "none") {
    errors.push("scoreConfigVersion must identify the canonical scoring configuration");
  }

  // --- Gates must be present and internally consistent ---
  const gates = manifest.gates;
  if (!gates) {
    errors.push("manifest.gates is required (rankings may only publish when gates pass)");
  } else {
    if (typeof gates.structural.coverageShare !== "number" || gates.structural.coverageShare < 0 || gates.structural.coverageShare > 1) {
      errors.push("gates.structural.coverageShare must be a 0-1 share");
    }
    if (typeof gates.feasibility.coverageShare !== "number") {
      errors.push("gates.feasibility.coverageShare must be a 0-1 share");
    }
    if (gates.rankingsPublished !== (gates.structural.pass && gates.feasibility.pass)) {
      errors.push("rankingsPublished must equal structural.pass AND feasibility.pass");
    }
  }

  for (const source of manifest.sources) {
    if (!source.id || !source.vintage || !source.fetchedAt || !source.coverage || !source.quality) {
      errors.push("each manifest source requires id, vintage, fetchedAt, coverage, and quality");
    }
    if (!source.limitation) errors.push(source.id + ": source limitation is required");
    if (FORBIDDEN_SYNTHETIC_SOURCE_IDS.has(source.id)) {
      errors.push(source.id + ": synthetic placeholder sources are forbidden in authoritative bundles");
    }
    if (source.status === "blocked") continue; // blocked acquisitions document themselves
    if (!source.endpoint && !source.url) {
      errors.push(source.id + ": authoritative sources must record an upstream endpoint or URL");
    }
    if (!source.method && source.role === "structural_need_component" && source.quality !== "unavailable") {
      errors.push(source.id + ": scored sources must document their transformation method");
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
      try {
        const actual = sha256File(resolve(DATA, relPath));
        if (actual !== expectedHash) {
          errors.push(`fingerprint mismatch for ${relPath}: manifest=${expectedHash} actual=${actual}`);
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
  if (structuralFips.size !== EXPECTED_COUNTIES) errors.push("structural need: duplicate or missing FIPS");
  if (feasibilityFips.size !== EXPECTED_COUNTIES) errors.push("feasibility: duplicate or missing FIPS");

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
    if (FORBIDDEN_SYNTHETIC_SOURCE_IDS.has(sourceId)) {
      errors.push(
        `bundled indicators reference forbidden synthetic id '${sourceId}' — values must come from authoritative ingests`
      );
    }
    if (sourceId !== "unavailable" && !manifestSourceIds.has(sourceId)) {
      errors.push(`component source '${sourceId}' has no matching manifest.sources entry`);
    }
  }

  // --- Withholding consistency ---
  for (const record of structural) {
    const values = Object.values(record.components).map((component) => component.value);
    const available = values.filter((value): value is number => value !== null);
    const expectedMissing = values.length - available.length;
    if (record.missingComponents.length !== expectedMissing) {
      errors.push(record.countyFips + ": missingComponents does not match null components");
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
    if ((solarValue === null) !== (record.feasibilityScore === null)) {
      errors.push(record.countyFips + ": feasibility score/value null-state mismatch");
    }
  }

  if (errors.length > 0) {
    console.error("Data validation FAILED:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("Data validation passed.");
  if (gates) {
    console.log(
      `Gates: structural=${gates.structural.pass} feasibility=${gates.feasibility.pass} rankingsPublished=${gates.rankingsPublished}`
    );
  }
}

main();
