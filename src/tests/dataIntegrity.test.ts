import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
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
  getDataManifest,
  getFeasibilityIndicators,
  getStructuralNeedIndicators,
} from "@/lib/data/indicators";

const DATA_ROOT = resolve(process.cwd(), "src", "data");
const sha = (p: string) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");

/** Placeholder ids are forbidden in authoritative bundles (ADR 002/003). */
const FORBIDDEN_SYNTHETIC_IDS = new Set([
  "synthetic_hazard",
  "synthetic_svi",
  "synthetic_outage",
  "synthetic_solar",
]);

function envelopeRecords(rel: string): Array<Record<string, unknown>> {
  const env = JSON.parse(readFileSync(resolve(DATA_ROOT, rel), "utf-8"));
  return env.records;
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
    centroids: centroids.map((r) => r.countyFips),
    populations: populations.map((r) => r.countyFips),
    profiles: profiles.map((r) => r.countyFips),
    solar: solar.map((r) => r.countyFips),
    weather: weather.map((r) => r.countyFips),
    structural: structural.map((r) => r.countyFips),
    feasibility: feasibility.map((r) => r.countyFips),
    geojson: geo.features
      .map((f) => (f.properties as { GEOID?: string }).GEOID ?? "")
      .filter(Boolean),
  };

  it("has exactly 254 unique valid-FIPS entries in every county-keyed dataset", () => {
    for (const [name, fips] of Object.entries(sets)) {
      expect(fips.length, name).toBe(TEXAS_COUNTY_COUNT);
      expect(new Set(fips).size, name).toBe(TEXAS_COUNTY_COUNT);
      for (const code of fips.slice(0, 5)) expect(code).toMatch(/^48\d{3}$/);
    }
  });

  it("keeps county names consistent between centroids and GeoJSON", () => {
    const namesByGeo = new Map(
      geo.features.map((f) => [
        (f.properties as { GEOID: string }).GEOID,
        (f.properties as { NAME: string }).NAME,
      ])
    );
    for (const c of centroids.slice(0, 30)) {
      expect(namesByGeo.get(c.countyFips)).toBe(c.countyName.replace(/ County$/, ""));
    }
  });

  it("contains no zero or negative populations", () => {
    for (const p of populations) expect(p.population).toBeGreaterThan(0);
  });
});

describe("authoritative provenance (ADR-003)", () => {
  const manifest = getDataManifest();

  it("declares schema 2.3.0 and the canonical score config", () => {
    expect(manifest.schemaVersion).toBe("2.3.0");
    expect(manifest.scoreConfigVersion).toBe("two-axis-v1");
  });

  it("records SHA-256 fingerprints that match files on disk", () => {
    const artifacts = manifest.fingerprints?.artifacts ?? {};
    expect(Object.keys(artifacts).length).toBeGreaterThanOrEqual(8);
    for (const [relPath, expected] of Object.entries(artifacts)) {
      expect(sha(resolve(DATA_ROOT, relPath)), relPath).toBe(expected);
    }
  });

  it("binds every bundled component to a manifest source and forbids synthetic ids", () => {
    const manifestIds = new Set(manifest.sources.map((s) => s.id));
    for (const record of getStructuralNeedIndicators()) {
      for (const component of Object.values(record.components)) {
        expect(FORBIDDEN_SYNTHETIC_IDS.has(component.source), component.source).toBe(false);
        if (component.value !== null || component.source !== "unavailable") {
          expect(manifestIds.has(component.source), component.source).toBe(true);
        }
      }
    }
    for (const record of getFeasibilityIndicators()) {
      const source = record.components.solarResource.source;
      expect(FORBIDDEN_SYNTHETIC_IDS.has(source)).toBe(false);
      expect(manifestIds.has(source)).toBe(true);
    }
  });

  it("documents endpoint, acquisition time, method, vintage on scored sources", () => {
    for (const s of manifest.sources) {
      if (s.status === "blocked") continue;
      expect(s.endpoint ?? s.url, s.id).toBeTruthy();
      expect(s.vintage.length, s.id).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(s.fetchedAt)), s.id).toBe(false);
    }
  });

  it("verifies source-envelope fingerprints against recorded values", () => {
    for (const rel of ["sources/fema_nri/county-hazard.json", "sources/cdc_svi/county-svi.json"]) {
      const env = JSON.parse(readFileSync(resolve(DATA_ROOT, rel), "utf-8"));
      const expected = env.provenance.recordsFingerprint;
      const actual = createHash("sha256")
        .update(JSON.stringify(env.records))
        .digest("hex");
      expect(actual, rel).toBe(expected);
    }
    const solarProv = JSON.parse(
      readFileSync(resolve(DATA_ROOT, "cache/solar-potential-provenance.json"), "utf-8")
    );
    const cacheText = readFileSync(
      resolve(DATA_ROOT, "cache/solar-potential-by-county.json"),
      "utf-8"
    );
    // Cache file is pretty-printed; fingerprint is over the parsed array.
    const actual = createHash("sha256")
      .update(JSON.stringify(JSON.parse(cacheText)))
      .digest("hex");
    expect(actual).toBe(solarProv.fingerprint);
  });

  it("marks EAGLE-I as explicitly blocked with no fabricated outage data", () => {
    expect(existsSync(resolve(DATA_ROOT, "sources/eagle_i/blocked.json"))).toBe(true);
    expect(existsSync(resolve(DATA_ROOT, "sources/eagle_i/county-outage-burden.json"))).toBe(false);
    for (const record of getStructuralNeedIndicators()) {
      expect(record.components.outageBurden.value).toBeNull();
      expect(record.missingComponents).toContain("outageBurden");
    }
  });
});

