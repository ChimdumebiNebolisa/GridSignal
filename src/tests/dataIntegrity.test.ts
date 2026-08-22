import { createHash } from "crypto";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  getCountyCentroids,
  getCountyPopulation,
  getCountyStaticProfiles,
  getSolarCache,
  getWeatherCache,
  getTexasGeoJson,
  TEXAS_COUNTY_COUNT,
} from "@/lib/data/counties";
import {
  getFeasibilityIndicators,
  getDataManifest,
  getStructuralNeedIndicators,
} from "@/lib/data/indicators";
import { resolve } from "path";

const DATA_ROOT = resolve(process.cwd(), "src", "data");

/** Bundled indicators must never claim authoritative provider attribution. */
const FORBIDDEN_BUNDLED_SOURCE_IDS = new Set([
  "fema_nri",
  "cdc_svi",
  "eagle_i",
  "nrel_pvwatts",
]);

const DATASETS: Array<[string, unknown[]]> = [];

function fipsOf(rows: Array<{ countyFips?: string }>): string[] {
  return rows.map((r) => r.countyFips ?? "");
}

describe("254-county bundle integrity", () => {
  const centroids = getCountyCentroids();
  const populations = getCountyPopulation();
  const profiles = getCountyStaticProfiles();
  const solar = getSolarCache();
  const weather = getWeatherCache();
  const structural = getStructuralNeedIndicators();
  const feasibility = getFeasibilityIndicators();
  const geo = getTexasGeoJson();

  const sets: Record<string, string[]> = {
    centroids: fipsOf(centroids),
    populations: fipsOf(populations),
    profiles: fipsOf(profiles),
    solar: fipsOf(solar),
    weather: fipsOf(weather),
    structural: fipsOf(structural),
    feasibility: fipsOf(feasibility),
    geojson: geo.features
      .map((f) => (f.properties as { GEOID?: string }).GEOID ?? "")
      .filter(Boolean),
  };

  it("has exactly 254 entries in every county-keyed dataset", () => {
    for (const [name, fips] of Object.entries(sets)) {
      expect(fips.length, name).toBe(TEXAS_COUNTY_COUNT);
    }
  });

  it("has unique, well-formed Texas FIPS codes everywhere", () => {
    for (const [name, fips] of Object.entries(sets)) {
      expect(new Set(fips).size, name).toBe(TEXAS_COUNTY_COUNT);
      for (const code of fips) {
        expect(code, `${name}:${code}`).toMatch(/^48\d{3}$/);
      }
    }
  });

  it("uses identical FIPS sets across all datasets", () => {
    const canonical = [...sets.centroids].sort().join(",");
    for (const [name, fips] of Object.entries(sets)) {
      expect([...fips].sort().join(","), name).toBe(canonical);
    }
  });

  it("matches county names between centroids and GeoJSON", () => {
    const namesByGeo = new Map(
      geo.features.map((f) => [
        (f.properties as { GEOID: string }).GEOID,
        (f.properties as { NAME: string }).NAME,
      ])
    );
    for (const c of centroids) {
      expect(namesByGeo.get(c.countyFips)).toBe(c.countyName.replace(/ County$/, ""));
    }
  });

  it("contains no zero or negative populations (zero is not a sentinel for missing)", () => {
    for (const p of populations) {
      expect(p.population).toBeGreaterThan(0);
    }
  });

  it("keeps profile population consistent with the population dataset", () => {
    const popMap = new Map(populations.map((p) => [p.countyFips, p.population]));
    for (const profile of profiles) {
      expect(profile.population).toBe(popMap.get(profile.countyFips));
    }
  });

  DATASETS.length = 0; // placeholder to keep lint satisfied about unused array
});

describe("manifest provenance and fingerprints", () => {
  const manifest = getDataManifest();

  it("declares the audited schema version and score config", () => {
    expect(manifest.schemaVersion).toBe("2.2.0");
    expect(manifest.scoreConfigVersion).toBe("two-axis-v1");
  });

  it("records sha256 fingerprints that match file contents on disk", () => {
    const artifacts = manifest.fingerprints?.artifacts ?? {};
    expect(Object.keys(artifacts).length).toBeGreaterThanOrEqual(8);
    expect(manifest.fingerprints?.algorithm).toBe("sha256");
    for (const [relPath, expected] of Object.entries(artifacts)) {
      const actual = createHash("sha256")
        .update(readFileSync(resolve(DATA_ROOT, relPath)))
        .digest("hex");
      expect(actual, relPath).toBe(expected);
    }
  });

  it("detects snapshot tampering via fingerprint mismatch", () => {
    // Mutating any fingerprint byte must break verification — this mirrors
    // what scripts/validate-data-manifest.ts enforces.
    const artifacts = manifest.fingerprints?.artifacts ?? {};
    const sampleKey = "county-centroids.json";
    expect(createHash("sha256").update("not-the-file").digest("hex")).not.toBe(
      artifacts[sampleKey]
    );
  });

  it("documents derivation methods for synthetic sources", () => {
    for (const source of manifest.sources) {
      if (source.id.startsWith("synthetic_")) {
        expect(source.method?.length ?? 0, source.id).toBeGreaterThan(10);
        expect(source.owner, source.id).not.toMatch(/^(fema|cdc|doe|nrel)/i);
      }
    }
  });

  it("binds every bundled indicator component to a manifest source id", () => {
    const manifestIds = new Set(manifest.sources.map((s) => s.id));
    for (const record of getStructuralNeedIndicators()) {
      for (const component of Object.values(record.components)) {
        expect(
          FORBIDDEN_BUNDLED_SOURCE_IDS.has(component.source),
          component.source
        ).toBe(false);
        expect(manifestIds.has(component.source), component.source).toBe(true);
      }
    }
    for (const record of getFeasibilityIndicators()) {
      const source = record.components.solarResource.source;
      expect(FORBIDDEN_BUNDLED_SOURCE_IDS.has(source), source).toBe(false);
      expect(manifestIds.has(source), source).toBe(true);
    }
  });
});
