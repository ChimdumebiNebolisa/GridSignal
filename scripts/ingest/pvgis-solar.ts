/**
 * Authoritative ingest: solar resource via EC JRC PVGIS (PVGIS-NSRDB).
 *
 * Replaces the previous synthetic longitude/latitude solar proxy with real
 * PV-simulation results from the European Commission's PVGIS service, which
 * for Texas draws on NREL's NSRDB satellite-derived irradiance. Keyless,
 * documented public API. Standard system assumption matches the product
 * contract: 4 kW crystalline silicon, fixed mounting, tilt 20deg,
 * south-facing (aspect 0), 14% system losses.
 *
 * Writes src/data/cache/solar-potential-by-county.json in the runtime
 * SolarCacheEntry shape, plus a sidecar provenance envelope.
 *
 * Politeness: sequential requests with delay and bounded retries.
 * Run: npx tsx scripts/ingest/pvgis-solar.ts [--force]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../..");
const CENTROIDS = resolve(ROOT, "src/data/county-centroids.json");
const OUT = resolve(ROOT, "src/data/cache/solar-potential-by-county.json");
const PROVENANCE = resolve(ROOT, "src/data/cache/solar-potential-provenance.json");

const DELAY_MS = 400;
const MAX_ATTEMPTS = 4;

type Centroid = { countyFips: string; countyName: string; centroidLat: number; centroidLon: number };
type Entry = { countyFips: string; annualAcKwh: number; systemCapacityKw: number; fetchedAt: string; quality: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSolarOnce(lat: number, lon: number): Promise<{ eY: number; radiationDb: string }> {
  const q = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    peakpower: "4",
    pvtechchoice: "crystSi",
    mountingplace: "free",
    angle: "20",
    aspect: "0",
    loss: "14",
    raddatabase: "PVGIS-NSRDB",
    outputformat: "json",
  });
  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${q}`);
      if (res.status === 429 || res.status >= 500) {
        lastErr = `HTTP ${res.status}`;
        await sleep(1500 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
      const j = await res.json();
      const eY = j?.outputs?.totals?.fixed?.E_y;
      if (typeof eY !== "number" || !Number.isFinite(eY)) throw new Error("missing outputs.totals.fixed.E_y");
      const db = j?.inputs?.meteo_data?.radiation_db ?? "unknown";
      if (db !== "PVGIS-NSRDB") {
        throw new Error(`unexpected radiation database '${db}' — refusing non-NSRDB values`);
      }
      return { eY, radiationDb: db };
    } catch (e) {
      lastErr = (e as Error).message;
      await sleep(1200 * attempt);
    }
  }
  throw new Error(lastErr);
}

/** Deterministic inland target used to rescue offshore county centroids. */
const INLAND_TARGET = { lat: 31.05, lon: -99.14 };

/**
 * Some coastal counties' vertex-average centroids fall in the Gulf, which
 * PVGIS rejects ("Location over the sea"). We blend deterministically toward
 * an inland reference point until the request succeeds and record the blend.
 */
