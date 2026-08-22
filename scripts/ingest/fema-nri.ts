/**
 * Authoritative ingest: FEMA National Risk Index (NRI) v1.20 counties.
 *
 * Downloads the official FEMA GeoPlatform feature service
 * ("National Risk Index Counties", owner FEMA_NationalRiskIndex) and produces
 * src/data/sources/fema_nri/county-hazard.json with a full provenance envelope.
 *
 * Transformation: percentile rank of NRI composite RISK_SCORE among the 254
 * Texas counties (mid-rank method, 0-100). Raw values are preserved.
 *
 * Run: npx tsx scripts/ingest/fema-nri.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { resolve } from "path";

const ENDPOINT =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0";
const OUT = resolve(__dirname, "../../src/data/sources/fema_nri/county-hazard.json");
const OWNER = "FEMA_NationalRiskIndex";
const ITEM_ID = "39485e8035d446a5bff03259508ae355";

type NriAttributes = {
  STCOFIPS: string;
  COUNTY: string;
  RISK_SCORE: number | null;
  RISK_RATNG: string | null;
  POPULATION: number | null;
};

function percentileRank(value: number, all: number[]): number {
  const sorted = [...all].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return Math.round(((below + 0.5 * equal) / sorted.length) * 100);
}

async function queryPage(offset: number): Promise<{ features: { attributes: NriAttributes }[]; exceeded: boolean }> {
  const params = new URLSearchParams({
    where: "STATE='Texas'",
    outFields: "STCOFIPS,COUNTY,RISK_SCORE,RISK_RATNG,POPULATION",
    returnGeometry: "false",
    f: "json",
    resultOffset: String(offset),
    resultRecordCount: "2000",
  });
  const res = await fetch(`${ENDPOINT}/query?${params}`);
  if (!res.ok) throw new Error(`NRI query HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const records: NriAttributes[] = [];
  let offset = 0;
  for (;;) {
    const page = await queryPage(offset);
    if (!page.features) throw new Error("NRI query returned no features");
    records.push(...page.features.map((f) => f.attributes));
    if (!page.exceededTransferLimit) break;
    offset += page.features.length;
    if (offset > 100000) throw new Error("NRI pagination runaway guard");
  }

  const scored = records.filter(
    (r) => typeof r.RISK_SCORE === "number" && Number.isFinite(r.RISK_SCORE)
  );
  if (scored.length !== 254) {
    throw new Error(`Expected 254 Texas county rows, got ${records.length} (${scored.length} with RISK_SCORE)`);
  }

  const scores = scored.map((r) => r.RISK_SCORE as number);
  const out = scored
    .map((r) => ({
      countyFips: r.STCOFIPS,
      countyName: `${r.COUNTY} County`,
      rawValue: r.RISK_SCORE as number,
      rating: r.RISK_RATNG,
      value: percentileRank(r.RISK_SCORE as number, scores),
      quality: "cached" as const,
    }))
    .sort((a, b) => a.countyFips.localeCompare(b.countyFips));

  const acquiredAt = new Date().toISOString();
  const recordsFingerprint = createHash("sha256")
    .update(JSON.stringify(out))
    .digest("hex");

  const payload = {
    provenance: {
      id: "fema_nri",
      sourceName: "FEMA National Risk Index (v1.20) — counties",
      endpoint: ENDPOINT,
      arcgisItemId: ITEM_ID,
      owner: OWNER,
      field: "RISK_SCORE",
      rawFieldMeaning:
        "NRI composite Risk Score: expected annual loss x social vulnerability x community resilience, normalized nationally.",
      vintage: "v1.20 (live service snapshot)",
      acquiredAt,
      coverage: `${out.length}/254`,
      quality: "cached",
      transformation:
        "Percentile rank (mid-rank) of RISK_SCORE among the 254 Texas counties; raw score preserved in rawValue.",
      limitation:
        "Composite planning proxy for relative hazard risk; not an outage forecast or reliability measure.",
      license: "Public domain (U.S. federal government work)",
      recordsFingerprint,
    },
    records: out,
  };

  mkdirSync(resolve(OUT, ".."), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`fema-nri: wrote ${out.length} records to ${OUT}`);
  console.log(`fema-nri: records sha256=${recordsFingerprint}`);

  // Known-county sanity anchors
  const byFips = new Map(out.map((r) => [r.countyFips, r]));
  const harris = byFips.get("48201");
  const loving = byFips.get("48301");
  console.log(`sanity Harris=${harris?.rawValue?.toFixed(1)} (${harris?.value}) Loving=${loving?.rawValue?.toFixed(1)} (${loving?.value})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
