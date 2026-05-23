/**
 * fetch-census-population.ts
 * Fetches Texas county population from Census ACS API or public fallback CSV.
 * Writes to src/data/county-population.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const OUTPUT_PATH = resolve(__dirname, "../src/data/county-population.json");
const CENTROIDS_PATH = resolve(__dirname, "../src/data/county-centroids.json");

const CENSUS_URLS = [
  {
    url: "https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E&for=county:*&in=state:48",
    year: 2022,
  },
  {
    url: "https://api.census.gov/data/2021/acs/acs5?get=NAME,B01003_001E&for=county:*&in=state:48",
    year: 2021,
  },
];

const FALLBACK_POPULATION_CSV =
  "https://raw.githubusercontent.com/jwhendy/covid19/master/data/population.csv";

interface PopulationRecord {
  countyFips: string;
  countyName: string;
  population: number;
  year: number;
  source: "Census API" | "Static Census cache";
}

async function fetchWithTimeout(url: string, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GridSignalTexas/1.0 (data-pipeline)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromCensusApi(): Promise<PopulationRecord[] | null> {
  const apiKey = process.env.CENSUS_API_KEY;

  for (const source of CENSUS_URLS) {
    const url = apiKey ? `${source.url}&key=${apiKey}` : source.url;
    console.log(`Trying Census ACS ${source.year}${apiKey ? " (with key)" : ""}...`);
    try {
      const resp = await fetchWithTimeout(url);
      if (!resp.ok) {
        console.log(`  HTTP ${resp.status}, trying next year...`);
        continue;
      }
      const text = await resp.text();
      if (text.trim().startsWith("<")) {
        console.log("  HTML response (likely missing API key), trying next...");
        continue;
      }
      const data = JSON.parse(text) as string[][];
      if (data.length < 2) continue;

      const header = data[0];
      const nameIdx = header.indexOf("NAME");
      const popIdx = header.indexOf("B01003_001E");
      const stateIdx = header.indexOf("state");
      const countyIdx = header.indexOf("county");

      const records: PopulationRecord[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[stateIdx] !== "48") continue;
        records.push({
          countyFips: `48${row[countyIdx].padStart(3, "0")}`,
          countyName: row[nameIdx].replace(/, Texas$/i, "").trim(),
          population: parseInt(row[popIdx], 10) || 0,
          year: source.year,
          source: "Census API",
        });
      }
      if (records.length >= 250) return records;
    } catch (err: unknown) {
      console.log(`  Error: ${(err as Error).message}`);
    }
  }
  return null;
}

async function fetchFromFallbackCsv(
  centroids: { countyFips: string; countyName: string }[]
): Promise<PopulationRecord[]> {
  console.log("Using public Census-based fallback CSV...");
  const resp = await fetchWithTimeout(FALLBACK_POPULATION_CSV);
  if (!resp.ok) throw new Error(`Fallback CSV HTTP ${resp.status}`);

  const text = await resp.text();
  const lines = text.trim().split("\n");
  const byFips = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts[0] !== "Texas") continue;
    const fips = parts[2].padStart(5, "0");
    const pop = parseInt(parts[3], 10);
    if (!isNaN(pop)) byFips.set(fips, pop);
  }

  return centroids.map((c) => ({
    countyFips: c.countyFips,
    countyName: c.countyName,
    population: byFips.get(c.countyFips) ?? 0,
    year: 2019,
    source: "Static Census cache" as const,
  }));
}

async function main() {
  console.log("Fetching Census population data...");
  mkdirSync(resolve(__dirname, "../src/data"), { recursive: true });

  const centroids = JSON.parse(readFileSync(CENTROIDS_PATH, "utf-8")) as {
    countyFips: string;
    countyName: string;
  }[];

  let records = await fetchFromCensusApi();

  if (!records) {
    records = await fetchFromFallbackCsv(centroids);
  }

  records.sort((a, b) => a.countyFips.localeCompare(b.countyFips));

  console.log(`Processed ${records.length} county population records`);

  if (records.length !== 254) {
    console.warn(`WARNING: Expected 254 Texas counties, got ${records.length}`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(records, null, 2));
  console.log(`Wrote population data to ${OUTPUT_PATH}`);

  const totalPop = records.reduce((s, r) => s + r.population, 0);
  console.log(`Total Texas population: ${totalPop.toLocaleString()}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
