/**
 * Scoring validation: sensitivity analysis and outcome-proxy correlation.
 * Run: npx tsx scripts/validate-scoring.ts
 *
 * Writes a deterministic markdown artifact: no wall-clock timestamps, no
 * randomness. Byte-identical output given identical bundled inputs, so the
 * committed report doubles as a reproducibility regression check (audit F-007).
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { SCORE_CONFIG_VERSION } from "@/types/scoring";
import { computeValidationSummary } from "@/lib/scoring/validationMetrics";

const DATA = resolve(__dirname, "../src/data");
const OUT_PATH = resolve(
  __dirname,
  "../docs/validation/scoring-validation-output.md"
);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function main(): void {
  const structural = readJson(
    resolve(DATA, "indicators/county-structural-need.json")
  );
  const populations = readJson<{ countyFips: string; population: number }[]>(
    resolve(DATA, "county-population.json")
  );
  const popMap = new Map(populations.map((p) => [p.countyFips, p.population]));

  const summary = computeValidationSummary(structural, popMap);

  const sweepRows = summary.weightSweeps
    .map(
      (row) =>
        `| ${row.component} | ${row.delta >= 0 ? "+" : ""}${Math.round(row.delta * 100)}% | ${pct(row.stableShare)} |`
    )
    .join("\n");

  const looRows = summary.leaveOneOut
    .map(
      (row) =>
        `| ${row.component} | ${row.scoredCounties} | ${pct(row.stableShare)} |`
    )
    .join("\n");

  const perturbationRows = summary.inputPerturbations
    .map(
      (row) =>
        `| ${row.delta >= 0 ? "+" : ""}${row.delta} points | ${pct(row.stableShare)} |`
    )
    .join("\n");

  const report = `# Scoring Validation Output

Score configuration: ${SCORE_CONFIG_VERSION}
Deterministic artifact — regenerate with \`npm run data:validate-scoring\`. No timestamps by design.

## Outcome proxy correlation

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| Scored counties | ${summary.scoredCounties} / ${structural.length} | — | — |
| Spearman ρ (structural need vs outage burden) | ${summary.rhoOutageBurden.toFixed(3)} | ≥ 0.4 | ${summary.rhoOutageBurden >= 0.4 ? "Yes" : "No"} |
| Worst-case ±20% hazard-weight rank stability | ${pct(summary.hazardWeightStabilityMin)} | ≥ 80% | ${summary.hazardWeightStabilityMin >= 0.8 ? "Yes" : "No"} |

## Weight sweeps (rank stability vs base within ±5 positions)

| Component | Δ weight | Stable share |
|---|---|---|
${sweepRows}

## Leave-one-component-out

| Removed component | Scored counties | Rank stability |
|---|---|---|
${looRows}

## Input-value perturbation (uniform shift of all available components)

| Shift | Rank stability |
|---|---|
${perturbationRows}

## Urban/rural bias check

| Metric | Value |
|--------|-------|
| Spearman ρ (structural need vs population) | ${summary.rhoPopulation.toFixed(3)} |

High population correlation is a known property of the current synthetic bundle: the social-vulnerability proxy is the population percentile itself (see docs/audit/2026-08-21-adversarial-audit.md). Re-evaluate with authoritative SVI/NRI/EAGLE-I data.

## Composite publish decision

**${summary.compositePublishDecision}** cross-horizon composite based on current bundled estimates.
`;

  writeFileSync(OUT_PATH, report);
  console.log(report);
  console.log(`Written to ${OUT_PATH}`);
}

main();
