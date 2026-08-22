/**
 * Authoritative ingest: CDC/ATSDR Social Vulnerability Index 2022 (counties).
 *
 * Downloads the official CDC/ATSDR SVI 2022 USA feature service (owner
 * `data_cdc`), layer "SVI2022 US county", and produces
 * src/data/sources/cdc_svi/county-svi.json with a provenance envelope.
 *
 * Transformation: RPL_THEMES (overall SVI percentile, 0-1) scaled to 0-100.
 * ATSDR's national percentile is used as published — no re-ranking.
 *
 * Run: npx tsx scripts/ingest/cdc-svi.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";

const ENDPOINT =
  "https://services3.arcgis.com/ZvidGQkLaDJxRSJ2/arcgis/rest/services/CDC_ATSDR_Social_Vulnerability_Index_2022_USA/FeatureServer/1";
const OUT = resolve(__dirname, "../../src/data/sources/cdc_svi/county-svi.json");
const OWNER = "data_cdc";
const ITEM_ID = "f2af3fd35858443293b75d5f73c7d4d3";

type SviAttributes = {
  FIPS: string;
  LOCATION: string;
  RPL_THEMES: number | null;
};

async function queryPage(offset: number) {
  const params = new URLSearchParams({
    where: "ST_ABBR='TX'",
    outFields: "FIPS,LOCATION,RPL_THEMES",
    returnGeometry: "false",
    f: "json",
    resultOffset: String(offset),
    resultRecordCount: "2000",
  });
  const res = await fetch(`${ENDPOINT}/query?${params}`);
  if (!res.ok) throw new Error(`SVI query HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const records: SviAttributes[] = [];
  let offset = 0;
  for (;;) {
    const page = await queryPage(offset);
    if (!page.features) throw new Error(`SVI query error: ${JSON.stringify(page.error ?? {})}`);
    records.push(...page.features.map((f) => f.attributes));
    if (!page.exceededTransferLimit) break;
    offset += page.features.length;
    if (offset > 100000) throw new Error("SVI pagination runaway guard");
  }

  const scored = records.filter(
    (r) => typeof r.RPL_THEMES === "number" && Number.isFinite(r.RPL_THEMES)
  );
  if (scored.length !== 254) {
    throw new Error(`Expected 254 Texas counties, got ${records.length} (${scored.length} with RPL_THEMES)`);
  }

  const out = scored
    .map((r) => ({
      countyFips: r.FIPS,
      countyName: r.LOCATION.split(",")[0]?.trim() ?? r.LOCATION,
      rawValue: Math.round((r.RPL_THEMES as number) * 10000) / 100,
      value: Math.round((r.RPL_THEMES as number) * 100),
      quality: "cached" as const,
    }))
    .sort((a, b) => a.countyFips.localeCompare(b.countyFips));

  const acquiredAt = new Date().toISOString();
  const recordsFingerprint = createHash("sha256").update(JSON.stringify(out)).digest("hex");

  const payload = {
    provenance: {
      id: "cdc_svi",
      sourceName: "CDC/ATSDR Social Vulnerability Index 2022 — US counties",
      endpoint: ENDPOINT,
      arcgisItemId: ITEM_ID,
      owner: OWNER,
      field: "RPL_THEMES",
      rawFieldMeaning:
        "Overall county summary ranking (percentile 0-1) across all four SVI themes, nationally.",
      vintage: "SVI 2022 (live service snapshot)",
      acquiredAt,
      coverage: `${out.length}/254`,
      quality: "cached",
      transformation:
        "RPL_THEMES scaled to 0-100 exactly as published by ATSDR; no re-ranking applied.",
      limitation:
        "Social vulnerability percentile; a planning indicator, not a measure of grid reliability.",
      license: "U.S. Government work, public domain",
      recordsFingerprint,
    },
    records: out,
  };

  mkdirSync(resolve(OUT, ".."), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`cdc-svi: wrote ${out.length} records to ${OUT}`);
  console.log(`cdc-svi: records sha256=${recordsFingerprint}`);

  const byFips = new Map(out.map((r) => [r.countyFips, r]));
  console.log(`sanity Zavala(48507)=${byFips.get("48507")?.value} Collingsworth(48107)=${byFips.get("48107")?.value} Rockwall(48397)=${byFips.get("48397")?.value}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
