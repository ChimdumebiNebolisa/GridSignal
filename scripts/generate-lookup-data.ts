/**
 * generate-lookup-data.ts
 * Regenerates city-to-county and zip-to-county using alternative public sources.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../src/data");
const TX_ZIP_GEOJSON =
  "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/tx_texas_zip_codes_geo.min.json";
const US_CITIES_CSV =
  "https://raw.githubusercontent.com/kelvins/US-Cities-Database/main/us-cities.csv";

type GeoJSONFeature = {
  properties: { ZCTA5CE10?: string; INTPTLAT10?: string; INTPTLON10?: string };
  geometry: { type: string; coordinates: unknown };
};

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
    return pointInRing(lon, lat, (geometry.coordinates as number[][][])[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).some((poly) =>
      pointInRing(lon, lat, poly[0])
    );
  }
  return false;
}

async function generateZipLookup() {
  console.log("Generating ZIP lookup from Texas ZCTA GeoJSON...");
  const countyGeo = JSON.parse(
    readFileSync(resolve(DATA_DIR, "texas-counties.geojson"), "utf-8")
  ) as { features: Array<{ properties: { GEOID: string; NAME: string }; geometry: GeoJSONFeature["geometry"] }> };

  const resp = await fetch(TX_ZIP_GEOJSON);
  if (!resp.ok) throw new Error(`ZIP GeoJSON HTTP ${resp.status}`);
  const zipGeo = (await resp.json()) as { features: GeoJSONFeature[] };

  const zipMap: Record<string, { countyFips: string; countyName: string }> = {};

  for (const feature of zipGeo.features) {
    const zip = feature.properties.ZCTA5CE10;
    const lat = parseFloat(feature.properties.INTPTLAT10 ?? "");
    const lon = parseFloat(feature.properties.INTPTLON10 ?? "");
    if (!zip || Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const match = countyGeo.features.find((f) => pointInPolygon(lon, lat, f.geometry));
    if (match) {
      zipMap[zip] = {
        countyFips: match.properties.GEOID,
        countyName: `${match.properties.NAME} County`,
      };
    }
  }

  writeFileSync(resolve(DATA_DIR, "zip-to-county.json"), JSON.stringify(zipMap, null, 2));
  console.log(`  Mapped ${Object.keys(zipMap).length} ZIP codes`);
}

async function generateCityLookup() {
  console.log("Generating city lookup from US cities CSV + spatial join...");
  const countyGeo = JSON.parse(
    readFileSync(resolve(DATA_DIR, "texas-counties.geojson"), "utf-8")
  ) as { features: Array<{ properties: { GEOID: string; NAME: string }; geometry: GeoJSONFeature["geometry"] }> };

  const resp = await fetch(US_CITIES_CSV);
  if (!resp.ok) throw new Error(`Cities CSV HTTP ${resp.status}`);
  const text = await resp.text();
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");

  const nameIdx = header.indexOf("city");
  const stateIdx = header.indexOf("state_id");
  const latIdx = header.indexOf("lat");
  const lngIdx = header.indexOf("lng");

  const cityMap: Record<string, { countyFips: string; countyName: string }> = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols[stateIdx] !== "TX") continue;
    const cityName = cols[nameIdx]?.replace(/"/g, "").trim();
    const lat = parseFloat(cols[latIdx]);
    const lon = parseFloat(cols[lngIdx]);
    if (!cityName || Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const match = countyGeo.features.find((f) => pointInPolygon(lon, lat, f.geometry));
    if (match) {
      cityMap[cityName] = {
        countyFips: match.properties.GEOID,
        countyName: `${match.properties.NAME} County`,
      };
    }
  }

  writeFileSync(resolve(DATA_DIR, "city-to-county.json"), JSON.stringify(cityMap, null, 2));
  console.log(`  Mapped ${Object.keys(cityMap).length} cities`);
}

async function main() {
  await generateZipLookup();
  await generateCityLookup();
  console.log("Lookup data complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
