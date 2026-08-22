/**
 * Build county indicator snapshots from authoritative ingested sources.
 * Run: npx tsx scripts/build-indicators.ts
 *
 * Provenance policy (ADR 002/003):
 * - Structural and solar values come exclusively from authoritative ingests
 *   (FEMA NRI, CDC/ATSDR SVI, DOE EAGLE-I when available, EC JRC PVGIS).
 * - Source snapshots use a provenance-envelope format with per-file
 *   fingerprints; missing or tampered snapshots abort the build.
 * - The DOE EAGLE-I archive is currently a documented BLOCKED acquisition;
 *   its component is unavailable — never fabricated or proxied.
 * - Coverage/sensitivity gates are evaluated at build time and recorded in
 *   the manifest; runtime withholds ordinal rankings when gates fail.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { SCORE_CONFIG_VERSION } from "@/types/scoring";
import {
  computeValidationSummary,
  type StructuralRecord,
} from "@/lib/scoring/validationMetrics";
import type { RankingGates } from "@/types/county";

const ROOT = resolve(__dirname, "..");
const DATA = resolve(ROOT, "src/data");
const SOURCES = resolve(DATA, "sources");
const INDICATORS = resolve(DATA, "indicators");
const MANIFESTS = resolve(DATA, "manifests");

type Centroid = { countyFips: string; countyName: string; centroidLat: number; centroidLon: number };
type PopulationRecord = { countyFips: string; population: number };

type Envelope = {
  provenance: {
    id: string;
    sourceName: string;
    endpoint?: string;
    owner?: string;
    field?: string;
    vintage: string;
    acquiredAt: string;
    coverage: string;
    quality: string;
    transformation?: string;
    limitation: string;
    license?: string;
    recordsFingerprint?: string;
    fingerprint?: string;
    attributionNote?: string;
    status?: string;
    reason?: string;
  };
  records: Array<{
    countyFips: string;
    rawValue?: number | null;
    value: number | null;
    quality: string;
  }>;
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function loadEnvelope(path: string): Envelope | null {
  if (!existsSync(path)) return null;
  const env = JSON.parse(readFileSync(path, "utf-8")) as Envelope;
  if (!env.provenance || !Array.isArray(env.records)) {
    throw new Error(`Malformed source snapshot envelope: ${path}`);
  }
  const expected = env.provenance.recordsFingerprint ?? env.provenance.fingerprint;
  if (!expected) throw new Error(`Snapshot ${path} has no records fingerprint`);
  const actual = sha256(JSON.stringify(env.records));
  if (actual !== expected) {
    throw new Error(`Snapshot fingerprint mismatch for ${path}: manifest=${expected} actual=${actual}`);
  }
  return env;
}

function requireEnvelope(id: string, path: string): Envelope {
  const env = loadEnvelope(path);
  if (!env) {
    throw new Error(
      `Missing authoritative snapshot for ${id}: ${path}\n` +
        "Run the corresponding scripts/ingest/* pipeline. This build never fabricates source data."
    );
  }
  return env;
}

function recordMap(env: Envelope): Map<string, Envelope["records"][number]> {
  return new Map(env.records.map((r) => [r.countyFips, r]));
}

/** Coverage/sensitivity gates. Rankings are published only when all pass. */
function evaluateGates(
  structural: StructuralRecord[],
  populations: Map<string, number>,
  feasibilityScored: number,
  total: number
): RankingGates {
  const summary = computeValidationSummary(structural, populations);
  const coverageShare = summary.scoredCounties / total;
  const coveragePass = coverageShare >= 0.9;

  const stabilityWorstCase = summary.hazardWeightStabilityMin;
  const stabilityPass = stabilityWorstCase >= 0.8;

  // Outcome-proxy correlation only applies when the outage-burden component
  // is present; otherwise it is not applicable (null), not failing.
  const outagePresent = structural.some(
    (r) => r.components.outageBurden.value !== null
  );
  const proxyCorrelation = outagePresent ? summary.rhoOutageBurden : null;
  const proxyPass = proxyCorrelation === null ? null : proxyCorrelation >= 0.4;

  const notes: string[] = [];
  if (!coveragePass) notes.push("structural coverage below 90%");
  if (stabilityPass === false)
    notes.push("worst-case +/-20% weight sweep rank stability below 80%");
  if (proxyPass === false) notes.push("outcome-proxy correlation below 0.4");

  const feasCoverage = feasibilityScored / total;
  const feasPass = feasCoverage >= 0.9;

  const structuralPass =
    coveragePass && stabilityPass !== false && proxyPass !== false;

  return {
    structural: {
      coverageShare,
      coveragePass,
      stabilityWorstCase,
      stabilityPass,
      proxyCorrelation,
      proxyPass,
      pass: structuralPass,
      notes,
    },
    feasibility: { coverageShare: feasCoverage, coveragePass: feasPass, pass: feasPass },
    rankingsPublished: structuralPass && feasPass,
  };
}

