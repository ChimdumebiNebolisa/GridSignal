/**
 * generate-cache-data.ts
 * Generates solar cache, weather cache, city/zip lookup, utility context,
 * static profiles, and sample grid strain from bundled county data.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../src/data");
const CACHE_DIR = resolve(DATA_DIR, "cache");

type Centroid = {
  countyFips: string;
  countyName: string;
  centroidLat: number;
  centroidLon: number;
};

type PopulationRecord = {
  countyFips: string;
  countyName: string;
  population: number;
};

type GeoJSONFeature = {
  type: "Feature";
  properties: { GEOID: string; NAME: string; STATEFP: string };
  geometry: { type: string; coordinates: unknown };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, geometry: GeoJSONFeature["geometry"]): boolean {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return pointInRing(lon, lat, coords[0]);
  }
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    return coords.some((poly) => pointInRing(lon, lat, poly[0]));
  }
  return false;
}

function estimateSolarKwh(lat: number, lon: number): number {
  // Deterministic latitude/longitude proxy for Texas solar irradiance (4 kW system)
  const lonFactor = (lon + 106) * 18;
  const latFactor = (32 - Math.abs(lat - 29.5)) * 45;
  return Math.round(4800 + lonFactor + latFactor);
}

async function fetchWeatherForCounty(c: Centroid): Promise<{
  countyFips: string;
  highTempF: number | null;
  lowTempF: number | null;
  maxWindMph: number | null;
  precipInches: number | null;
  fetchedAt: string;
  quality: "live" | "cached" | "estimated";
}> {
  const params = new URLSearchParams({
    latitude: c.centroidLat.toString(),
    longitude: c.centroidLon.toString(),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: "1",
    timezone: "America/Chicago",
  });

  try {
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      headers: { "User-Agent": "GridSignalTexas/1.0" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as {
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
      };
    };
    const d = data.daily;
    const cToF = (v: number) => Math.round(((v * 9) / 5 + 32) * 10) / 10;
    return {
      countyFips: c.countyFips,
      highTempF: d?.temperature_2m_max?.[0] != null ? cToF(d.temperature_2m_max[0]) : null,
      lowTempF: d?.temperature_2m_min?.[0] != null ? cToF(d.temperature_2m_min[0]) : null,
      maxWindMph:
        d?.wind_speed_10m_max?.[0] != null
          ? Math.round(d.wind_speed_10m_max[0] * 0.621371 * 10) / 10
          : null,
      precipInches:
        d?.precipitation_sum?.[0] != null
          ? Math.round(d.precipitation_sum[0] * 0.0393701 * 100) / 100
          : null,
      fetchedAt: new Date().toISOString(),
      quality: "cached",
    };
  } catch {
    return {
      countyFips: c.countyFips,
      highTempF: 90,
      lowTempF: 70,
      maxWindMph: 12,
      precipInches: 0,
      fetchedAt: new Date().toISOString(),
      quality: "estimated",
    };
  }
}

async function generateWeatherCache(centroids: Centroid[]) {
  console.log("Generating weather cache (Open-Meteo, batched)...");
  const results: Awaited<ReturnType<typeof fetchWeatherForCounty>>[] = [];
  const batchSize = 10;

  for (let i = 0; i < centroids.length; i += batchSize) {
    const batch = centroids.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchWeatherForCounty));
    results.push(...batchResults);
    console.log(`  Weather: ${Math.min(i + batchSize, centroids.length)}/${centroids.length}`);
    if (i + batchSize < centroids.length) await new Promise((r) => setTimeout(r, 300));
  }

  writeFileSync(
    resolve(CACHE_DIR, "weather-risk-by-county.json"),
    JSON.stringify(results, null, 2)
  );
}

function generateSolarCache(centroids: Centroid[]) {
  console.log("Generating solar cache (deterministic latitude proxy)...");
  const entries = centroids.map((c) => ({
    countyFips: c.countyFips,
    annualAcKwh: estimateSolarKwh(c.centroidLat, c.centroidLon),
    systemCapacityKw: 4,
    fetchedAt: new Date().toISOString(),
    quality: "estimated" as const,
  }));
  writeFileSync(
    resolve(CACHE_DIR, "solar-potential-by-county.json"),
    JSON.stringify(entries, null, 2)
  );
}

function generateUtilityContext(centroids: Centroid[]) {
  console.log("Generating utility context (unknown — no fabricated names)...");
  const entries = centroids.map((c) => ({
    countyFips: c.countyFips,
    countyName: c.countyName,
    likelyUtilityTerritories: [] as string[],
    utilityContextQuality: "unknown" as const,
    notes: "Utility/service territory context unavailable from verified static lookup.",
  }));
  writeFileSync(
    resolve(DATA_DIR, "county-utility-context.json"),
    JSON.stringify(entries, null, 2)
  );
}

async function generateCityLookup(
  _centroids: Centroid[],
  geojsonFeatures: GeoJSONFeature[]
) {
  console.log("Generating city-to-county via Census places spatial join...");
  const cityMap: Record<string, { countyFips: string; countyName: string }> = {};

  try {
    const resp = await fetch(
      "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_place_national.txt",
      { headers: { "User-Agent": "GridSignalTexas/1.0" } }
    );
    if (!resp.ok) throw new Error(`Gazetteer HTTP ${resp.status}`);
    const text = await resp.text();
    const lines = text.trim().split("\n");
    const header = lines[0].split("\t");
    const nameIdx = header.indexOf("NAME");
    const latIdx = header.indexOf("INTPTLAT");
    const lonIdx = header.indexOf("INTPTLONG");
    const stateIdx = header.indexOf("USPS");

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      if (cols[stateIdx] !== "TX") continue;
      const placeName = cols[nameIdx].replace(/ city$/i, "").replace(/ town$/i, "").trim();
      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

      const match = geojsonFeatures.find((f) => pointInPolygon(lon, lat, f.geometry));
      if (match) {
        const countyName = `${match.properties.NAME} County`;
        cityMap[placeName] = {
          countyFips: match.properties.GEOID,
          countyName,
        };
      }
    }
    console.log(`  Mapped ${Object.keys(cityMap).length} Texas places to counties`);
  } catch (err) {
    console.warn(`  City lookup failed: ${(err as Error).message}. Writing empty map.`);
  }

  writeFileSync(resolve(DATA_DIR, "city-to-county.json"), JSON.stringify(cityMap, null, 2));
}

async function generateZipLookup(geojsonFeatures: GeoJSONFeature[]) {
  console.log("Generating zip-to-county from Census ZCTA crosswalk...");
  const zipMap: Record<string, { countyFips: string; countyName: string }> = {};

  try {
    const resp = await fetch(
      "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt",
      { headers: { "User-Agent": "GridSignalTexas/1.0" } }
    );
    if (!resp.ok) throw new Error(`ZCTA crosswalk HTTP ${resp.status}`);
    const text = await resp.text();
    const lines = text.trim().split("\n");
    const header = lines[0].split("|");
    const zctaIdx = header.indexOf("ZCTA5CE20");
    const countyIdx = header.indexOf("COUNTY20");
    const stateIdx = header.indexOf("STATE20");
    const countyNameIdx = header.indexOf("NAMELSADCO");

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("|");
      if (cols[stateIdx] !== "48") continue;
      const zip = cols[zctaIdx];
      const countyFips = `48${cols[countyIdx].padStart(3, "0")}`;
      if (!zipMap[zip]) {
        zipMap[zip] = {
          countyFips,
          countyName: cols[countyNameIdx] || "Texas County",
        };
      }
    }
    console.log(`  Mapped ${Object.keys(zipMap).length} Texas ZIP codes`);
  } catch (err) {
    console.warn(`  ZIP lookup failed: ${(err as Error).message}. Writing empty map.`);
  }

  writeFileSync(resolve(DATA_DIR, "zip-to-county.json"), JSON.stringify(zipMap, null, 2));
}

function generateStaticProfiles(
  centroids: Centroid[],
  population: PopulationRecord[]
) {
  console.log("Generating static profiles...");
  const popByFips = new Map(population.map((p) => [p.countyFips, p]));
  const utility = readJson<
    Array<{
      countyFips: string;
      countyName: string;
      likelyUtilityTerritories: string[];
      utilityContextQuality: string;
    }>
  >(resolve(DATA_DIR, "county-utility-context.json"));

  const profiles = centroids.map((c) => {
    const pop = popByFips.get(c.countyFips);
    const util = utility.find((u) => u.countyFips === c.countyFips);
    return {
      countyFips: c.countyFips,
      countyName: c.countyName,
      state: "TX" as const,
      centroidLat: c.centroidLat,
      centroidLon: c.centroidLon,
      population: pop?.population ?? null,
      likelyUtilityTerritories: util?.likelyUtilityTerritories ?? [],
      utilityContextQuality: util?.utilityContextQuality ?? "unknown",
      gridRegion: "ERCOT" as const,
      countyGeometryId: c.countyFips,
    };
  });

  writeFileSync(
    resolve(DATA_DIR, "county-static-profiles.json"),
    JSON.stringify(profiles, null, 2)
  );
}

function generateSampleGridStrain() {
  console.log("Generating sample grid strain fallback...");
  const sample = {
    region: "ERCOT",
    currentDemandMw: null,
    forecastPeakDemandMw: null,
    gridStrainScore: 50,
    fetchedAt: new Date().toISOString(),
    quality: "estimated",
    explanation:
      "Neutral statewide grid strain fallback used when EIA data is unavailable. This is a balancing-authority-level signal, not county-level grid reliability.",
  };
  writeFileSync(resolve(DATA_DIR, "sample-grid-strain.json"), JSON.stringify(sample, null, 2));
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  const centroids = readJson<Centroid[]>(resolve(DATA_DIR, "county-centroids.json"));
  const geojson = readJson<{ features: GeoJSONFeature[] }>(
    resolve(DATA_DIR, "texas-counties.geojson")
  );

  generateSolarCache(centroids);
  generateUtilityContext(centroids);
  await generateCityLookup(centroids, geojson.features);
  await generateZipLookup(geojson.features);
  generateSampleGridStrain();

  const population = readJson<PopulationRecord[]>(
    resolve(DATA_DIR, "county-population.json")
  );
  generateStaticProfiles(centroids, population);

  await generateWeatherCache(centroids);

  console.log("Cache data generation complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
