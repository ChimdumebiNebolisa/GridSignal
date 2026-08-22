/**
 * Build county indicator snapshots from bundled source files.
 * Run: npx tsx scripts/build-indicators.ts
 *
 * Provenance policy (ADR 002, audit F-001/F-002/F-003):
 * - Bundled structural/feasibility values are SYNTHETIC planning proxies
 *   derived from county-centroid geometry and population placeholders.
 * - They are labeled `synthetic_*` end-to-end and are NEVER attributed to
 *   FEMA NRI, CDC SVI, DOE EAGLE-I, or NREL PVWatts until a real ingest lands.
 * - Missing source snapshots abort the build; this script never fabricates data.
 * - The manifest records SHA-256 fingerprints of every input and output so the
 *   bundle is machine-verifiable (npm run data:validate).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";
import { calculateStructuralNeed } from "@/lib/scoring/structuralNeed";
import { SCORE_CONFIG_VERSION } from "@/types/scoring";

const ROOT = resolve(__dirname, "..");
const DATA = resolve(ROOT, "src/data");
const SOURCES = resolve(DATA, "sources");
const INDICATORS = resolve(DATA, "indicators");
const MANIFESTS = resolve(DATA, "manifests");

type Centroid = {
  countyFips: string;
  countyName: string;
  centroidLat: number;
  centroidLon: number;
};

type PopulationRecord = {
  countyFips: string;
  population: number;
};

type SourceCountyValue = {
  countyFips: string;
  value: number | null;
  quality: "cached" | "estimated";
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function percentileRank(value: number, all: number[]): number {
  const sorted = [...all].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return Math.round(((below + 0.5 * equal) / sorted.length) * 100);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function requireSourceSnapshots(): {
  hazard: SourceCountyValue[];
  svi: SourceCountyValue[];
  outage: SourceCountyValue[];
} {
  const hazardPath = resolve(SOURCES, "fema_nri/county-hazard.json");
  const sviPath = resolve(SOURCES, "cdc_svi/county-svi.json");
  const outagePath = resolve(SOURCES, "eagle_i/county-outage-burden.json");

  const missing = [hazardPath, sviPath, outagePath].filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(
      "Missing bundled source snapshot(s):\n  " +
        missing.join("\n  ") +
        "\nAuthoritative ingest is required (see scripts/ingest/). " +
        "This build intentionally refuses to fabricate source data."
    );
  }

  return {
    hazard: readJson(hazardPath),
    svi: readJson(sviPath),
    outage: readJson(outagePath),
  };
}

function main() {
  const centroids = readJson<Centroid[]>(resolve(DATA, "county-centroids.json"));
  const populations = readJson<PopulationRecord[]>(resolve(DATA, "county-population.json"));
  const solarCache = readJson<
    { countyFips: string; annualAcKwh: number; quality: string; fetchedAt: string }[]
  >(resolve(DATA, "cache/solar-potential-by-county.json"));

  const { hazard, svi, outage } = requireSourceSnapshots();
  const hazardMap = new Map(hazard.map((h) => [h.countyFips, h]));
  const sviMap = new Map(svi.map((s) => [s.countyFips, s]));
  const outageMap = new Map(outage.map((o) => [o.countyFips, o]));

  const allSolarKwh = solarCache.filter((s) => s.annualAcKwh > 0).map((s) => s.annualAcKwh);
  // Generation time of the bundled synthetic solar placeholder cache.
  const solarCacheBuiltAt =
    solarCache.find((s) => s.fetchedAt)?.fetchedAt ?? new Date().toISOString();

  mkdirSync(INDICATORS, { recursive: true });
  mkdirSync(MANIFESTS, { recursive: true });

  const syntheticNote =
    "Synthetic planning proxy — not authoritative source data. Pending ingest.";

  const structuralNeedInputs = centroids.map((c) => {
    const h = hazardMap.get(c.countyFips);
    const s = sviMap.get(c.countyFips);
    const o = outageMap.get(c.countyFips);
    const missing: string[] = [];
    if (h?.value == null) missing.push("hazardExposure");
    if (s?.value == null) missing.push("socialVulnerability");
    if (o?.value == null) missing.push("outageBurden");

    return {
      countyFips: c.countyFips,
      structuralNeedScore: null as number | null,
      components: {
        hazardExposure: {
          value: h?.value ?? null,
          quality: h?.quality ?? "unavailable",
          source: "synthetic_hazard",
          vintage: "synthetic-v1",
          explanation: `Hazard-exposure proxy percentile among Texas counties (${h?.value ?? "unavailable"}). ${syntheticNote}`,
          imputed: h?.quality === "estimated",
        },
        socialVulnerability: {
          value: s?.value ?? null,
          quality: s?.quality ?? "unavailable",
          source: "synthetic_svi",
          vintage: "synthetic-v1",
          explanation: `Social-vulnerability proxy percentile among Texas counties (${s?.value ?? "unavailable"}). ${syntheticNote}`,
          imputed: s?.quality === "estimated",
        },
        outageBurden: {
          value: o?.value ?? null,
          quality: o?.quality ?? "unavailable",
          source: "synthetic_outage",
          vintage: "synthetic-v1",
          explanation: `Outage-burden proxy percentile among Texas counties (${o?.value ?? "unavailable"}). ${syntheticNote}`,
          imputed: o?.quality === "estimated",
        },
      },
      missingComponents: missing,
      quality: "estimated" as const,
    };
  });
  const structuralNeed = structuralNeedInputs.map((record) => ({
    ...record,
    structuralNeedScore: calculateStructuralNeed(record).score,
  }));

  const feasibility = centroids.map((c) => {
    const solar = solarCache.find((s) => s.countyFips === c.countyFips);
    const kwh = solar?.annualAcKwh ?? 0;
    const score = kwh > 0 ? percentileRank(kwh, allSolarKwh) : null;
    return {
      countyFips: c.countyFips,
      feasibilityScore: score,
      components: {
        solarResource: {
          value: score,
          quality: (solar?.quality as "cached" | "estimated") ?? "estimated",
          source: "synthetic_solar",
          vintage: "synthetic-v1",
          explanation: `Solar-resource proxy percentile for a standard 4 kW system (${kwh > 0 ? Math.round(kwh).toLocaleString() : "unavailable"} kWh/yr). ${syntheticNote}`,
          imputed: true,
        },
      },
      quality: (solar?.quality as "cached" | "estimated") ?? "estimated",
    };
  });

  const generatedAt = new Date().toISOString();
  const structuralPath = resolve(INDICATORS, "county-structural-need.json");
  const feasibilityPath = resolve(INDICATORS, "county-feasibility.json");

  const manifest = {
    schemaVersion: "2.2.0",
    scoreConfigVersion: SCORE_CONFIG_VERSION,
    generatedAt,
    sources: [
      {
        id: "synthetic_hazard",
        role: "structural_need_component",
        status: "synthetic_placeholder",
        vintage: "synthetic-v1",
        fetchedAt: generatedAt,
        coverage: `${centroids.length}/${centroids.length}`,
        quality: "estimated",
        owner: "GridSignal build pipeline",
        method:
          "Deterministic placeholder percentiles derived from county-centroid coordinates and population placeholders; awaiting FEMA NRI v1.20 county ingest.",
        limitation:
          "Not FEMA NRI data. Synthetic hazard-exposure proxy; not an outage forecast.",
      },
      {
        id: "synthetic_svi",
        role: "structural_need_component",
        status: "synthetic_placeholder",
        vintage: "synthetic-v1",
        fetchedAt: generatedAt,
        coverage: `${centroids.length}/${centroids.length}`,
        quality: "estimated",
        owner: "GridSignal build pipeline",
        method:
          "Placeholder percentiles of county population; awaiting CDC/ATSDR SVI county ingest.",
        limitation: "Not CDC/ATSDR SVI data. Population is a vulnerability proxy only.",
      },
      {
        id: "synthetic_outage",
        role: "structural_need_component",
        status: "synthetic_placeholder",
        vintage: "synthetic-v1",
        fetchedAt: generatedAt,
        coverage: `${centroids.length}/${centroids.length}`,
        quality: "estimated",
        owner: "GridSignal build pipeline",
        method:
          "Deterministic placeholder percentiles derived from county-centroid coordinates and population; awaiting DOE EAGLE-I historical aggregation.",
        limitation:
          "Not DOE EAGLE-I data. Synthetic outage-burden proxy; not a reliability prediction.",
      },
      {
        id: "synthetic_solar",
        role: "feasibility_component",
        status: "synthetic_placeholder",
        vintage: "synthetic-v1",
        fetchedAt: solarCacheBuiltAt,
        coverage: `${solarCache.length}/${centroids.length}`,
        quality: "estimated",
        owner: "GridSignal build pipeline",
        method:
          "Deterministic longitude/latitude irradiance proxy for a standard 4 kW system at the county centroid; live NREL PVWatts remains available per-request with an API key but does not feed this bundle.",
        limitation:
          "Not NREL PVWatts output. Solar-resource proxy for relative comparison only.",
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
        "sources/fema_nri/county-hazard.json": sha256File(
          resolve(SOURCES, "fema_nri/county-hazard.json")
        ),
        "sources/cdc_svi/county-svi.json": sha256File(
          resolve(SOURCES, "cdc_svi/county-svi.json")
        ),
        "sources/eagle_i/county-outage-burden.json": sha256File(
          resolve(SOURCES, "eagle_i/county-outage-burden.json")
        ),
        "indicators/county-structural-need.json": "",
        "indicators/county-feasibility.json": "",
      } as Record<string, string>,
    },
  };

  const structuralJson = JSON.stringify(structuralNeed, null, 2);
  const feasibilityJson = JSON.stringify(feasibility, null, 2);

  manifest.fingerprints.artifacts["indicators/county-structural-need.json"] =
    createHash("sha256").update(structuralJson).digest("hex");
  manifest.fingerprints.artifacts["indicators/county-feasibility.json"] =
    createHash("sha256").update(feasibilityJson).digest("hex");

  writeFileSync(structuralPath, structuralJson);
  writeFileSync(feasibilityPath, feasibilityJson);
  writeFileSync(resolve(MANIFESTS, "data-version.json"), JSON.stringify(manifest, null, 2));
  console.log(`Built indicators for ${centroids.length} counties.`);
}

main();