async function fetchSolar(
  c: Centroid
): Promise<{ eY: number; radiationDb: string; adjusted?: string }> {
  try {
    const { eY, radiationDb } = await fetchSolarOnce(c.centroidLat, c.centroidLon);
    return { eY, radiationDb };
  } catch (firstErr) {
    const msg = (firstErr as Error).message;
    if (!msg.includes("over the sea")) throw firstErr;

    for (const k of [0.15, 0.3, 0.5, 0.75]) {
      const lat = c.centroidLat + (INLAND_TARGET.lat - c.centroidLat) * k;
      const lon = c.centroidLon + (INLAND_TARGET.lon - c.centroidLon) * k;
      try {
        const { eY, radiationDb } = await fetchSolarOnce(lat, lon);
        return {
          eY,
          radiationDb,
          adjusted: `offshore centroid moved inland ${(k * 100).toFixed(0)}% toward (${INLAND_TARGET.lat}, ${INLAND_TARGET.lon})`,
        };
      } catch (e) {
        if (!(e as Error).message.includes("over the sea")) {
          await sleep(800);
          // fall through to next blend on sea errors only
        }
      }
    }
    throw firstErr;
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const centroids: Centroid[] = JSON.parse(readFileSync(CENTROIDS, "utf-8"));

  const existing: Entry[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf-8")) : [];
  const byFips = new Map(existing.map((e) => [e.countyFips, e]));

  const entries: Entry[] = [];
  const radiationDbs = new Set<string>();
  const adjustments: string[] = [];
  let done = 0;

  function flush(): void {
    const sorted = [...entries].sort((a, b) => a.countyFips.localeCompare(b.countyFips));
    mkdirSync(resolve(OUT, ".."), { recursive: true });
    writeFileSync(OUT, JSON.stringify(sorted, null, 2));
  }

  for (const c of centroids) {
    const cached = byFips.get(c.countyFips);
    if (cached && !force && typeof cached.annualAcKwh === "number" && cached.annualAcKwh > 0) {
      entries.push(cached);
      done++;
      continue;
    }
    const { eY, radiationDb, adjusted } = await fetchSolar(c);
    radiationDbs.add(radiationDb);
    if (adjusted) adjustments.push(`${c.countyFips} (${c.countyName}): ${adjusted}`);
    entries.push({
      countyFips: c.countyFips,
      annualAcKwh: Math.round(eY * 100) / 100,
      systemCapacityKw: 4,
      fetchedAt: new Date().toISOString(),
      quality: "cached",
    });
    done++;
    if (done % 20 === 0) {
      console.log(`pvgis: ${done}/${centroids.length}`);
      flush();
    }
    await sleep(DELAY_MS);
  }

  entries.sort((a, b) => a.countyFips.localeCompare(b.countyFips));
  mkdirSync(resolve(OUT, ".."), { recursive: true });

  const acquiredAt = new Date().toISOString();
  const fingerprint = createHash("sha256").update(JSON.stringify(entries)).digest("hex");

  const provenance = {
    id: "pvgis_nsrdb",
    sourceName: "EC JRC PVGIS v5.2 PVcalc (PVGIS-NSRDB satellite irradiance)",
    endpoint: "https://re.jrc.ec.europa.eu/api/v5_2/PVcalc",
    owner: "European Commission Joint Research Centre",
    attributionNote:
      "Irradiance source is NREL's National Solar Radiation Database (NSRDB PSM, years 2005-2015) accessed through PVGIS; temperature data ERA5; simulation is PVGIS's own PV model.",
    field: "outputs.totals.fixed.E_y",
    rawFieldMeaning: "Annual AC energy (kWh/year) of the specified PV system.",
    vintage: "PVGIS v5.2 / PVGIS-NSRDB (2005-2015 climatology)",
    acquiredAt,
    coverage: `${entries.length}/254`,
    quality: "cached",
    transformation:
      "Standard 4 kW crystalline-Si system, fixed mounting, tilt 20deg, south-facing (aspect 0), 14% total losses; E_y rounded to 2 decimals.",
    limitation:
      "County-centroid simulation for relative feasibility comparison across counties; not a site-specific design and not an NREL PVWatts result.",
    license: "Free reuse with attribution (EC-JRC PVGIS terms)",
    fingerprint,
    adjustments: adjustments.length > 0 ? adjustments : undefined,
  };

  flush();
  writeFileSync(PROVENANCE, JSON.stringify(provenance, null, 2));
  console.log(`pvgis: wrote ${entries.length} entries; sha256=${fingerprint}; dbs=${[...radiationDbs].join(",")}`);
  if (adjustments.length > 0) {
    console.log(`pvgis: ${adjustments.length} offshore centroids adjusted inland:`);
    for (const a of adjustments) console.log(`  - ${a}`);
  }

  const byFips2 = new Map(entries.map((e) => [e.countyFips, e]));
  const elPaso = byFips2.get("48141")?.annualAcKwh ?? 0;
  const houston = byFips2.get("48201")?.annualAcKwh ?? 0;
  console.log(`sanity ElPaso=${elPaso} Houston=${houston} (expect ElPaso > Houston)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
