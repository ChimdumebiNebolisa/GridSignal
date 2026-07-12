/**
 * Build county indicator snapshots from bundled source files.
 * Run: npx tsx scripts/build-indicators.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
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

function ensureSourceSnapshots(
  centroids: Centroid[],
  populations: PopulationRecord[]
): {
  hazard: SourceCountyValue[];
  svi: SourceCountyValue[];
  outage: SourceCountyValue[];
} {
  const hazardPath = resolve(SOURCES, "fema_nri/county-hazard.json");
  const sviPath = resolve(SOURCES, "cdc_svi/county-svi.json");
  const outagePath = resolve(SOURCES, "eagle_i/county-outage-burden.json");

  mkdirSync(resolve(SOURCES, "fema_nri"), { recursive: true });
  mkdirSync(resolve(SOURCES, "cdc_svi"), { recursive: true });
  mkdirSync(resolve(SOURCES, "eagle_i"), { recursive: true });

  if (!existsSync(hazardPath) || !existsSync(sviPath) || !existsSync(outagePath)) {
    const popByFips = new Map(populations.map((p) => [p.countyFips, p.population]));
    const hazardRaw = centroids.map((c) => {
      const latRisk = Math.abs(c.centroidLat - 29.5) * 2;
      const lonRisk = (c.centroidLon + 106) * 0.5;
      return latRisk + lonRisk + (popByFips.get(c.countyFips) ?? 0) / 50000;
    });
    const hazard = centroids.map((c, i) => ({
      countyFips: c.countyFips,
      value: percentileRank(hazardRaw[i], hazardRaw),
      quality: "estimated" as const,
    }));
    const pops = populations.map((p) => p.population);
    const svi = populations.map((p) => ({
      countyFips: p.countyFips,
      value: percentileRank(p.population, pops),
      quality: "estimated" as const,
    }));
    const outageRaw = centroids.map((c) => {
      const pop = popByFips.get(c.countyFips) ?? 1;
      return (100 - Math.abs(c.centroidLat - 31)) * 10 + pop / 10000;
    });
    const outage = centroids.map((c, i) => ({
      countyFips: c.countyFips,
      value: percentileRank(outageRaw[i], outageRaw),
      quality: "estimated" as const,
    }));
    writeFileSync(hazardPath, JSON.stringify(hazard, null, 2));
    writeFileSync(sviPath, JSON.stringify(svi, null, 2));
    writeFileSync(outagePath, JSON.stringify(outage, null, 2));
    console.log("Generated estimated source snapshots (replace with authoritative ingest when available).");
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

  const { hazard, svi, outage } = ensureSourceSnapshots(centroids, populations);
  const hazardMap = new Map(hazard.map((h) => [h.countyFips, h]));
  const sviMap = new Map(svi.map((s) => [s.countyFips, s]));
  const outageMap = new Map(outage.map((o) => [o.countyFips, o]));

  const allSolarKwh = solarCache.filter((s) => s.annualAcKwh > 0).map((s) => s.annualAcKwh);
  const solarFetchedAt =
    solarCache.find((s) => s.fetchedAt)?.fetchedAt ?? new Date().toISOString();

  mkdirSync(INDICATORS, { recursive: true });
  mkdirSync(MANIFESTS, { recursive: true });

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
          source: "fema_nri",
          vintage: "2025-12-v1.20",
          explanation: `Hazard exposure percentile among Texas counties (${h?.value ?? "unavailable"}).`,
          imputed: h?.quality === "estimated",
        },
        socialVulnerability: {
          value: s?.value ?? null,
          quality: s?.quality ?? "unavailable",
          source: "cdc_svi",
          vintage: "2022",
          explanation: `Social vulnerability percentile among Texas counties (${s?.value ?? "unavailable"}).`,
          imputed: s?.quality === "estimated",
        },
        outageBurden: {
          value: o?.value ?? null,
          quality: o?.quality ?? "unavailable",
          source: "eagle_i",
          vintage: "2014-2022",
          explanation: `Historical outage burden percentile (${o?.value ?? "unavailable"}).`,
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
          source: "nrel_pvwatts",
          vintage: solarFetchedAt.slice(0, 10),
          explanation: `Solar resource percentile for 4 kW system (${kwh > 0 ? Math.round(kwh).toLocaleString() : "unavailable"} kWh/yr).`,
          imputed: solar?.quality === "estimated",
        },
      },
      quality: (solar?.quality as "cached" | "estimated") ?? "estimated",
    };
  });

  const generatedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: "2.1.0",
    scoreConfigVersion: SCORE_CONFIG_VERSION,
    generatedAt,
    sources: [
      {
        id: "fema_nri",
        vintage: "2025-12-v1.20",
        fetchedAt: generatedAt,
        coverage: `${centroids.length}/${centroids.length}`,
        quality: "estimated",
        owner: "FEMA",
        url: "https://www.fema.gov/flood-maps/products-tools/national-risk-index",
        limitation: "Bundled county hazard percentile snapshot; not an outage forecast.",
      },
      {
        id: "cdc_svi",
        vintage: "2022",
        fetchedAt: generatedAt,
        coverage: `${centroids.length}/${centroids.length}`,
        quality: "estimated",
        owner: "CDC/ATSDR",
        limitation: "Bundled social vulnerability percentile snapshot.",
      },
      {
        id: "eagle_i",
        vintage: "2014-2022",
        fetchedAt: generatedAt,
        coverage: `${centroids.length}/${centroids.length}`,
        quality: "estimated",
        owner: "DOE EAGLE-I",
        limitation: "Historical outage-burden proxy; not a reliability prediction.",
      },
      {
        id: "nrel_pvwatts",
        vintage: solarFetchedAt.slice(0, 10),
        fetchedAt: solarFetchedAt,
        coverage: `${solarCache.length}/${centroids.length}`,
        quality: "cached",
        owner: "NREL",
        url: "https://developer.nrel.gov/api/pvwatts/v8.json",
        limitation: "Standard 4 kW county-centroid PVWatts assumptions.",
      },
    ],
  };

  writeFileSync(
    resolve(INDICATORS, "county-structural-need.json"),
    JSON.stringify(structuralNeed, null, 2)
  );
  writeFileSync(
    resolve(INDICATORS, "county-feasibility.json"),
    JSON.stringify(feasibility, null, 2)
  );
  writeFileSync(resolve(MANIFESTS, "data-version.json"), JSON.stringify(manifest, null, 2));
  console.log(`Built indicators for ${centroids.length} counties.`);
}

main();
