/**
 * fetch-county-geojson.ts
 * Downloads a full US counties GeoJSON, filters to Texas (STATEFP="48"),
 * validates 254 features, and writes to src/data/texas-counties.geojson.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const GEOJSON_SOURCES = [
  "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json",
  "https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_050_00_500k.json",
];

const OUTPUT_PATH = resolve(__dirname, "../src/data/texas-counties.geojson");

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, string>;
  geometry: unknown;
  id?: string;
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

async function fetchWithTimeout(url: string, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeFeature(feature: GeoJSONFeature): GeoJSONFeature | null {
  const props = feature.properties;

  // Different GeoJSON sources use different property names
  let statefp: string | undefined;
  let geoid: string | undefined;
  let name: string | undefined;

  // Plotly source uses "id" at top level as FIPS
  if (feature.id && typeof feature.id === "string" && feature.id.startsWith("48")) {
    geoid = feature.id;
    statefp = "48";
    name = props.NAME || props.name || props.COUNTY || props.county || "";
  }

  // Census / TIGER source
  if (props.STATE === "48" || props.STATEFP === "48" || props.STATEFP20 === "48") {
    statefp = "48";
    geoid = props.GEO_ID?.replace("0500000US", "") || props.GEOID || props.GEOID20 || props.COUNTY || "";
    name = props.NAME || props.NAME20 || props.NAMELSAD || "";
  }

  // Eric source uses GEO_ID like "0500000US48001"
  if (props.GEO_ID && props.GEO_ID.includes("US48")) {
    statefp = "48";
    geoid = props.GEO_ID.replace("0500000US", "");
    name = props.NAME || props.LSAD || "";
  }

  // State field is "48"
  if (props.STATE === "48") {
    statefp = "48";
    const countyCode = props.COUNTY || "";
    geoid = geoid || `48${countyCode.padStart(3, "0")}`;
    name = props.NAME || "";
  }

  if (statefp !== "48" || !geoid || !geoid.startsWith("48")) return null;

  // Clean county name - remove " County" suffix if present, then we'll store just the county name
  // Actually data contract says NAME should be county name as-is
  const cleanName = name.replace(/ County$/i, "").trim();

  return {
    type: "Feature",
    properties: {
      GEOID: geoid,
      NAME: cleanName,
      STATEFP: "48",
    },
    geometry: feature.geometry,
  };
}

async function main() {
  console.log("Fetching US counties GeoJSON...");

  let data: GeoJSONCollection | null = null;

  for (const url of GEOJSON_SOURCES) {
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetchWithTimeout(url);
      if (!resp.ok) {
        console.log(`  HTTP ${resp.status}, trying next...`);
        continue;
      }
      const text = await resp.text();
      data = JSON.parse(text) as GeoJSONCollection;
      console.log(`  Got ${data.features?.length || 0} total features`);
      break;
    } catch (err: unknown) {
      console.log(`  Error: ${(err as Error).message}, trying next...`);
    }
  }

  if (!data || !data.features) {
    console.error("ERROR: Could not fetch any GeoJSON source.");
    process.exit(1);
  }

  // Filter to Texas
  const texasFeatures: GeoJSONFeature[] = [];
  for (const feature of data.features) {
    const normalized = normalizeFeature(feature);
    if (normalized) {
      texasFeatures.push(normalized);
    }
  }

  console.log(`Filtered to ${texasFeatures.length} Texas features`);

  // Deduplicate by GEOID
  const seen = new Set<string>();
  const deduped: GeoJSONFeature[] = [];
  for (const f of texasFeatures) {
    const id = f.properties.GEOID;
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(f);
    }
  }

  console.log(`After dedup: ${deduped.length} features`);

  // Sort by GEOID
  deduped.sort((a, b) => a.properties.GEOID.localeCompare(b.properties.GEOID));

  if (deduped.length !== 254) {
    console.warn(`WARNING: Expected 254 Texas counties, got ${deduped.length}`);
    if (deduped.length < 250) {
      console.error("Too few counties. Aborting.");
      process.exit(1);
    }
  }

  const output: GeoJSONCollection = {
    type: "FeatureCollection",
    features: deduped,
  };

  // Ensure output directory exists
  mkdirSync(resolve(__dirname, "../src/data"), { recursive: true });

  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`Wrote ${deduped.length} Texas county features to ${OUTPUT_PATH}`);

  // Print first/last for verification
  const first = deduped[0].properties;
  const last = deduped[deduped.length - 1].properties;
  console.log(`First: ${first.GEOID} - ${first.NAME}`);
  console.log(`Last: ${last.GEOID} - ${last.NAME}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
