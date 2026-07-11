# GridSignal Daily Progress

Last updated: 2026-07-11 (America/Chicago)

## Current state

- Phase: 1 — baseline and scoring-model decision evidence.
- Completed work unit: inventory every scoring module.
- In progress: none.
- Next incomplete work unit: inventory every scoring configuration.
- Canonical scoring decision: resolved by user confirmation on 2026-07-11. GridSignal should use Option B as the canonical public model: separate structural-need and feasibility scores, with operational conditions kept as context.
- Recommended model: Option B, the two-axis structural-need and feasibility model, with operational conditions kept as context. It has the active UI/data/recommendation implementation and is more explainable than the cross-horizon composite. Publication still requires resolving null structural scores, versioning, source quality, stability, and documentation drift.
- User decision: Option B.
- Blocking question: resolved.
- Public score semantics changed by this work unit: no.

## Ordered checklist

- [x] 1. Inventory every scoring module.
- [ ] 2. Inventory every scoring configuration.
- [ ] 3. Inventory score fields in committed data.
- [ ] 4. Inventory score fields returned by APIs.
- [ ] 5. Inventory score labels in the UI.
- [ ] 6. Inventory score/recommendation fields in exports.
- [ ] 7. Inventory scoring statements in documentation.
- [ ] 8. Inventory map layers tied to scoring.
- [ ] 9. Inventory quality/missingness labels.
- [ ] 10–15. Record typecheck, lint, tests, data validation, scoring validation, and production build as separate work units.
- [ ] Later phases: canonical contract, migration, version integrity, typed missingness, lineage, validation/CI, sensitivity/bias, API resilience, accessibility, performance, observability, and documentation reconciliation.

## Scoring module inventory

| Module | Model / role | Direct production consumers | Status / risk |
|---|---|---|---|
| `src/lib/scoring/structuralNeed.ts` | Two-axis: calculates structural need and withholds the score when more than one component is missing | `mergeCountyProfile.ts` | Active; committed inputs currently yield 254/254 null scores. |
| `src/lib/scoring/feasibility.ts` | Two-axis: exposes annual solar-resource feasibility | `mergeCountyProfile.ts` | Active; 254/254 committed scores are non-null. |
| `src/lib/scoring/operationalContext.ts` | Two-axis guardrail: weather and statewide grid strain as non-ranking context | `mergeCountyProfile.ts`, `profileService.ts` | Active; keeps statewide conditions separate from county rank. |
| `src/lib/scoring/recommendations.ts` | Two-axis recommendation text from structural need, feasibility, missingness, and drivers | `mergeCountyProfile.ts` | Active. |
| `src/lib/scoring/scoreCounty.ts` | Original model: 30% weather, 25% solar, 25% population-based demand exposure, 20% statewide grid strain | `mergeCountyProfile.ts` | Still active as a legacy composite and returned on assembled profiles; public model conflict remains. |
| `src/lib/scoring/normalize.ts` | Shared/legacy normalization for weather, solar, population/demand, and grid strain | API routes, `mergeCountyProfile.ts`, `operationalContext.ts` | Mixed-model boundary; population and grid normalization still feed the legacy composite. |
| `src/lib/scoring/labels.ts` | Both planning labels and original Backup Priority labels | scoring, report, UI | Mixed-model definitions coexist. |
| `src/types/scoring.ts` | Both models' result types, weights, and thresholds | scoring and map code | Mixed configuration source; `SCORE_WEIGHTS` and `LABEL_THRESHOLDS` are legacy, while planning thresholds/structural weights serve the newer model. |

Producer-to-consumer blast radius observed: bundled indicator/cache data → `indicators.ts` and normalization → `mergeCountyProfile.ts` → profile/map summaries → county/counties APIs and page data → map, side panel, recommendations, and text report. Both the legacy composite and newer axes are assembled at the profile boundary.

## Evidence and findings

- Branch/history: `main` at `ef8f568`, merged PR #1 (`feat/two-axis-resilience-redesign`); `origin/main` matched at audit time.
- Worktree began clean. No repository-local `AGENTS.md` exists; thread-provided working agreements were followed.
- `docs/adr/001-two-axis-model.md` says the two-axis model is accepted and the composite is deprecated, but `README.md` still presents the original Backup Priority Score as the product.
- Manifest `scoreConfigVersion` is `"none"`.
- County coverage: 254 structural-need records and 254 feasibility records.
- Missingness: `structuralNeedScore` is null for 254/254 counties; `feasibilityScore` is null for 0/254.
- Quality/provenance: manifest labels FEMA NRI, CDC SVI, and EAGLE-I as estimated; NREL PVWatts as cached. Full source-lineage fields remain incomplete.
- Sensitivity/bias: scoring validation reported Spearman rho 0.603 against outage burden, 55.1% rank stability under ±20% hazard-weight perturbation (fails 80% gate), and population correlation 0.887; cross-horizon composite result is WITHHOLD.
- Public claims verified: no new public product claim was introduced. Inventory claims were verified from imports, implementations, committed JSON, ADR, README, manifest, and validation output.
- Stale/fallback behavior: not quantified in this work unit.
- Unexplained nulls remaining: 254 structural-need scores; current files list component gaps but the end-to-end typed no-score contract has not been audited.
- Sources with incomplete provenance: all manifest sources require later lineage review; current manifest lacks the full roadmap-required owner, URL, license, hash, limitations, and staleness metadata.
- Production behavior not verified locally: browser/UI behavior, API runtime responses, deployed state, accessibility, performance, and Vercel production state.

## Commands and verification

- `git status --short` — exit 0; initially no entries.
- Repository/document/source searches using `rg --files` and `rg -n` — exit 0; located seven scoring implementation modules plus `src/types/scoring.ts` as the mixed configuration/type module and traced their importers.
- JSON summary script over manifest and indicator files — exit 0; 254 structural records (254 null scores), 254 feasibility records (0 null scores), manifest score version `none`.
- `npm run data:validate-scoring` — exit 0; rho 0.603 pass, rank stability 55.1% fail against methodological gate, population correlation 0.887 warning, composite WITHHOLD. Its timestamp-only generated-file change was reverted.

## Publication and deployment

- Current branch: `main`.
- Commit/push: inventory committed on `main` as `4729282` and pushed successfully to `origin/main`; a follow-up progress-record commit records publication state.
- PR/merge/deploy: no PR or separate merge was used because the authorized work completed directly on `main`. No deployment was performed because this documentation-only unit changed no production behavior.

## Deferred / blockers

- Blocking: none for the canonical public-model decision. Public semantic changes still require normal implementation, verification, and documentation consistency work.
- Deferred: all roadmap work after the first module inventory, including remediation of mixed-model runtime paths.