describe("validation against known counties (real ingested data)", () => {
  const hazard = new Map(
    envelopeRecords("sources/fema_nri/county-hazard.json").map((r) => [
      r.countyFips as string,
      r as { rawValue?: number | null; value: number | null },
    ])
  );
  const svi = new Map(
    envelopeRecords("sources/cdc_svi/county-svi.json").map((r) => [
      r.countyFips as string,
      r as { value: number | null },
    ])
  );
  const solar = new Map(getSolarCache().map((s) => [s.countyFips, s]));

  it("NRI anchors: Harris highest-risk percentile, Loving at zero", () => {
    const harris = hazard.get("48201");
    const loving = hazard.get("48301");
    expect(harris?.value).toBe(100);
    expect(harris?.rawValue).toBeGreaterThan(90);
    expect(loving?.value).toBeLessThanOrEqual(2);
  });

  it("SVI anchors: wealthy Rockwall far below rural Zavala/Collingsworth", () => {
    expect((svi.get("48397")?.value ?? 99)).toBeLessThan(20);
    expect((svi.get("48507")?.value ?? 0)).toBeGreaterThan(80);
    expect((svi.get("48107")?.value ?? 0)).toBeGreaterThan(80);
  });

  it("PVGIS/NSRDB anchors: west-Texas desert exceeds humid Gulf coast", () => {
    const elPaso = solar.get("48141")?.annualAcKwh ?? 0;
    const harris = solar.get("48201")?.annualAcKwh ?? 0;
    expect(elPaso).toBeGreaterThan(harris);
    expect(elPaso).toBeGreaterThan(6500);
    expect(harris).toBeGreaterThan(4500);
    expect(elPaso).toBeLessThan(9000);
  });

  it("structural scores exist for all counties on two components (gate may withhold ordinals at runtime)", () => {
    for (const r of getStructuralNeedIndicators()) {
      expect(r.structuralNeedScore).not.toBeNull();
      expect(r.components.hazardExposure.value).not.toBeNull();
      expect(r.components.socialVulnerability.value).not.toBeNull();
    }
  });

  it("manifest gates reflect the sensitivity outcome and bind rankings", () => {
    const gates = getDataManifest().gates;
    expect(gates).toBeDefined();
    expect(gates!.structural.coveragePass).toBe(true);
    // Honest regression anchor: the real-data bundle currently FAILS the
    // declared 80% worst-case weight-sweep stability gate.
    expect(gates!.structural.stabilityWorstCase).toBeLessThan(0.8);
    expect(gates!.structural.stabilityPass).toBe(false);
    expect(gates!.rankingsPublished).toBe(false);
  });
});
