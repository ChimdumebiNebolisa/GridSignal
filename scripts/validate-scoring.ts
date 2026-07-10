/**
 * Scoring validation: sensitivity analysis and outcome proxy correlation.
 * Run: npx tsx scripts/validate-scoring.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const DATA = resolve(__dirname, "../src/data");

type StructuralRecord = {
  countyFips: string;
  components: {
    hazardExposure: { value: number | null };
    socialVulnerability: { value: number | null };
    outageBurden: { value: number | null };
  };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function spearmanRho(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const rank = (arr: number[]) => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(n).fill(0);
    sorted.forEach((item, rankIdx) => {
      ranks[item.i] = rankIdx + 1;
    });
    return ranks;
  };
  const rx = rank(x);
  const ry = rank(y);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx;
    const b = ry[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function computeStructuralScore(r: StructuralRecord): number | null {
  const vals = [
    r.components.hazardExposure.value,
    r.components.socialVulnerability.value,
    r.components.outageBurden.value,
  ].filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function rankStability(records: StructuralRecord[], perturbation: number): number {
  const base = records
    .map((r) => ({ fips: r.countyFips, score: computeStructuralScore(r) }))
    .filter((r): r is { fips: string; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ fips: r.fips, rank: i }));

  const perturbed = records
    .map((r) => {
      const h = r.components.hazardExposure.value ?? 0;
      const s = r.components.socialVulnerability.value ?? 0;
      const o = r.components.outageBurden.value ?? 0;
      const score = Math.round(
        (h * (1 + perturbation) + s + o) / 3
      );
      return { fips: r.countyFips, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ fips: r.fips, rank: i }));

  const baseMap = new Map(base.map((b) => [b.fips, b.rank]));
  let stable = 0;
  for (const p of perturbed) {
    const br = baseMap.get(p.fips);
    if (br !== undefined && Math.abs(br - p.rank) <= 5) stable++;
  }
  return stable / perturbed.length;
}

function main() {
  const structural = readJson<StructuralRecord[]>(
    resolve(DATA, "indicators/county-structural-need.json")
  );
  const populations = readJson<{ countyFips: string; population: number }[]>(
    resolve(DATA, "county-population.json")
  );
  const popMap = new Map(populations.map((p) => [p.countyFips, p.population]));

  const needScores: number[] = [];
  const outageScores: number[] = [];
  const popScores: number[] = [];

  for (const r of structural) {
    const need = computeStructuralScore(r);
    const outage = r.components.outageBurden.value;
    const pop = popMap.get(r.countyFips);
    if (need !== null && outage !== null && pop !== undefined) {
      needScores.push(need);
      outageScores.push(outage);
      popScores.push(pop);
    }
  }

  const rhoOutage = spearmanRho(needScores, outageScores);
  const rhoPop = spearmanRho(needScores, popScores);
  const stability = rankStability(structural, 0.2);

  const compositePublish =
    rhoOutage >= 0.4 && stability >= 0.8 ? "ALLOW" : "WITHHOLD";

  const report = `# Scoring Validation Output

Generated: ${new Date().toISOString()}

## Outcome proxy correlation

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| Spearman ρ (structural need vs outage burden) | ${rhoOutage.toFixed(3)} | ≥ 0.4 | ${rhoOutage >= 0.4 ? "Yes" : "No"} |
| Rank stability (±20% hazard weight) | ${(stability * 100).toFixed(1)}% | ≥ 80% | ${stability >= 0.8 ? "Yes" : "No"} |

## Urban/rural bias check

| Metric | Value |
|--------|-------|
| Spearman ρ (structural need vs population) | ${rhoPop.toFixed(3)} |

High population correlation may indicate proxy bias — review when using authoritative SVI/NRI data.

## Composite publish decision

**${compositePublish}** cross-horizon composite based on current bundled estimates.
`;

  const outPath = resolve(__dirname, "../docs/validation/scoring-validation-output.md");
  writeFileSync(outPath, report);
  console.log(report);
  console.log(`Written to ${outPath}`);
}

main();