function main() {
  const centroids = readJson<Centroid[]>(resolve(DATA, "county-centroids.json"));
  const populations = readJson<PopulationRecord[]>(resolve(DATA, "county-population.json"));
  const popMap = new Map(populations.map((p) => [p.countyFips, p.population]));

  const hazardEnv = requireEnvelope(
    "fema_nri",
    resolve(SOURCES, "fema_nri/county-hazard.json")
  );
  const sviEnv = requireEnvelope("cdc_svi", resolve(SOURCES, "cdc_svi/county-svi.json"));

  const outagePath = resolve(SOURCES, "eagle_i/county-outage-burden.json");
  const outageBlockedPath = resolve(SOURCES, "eagle_i/blocked.json");
  const outageEnv = loadEnvelope(outagePath); // may be null -> component unavailable
  if (!outageEnv && !existsSync(outageBlockedPath)) {
    throw new Error(
      "No EAGLE-I snapshot and no blocked.json marker. Run scripts/ingest/eagle-i.ts to record the acquisition state."
    );
  }

  const solarCache = readJson<
    { countyFips: string; annualAcKwh: number; systemCapacityKw: number; fetchedAt: string; quality: string }[]
  >(resolve(DATA, "cache/solar-potential-by-county.json"));
  const solarProvPath = resolve(DATA, "cache/solar-potential-provenance.json");
  if (!existsSync(solarProvPath)) {
    throw new Error(
      "Missing cache/solar-potential-provenance.json. Solar values must come from scripts/ingest/pvgis-solar.ts."
    );
  }
  const solarProv = JSON.parse(readFileSync(solarProvPath, "utf-8")) as Envelope["provenance"];
  const solarExpected = solarProv.fingerprint;
  const solarActual = sha256(JSON.stringify(solarCache));
  if (solarExpected !== solarActual) {
    throw new Error(
      `Solar cache fingerprint mismatch: manifest=${solarExpected} actual=${solarActual}`
    );
  }

  const hazardByFips = recordMap(hazardEnv);
  const sviByFips = recordMap(sviEnv);
  const outageByFips = outageEnv ? recordMap(outageEnv) : new Map();
  const solarByFips = new Map(solarCache.map((s) => [s.countyFips, s]));

  mkdirSync(INDICATORS, { recursive: true });
  mkdirSync(MANIFESTS, { recursive: true });

  const structuralNeedInputs: StructuralRecord[] = centroids.map((c) => {
    const h = hazardByFips.get(c.countyFips);
    const s = sviByFips.get(c.countyFips);
    const o = outageByFips.get(c.countyFips);
    const missing: string[] = [];
    if (h?.value == null) missing.push("hazardExposure");
    if (s?.value == null) missing.push("socialVulnerability");
    if (o?.value == null) missing.push("outageBurden");

    const outageUnavailableText = `Historical outage burden unavailable: the DOE EAGLE-I archive acquisition is documented as blocked (sources/eagle_i/blocked.json).`;

    return {
      countyFips: c.countyFips,
      structuralNeedScore: null as number | null,
      components: {
        hazardExposure: {
          value: h?.value ?? null,
          quality: h?.quality ?? "unavailable",
          source: "fema_nri",
          vintage: hazardEnv.provenance.vintage,
          acquiredAt: hazardEnv.provenance.acquiredAt,
          method: `${hazardEnv.provenance.transformation ?? ""} Field ${hazardEnv.provenance.field}.`,
          explanation: `Hazard risk percentile among Texas counties (${h?.value ?? "unavailable"}; NRI RISK_SCORE raw ${h?.rawValue ?? "n/a"}).`,
          imputed: false,
        },
        socialVulnerability: {
          value: s?.value ?? null,
          quality: s?.quality ?? "unavailable",
          source: "cdc_svi",
          vintage: sviEnv.provenance.vintage,
          acquiredAt: sviEnv.provenance.acquiredAt,
          method: sviEnv.provenance.transformation,
          explanation: `CDC/ATSDR SVI 2022 overall percentile, national scale (${s?.value ?? "unavailable"}).`,
          imputed: false,
        },
        outageBurden: o
          ? {
              value: o.value ?? null,
              quality: o.quality ?? "unavailable",
              source: "eagle_i",
              vintage: outageEnv!.provenance.vintage,
              acquiredAt: outageEnv!.provenance.acquiredAt,
              method: outageEnv!.provenance.transformation,
              explanation: `Historical outage burden percentile (${o.value ?? "unavailable"}).`,
              imputed: false,
            }
          : {
              value: null,
              quality: "unavailable" as const,
              source: "eagle_i",
              vintage: "n/a",
              explanation: outageUnavailableText,
              imputed: false,
            },
      },
      missingComponents: missing,
      quality: "cached" as const,
    };
  });

  const structuralNeed = structuralNeedInputs.map((record) => ({
    ...record,
    structuralNeedScore: calculateStructuralNeed(record).score,
  }));

  const allSolarKwh = solarCache.filter((s) => s.annualAcKwh > 0).map((s) => s.annualAcKwh);

  function percentileOf(value: number, all: number[]): number {
    const sorted = [...all].sort((a, b) => a - b);
    const below = sorted.filter((v) => v < value).length;
    const equal = sorted.filter((v) => v === value).length;
    return Math.round(((below + 0.5 * equal) / sorted.length) * 100);
  }

  const feasibility = centroids.map((c) => {
    const solar = solarByFips.get(c.countyFips);
    const kwh = solar?.annualAcKwh ?? 0;
    const score = kwh > 0 ? percentileOf(kwh, allSolarKwh) : null;
    return {
      countyFips: c.countyFips,
      feasibilityScore: score,
      components: {
        solarResource: {
          value: score,
          quality: solar?.quality ?? "unavailable",
          source: "pvgis_nsrdb",
          vintage: solarProv.vintage,
          acquiredAt: solar.fetchedAt,
          method: solarProv.transformation,
          explanation: `PVGIS/NSRDB simulated output for a standard 4 kW system (${kwh > 0 ? Math.round(kwh).toLocaleString() : "unavailable"} kWh/yr); percentile among Texas counties.`,
          imputed: false,
        },
      },
      quality: solar?.quality ?? "unavailable",
    };
  });

  function percentileOf(value: number, all: number[]): number {
    const sorted = [...all].sort((a, b) => a - b);
    const below = sorted.filter((v) => v < value).length;
    const equal = sorted.filter((v) => v === value).length;
    return Math.round(((below + 0.5 * equal) / sorted.length) * 100);
  }

  function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  }

  const generatedAt = new Date().toISOString();
  const structuralPath = resolve(INDICATORS, "county-structural-need.json");
  const feasibilityPath = resolve(INDICATORS, "county-feasibility.json");

  const gates = evaluateGates(
    structuralNeed,
    popMap,
    feasibility.filter((f) => f.feasibilityScore !== null).length,
    centroids.length
  );

  const manifest = {
    schemaVersion: "2.3.0",
    scoreConfigVersion: SCORE_CONFIG_VERSION,
    generatedAt,
    gates,
    sources: [
      {
        ...hazardEnv.provenance,
        method: hazardEnv.provenance.transformation,
        fetchedAt: hazardEnv.provenance.acquiredAt,
        role: "structural_need_component",
      },
      {
        ...sviEnv.provenance,
        method: sviEnv.provenance.transformation,
        fetchedAt: sviEnv.provenance.acquiredAt,
        role: "structural_need_component",
      },
      outageEnv
        ? {
            ...outageEnv.provenance,
            method: outageEnv.provenance.transformation,
            fetchedAt: outageEnv.provenance.acquiredAt,
            role: "structural_need_component",
          }
        : {
            id: "eagle_i",
            sourceName: "DOE EAGLE-I county outage burden",
            status: "blocked",
            vintage: "n/a",
            fetchedAt: generatedAt,
            coverage: "0/254",
            quality: "unavailable",
            reason:
              "Authoritative multi-GB archive not acquirable in this environment; see sources/eagle_i/blocked.json.",
            limitation:
              "Component withheld rather than fabricated; structural axis scores on remaining components.",
            role: "structural_need_component",
          },
      {
        ...solarProv,
        fetchedAt: solarProv.acquiredAt,
        role: "feasibility_component",
      },
    ],
    fingerprints: {
      algorithm: "sha256",
      artifacts: {
        "county-centroids.json": sha256File(resolve(DATA, "county-centroids.json")),
        "county-population.json": sha256File(resolve(DATA, "county-population.json")),
        "cache/solar-potential-by-county.json": sha256File(
          resolve(DATA, "cache/solar-potential-by-county.json")
        ),
        "cache/solar-potential-provenance.json": sha256File(solarProvPath),
        "sources/fema_nri/county-hazard.json": sha256File(
          resolve(SOURCES, "fema_nri/county-hazard.json")
        ),
        "sources/cdc_svi/county-svi.json": sha256File(resolve(SOURCES, "cdc_svi/county-svi.json")),
        ...(existsSync(outageBlockedPath)
          ? { "sources/eagle_i/blocked.json": sha256File(outageBlockedPath) }
          : {}),
        ...(outageEnv ? { "sources/eagle_i/county-outage-burden.json": sha256File(outagePath) } : {}),
        "indicators/county-structural-need.json": "",
        "indicators/county-feasibility.json": "",
      } as Record<string, string>,
    },
  };

  const structuralJson = JSON.stringify(structuralNeed, null, 2);
  const feasibilityJson = JSON.stringify(feasibility, null, 2);

  manifest.fingerprints.artifacts["indicators/county-structural-need.json"] =
    sha256(structuralJson);
  manifest.fingerprints.artifacts["indicators/county-feasibility.json"] =
    sha256(feasibilityJson);

  writeFileSync(structuralPath, structuralJson);
  writeFileSync(feasibilityPath, feasibilityJson);
  writeFileSync(resolve(MANIFESTS, "data-version.json"), JSON.stringify(manifest, null, 2));

  console.log(`Built indicators for ${centroids.length} counties.`);
  console.log(
    `Gates: structural=${gates.structural.pass} feasibility=${gates.feasibility.pass} rankingsPublished=${gates.rankingsPublished}`
  );
  console.log(
    `  coverage=${(gates.structural.coverageShare * 100).toFixed(1)}% stabilityWorstCase=${
      gates.structural.stabilityWorstCase === null
        ? "n/a"
        : (gates.structural.stabilityWorstCase * 100).toFixed(1) + "%"
    } proxy=${gates.structural.proxyCorrelation === null ? "n/a" : gates.structural.proxyCorrelation.toFixed(3)}`
  );
  for (const note of gates.structural.notes) console.log(`  gate-note: ${note}`);
}

main();

