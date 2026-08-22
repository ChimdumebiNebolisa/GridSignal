/**
 * Authoritative ingest: DOE EAGLE-I historical county outage burden.
 *
 * The documented public source is the OSTI/EAGLE-I archive
 * (https://www.osti.gov/dataexplorer/biblio/dataset/1975202), a county-hour
 * outage count archive covering 2014-2022 (~tens of GB compressed).
 *
 * Acquisition requires downloading and aggregating the multi-gigabyte
 * archive; this environment cannot do that reliably. This script therefore:
 *   1. probes the OSTI record so the blocked state is re-checked each run,
 *   2. writes an explicit BLOCKED marker file (never fabricates data),
 *   3. exits non-zero so pipelines notice.
 *
 * `scripts/build-indicators.ts` treats a missing/invalid snapshot as
 * "component unavailable" and the structural axis is scored from the two
 * remaining components under the <=1-missing gate.
 *
 * Run: npx tsx scripts/ingest/eagle-i.ts   (expected: exit code 2 = blocked)
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const OUT_DIR = resolve(__dirname, "../../src/data/sources/eagle_i");
const OSTI_RECORD = "https://www.osti.gov/dataexplorer/biblio/dataset/1975202";
const SIZE_BUDGET_BYTES = 500 * 1024 * 1024; // refuse to pull >500MB unattended

async function main() {
  let reachable = false;
  let note = "";
  try {
    const res = await fetch(OSTI_RECORD, { method: "GET" });
    reachable = res.ok;
    note = `OSTI record HTTP ${res.status}`;
  } catch (e) {
    note = `OSTI probe failed: ${(e as Error).message}`;
  }

  const blocked = {
    provenance: {
      id: "eagle_i",
      sourceName: "DOE EAGLE-I county outage burden (2014-2022 archive)",
      endpoint: OSTI_RECORD,
      status: "blocked",
      checkedAt: new Date().toISOString(),
      reachability: `${note}; record ${reachable ? "reachable" : "unreachable"}`,
      reason:
        "The authoritative distribution is a multi-gigabyte county-hour archive requiring bulk download plus aggregation. Automated acquisition exceeds this environment's size/time budget (refusing downloads over ~500MB unattended). No substitute or synthetic value may be used.",
      requiredSteps: [
        "Download the 2014-2022 EAGLE-I archive from the OSTI dataset page.",
        "Aggregate customer-outage counts per county into a burden metric (document the formula before first use).",
        "Percentile-rank among Texas counties and write county-outage-burden.json in the standard envelope format used by fema-nri/cdc-svi ingests.",
        "Re-run npm run data:build; the structural axis will then include three components.",
      ],
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "blocked.json"), JSON.stringify(blocked, null, 2));
  console.log(`eagle-i: BLOCKED — ${blocked.provenance.reason}`);
  console.log("eagle-i: wrote sources/eagle_i/blocked.json");
  process.exit(2);
}

main();
