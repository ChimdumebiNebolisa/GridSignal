/**
 * generate-centroids.ts
 * Reads texas-counties.geojson and computes centroids for each county
 * by averaging all polygon coordinates. Writes to src/data/county-centroids.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const GEOJSON_PATH = resolve(__dirname, "../src/data/texas-counties.geojson");
const OUTPUT_PATH = resolve(__dirname, "../src/data/county-centroids.json");

interface Centroid {
  countyFips: string;
  countyName: string;
  centroidLat: number;
  centroidLon: number;
}

function extractCoordinates(geometry: any): [number, number][] {
  const coords: [number, number][] = [];

  function recurse(arr: any): void {
    if (
      Array.isArray(arr) &&
      arr.length >= 2 &&
      typeof arr[0] === "number" &&
      typeof arr[1] === "number"
    ) {
      // This is a [lon, lat] coordinate pair
      coords.push([arr[0], arr[1]]);
      return;
    }
    if (Array.isArray(arr)) {
      for (const item of arr) {
        recurse(item);
      }
    }
  }

  if (geometry && geometry.coordinates) {
    recurse(geometry.coordinates);
  }
  return coords;
}

function computeCentroid(coords: [number, number][]): { lat: number; lon: number } {
  if (coords.length === 0) return { lat: 0, lon: 0 };
  let sumLon = 0;
  let sumLat = 0;
  for (const [lon, lat] of coords) {
    sumLon += lon;
    sumLat += lat;
  }
  return {
    lat: Math.round((sumLat / coords.length) * 10000) / 10000,
    lon: Math.round((sumLon / coords.length) * 10000) / 10000,
  };
}

function main() {
  console.log("Reading GeoJSON...");
  const raw = readFileSync(GEOJSON_PATH, "utf-8");
  const geojson = JSON.parse(raw);

  const centroids: Centroid[] = [];

  for (const feature of geojson.features) {
    const props = feature.properties;
    const coords = extractCoordinates(feature.geometry);
    const { lat, lon } = computeCentroid(coords);

    // Sanity check: Texas latitudes ~25-37°N, longitudes ~-107 to -93°W
    if (lat < 24 || lat > 38 || lon > -92 || lon < -108) {
      console.warn(
        `WARNING: County ${props.GEOID} (${props.NAME}) has unusual centroid: ${lat}, ${lon}`
      );
    }

    centroids.push({
      countyFips: props.GEOID,
      countyName: `${props.NAME} County`,
      centroidLat: lat,
      centroidLon: lon,
    });
  }

  centroids.sort((a, b) => a.countyFips.localeCompare(b.countyFips));

  console.log(`Generated ${centroids.length} centroids`);

  if (centroids.length !== 254) {
    console.warn(`WARNING: Expected 254, got ${centroids.length}`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(centroids, null, 2));
  console.log(`Wrote centroids to ${OUTPUT_PATH}`);

  // Quick sanity: show a few
  console.log("Sample centroids:");
  for (const c of centroids.slice(0, 3)) {
    console.log(`  ${c.countyFips} ${c.countyName}: ${c.centroidLat}, ${c.centroidLon}`);
  }
}

main();
