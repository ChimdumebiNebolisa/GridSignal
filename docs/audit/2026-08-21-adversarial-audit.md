# GridSignal Texas — Adversarial Audit Report

- Audit date: 2026-08-21 (America/Chicago)
- Auditor: ox-alpha, adversarial principal-engineer audit per `ADVERSARIAL_CODEBASE_AUDIT_PROTOCOL.md`
- Repository: `ChimdumebiNebolisa/GridSignal` (local: `C:\Users\Chimdumebi\GridSignal_Texas`)
- Branch: `main` @ `414acdfdf33dc0cd0fdc4971553a86ff1810a5403`, clean working tree at audit start
- Toolchain: Node v24.14.1, npm 11.11.0, TypeScript 5.x, Next.js 16.2.6 (Turbopack), Vitest 4.1.7, Windows 11 / PowerShell

---

## 1. Audit Status

**AUDIT COMPLETE WITH LIMITATIONS**

All tracked source files were inspected; all documented checks were executed and pass. Limitations:

- Live external services (EIA, NREL PVWatts, Census) were not exercised with real credentials; no API keys are configured in this environment. Fallback paths were exercised instead.
- Authoritative datasets (FEMA NRI v1.20 CSV, CDC/ATSDR SVI, DOE EAGLE-I archive, NREL PVWatts) could not be reacquired in this environment to re-derive bundled snapshots from source; findings about the bundled data are proven by exact-formula reconstruction against the committed snapshots (see F-001/F-002), which is conclusive for what the bundle contains.
- The deployed Vercel instance referenced in commit history was not inspected.

## 2. Executive Verdict

**Do not ship the structural-need axis as currently attributed.** Ship only after the provenance relabeling in this report's remediation is applied.

- Overall codebase risk: **Critical** (data integrity/provenance), **Low–Medium** (software engineering quality)
- Audit confidence: **High**

The software engineering is competent — deterministic pure scoring functions, explicit missingness states, quarantined legacy composite, labeled fallbacks, passing CI gates, honest `estimated` quality badges. But the product's two headline axes are computed from data that is entirely synthetic, while every user-facing surface attributes that data to FEMA NRI, CDC/ATSDR SVI, DOE EAGLE-I, and NREL PVWatts. The repo's own guardrails document (`docs/gridsignal_texas_guardrails_agents.md`) forbids exactly this: "Do not fabricate indicators, provenance, source quality, timestamps."

Top risks:
1. Structural need scores are a deterministic function of county centroid geometry + population, presented as federal-source indicators.
2. Backup feasibility scores are a synthetic longitude/latitude formula presented as PVWatts output.
3. A build script silently regenerates fabricated "source" files if they are deleted.
4. Manifest acquisition timestamps are fabricated at build time.
5. Statewide operational context is derived from one arbitrary county's weather.

Strongest counterargument: the UI labels these values "Estimated" everywhere, README says values are "labeled estimated," and validation flags population correlation. Assessment: labeling communicates uncertainty but not origin; a user reading "Source: fema_nri" reasonably believes the value derives from FEMA data. Misattribution survives the label.

Most likely underestimated: how much apparent validation rigor (Spearman gates, rank-stability gates) creates confidence in numbers whose inputs are placeholders — the gates measure consistency of a fabrication with itself.

Immediate next action: apply remediation R1 (truthful synthetic provenance end-to-end) before any other change.

## 3. Product Reconstruction (verified)

- Promise (README/PRD): Texas county-level public-data explorer for structural resilience need + backup feasibility + current operating context; planning signal, not outage prediction.
- Actors: anonymous public user; no auth anywhere (correct for product).
- Critical workflows verified at runtime (`next build` + HTTP smoke): `/api/counties` (254 counties, valid static validation), `/api/county/48113` (need=99, feasibility=44, overall quality=stale, weather marked stale via profile path), `/api/search?q=77002` (ZIP→Harris County, "approximate" label), homepage SSR.
- Legacy composite (`calculateBackupPriorityScore`) is dead code: grep shows no importer outside its own module. ADR quarantine claim VERIFIED.
- Claim matrix discrepancies are concentrated in data provenance (findings below), not in feature behavior. All advertised features exist and function offline without API keys.

## 4. Score Reconstruction (the scoring contract, as actually implemented)

### Structural resilience need (`two-axis-v1`)
```
available = components with value !== null
if available == 0            -> score=null, reason="unavailable"
else if missingCount > 1     -> score=null, reason="missing_components"
else score = clamp(round( Σ(value_i × w_i) / Σ(w_i) )), w_i = 1/3 each
label: ≥80 Highest, ≥60 Elevated, ≥40 Moderate, else Lower
```
- Inputs (bundled): hazard percentile, SVI percentile, outage-burden percentile — **all synthetic**, see F-001.
- Missing policy: exclude-and-reweight within the ≤1-missing gate. Verified consistent between builder, runtime scorer, and validator.
- Tie/rank behavior: percentile mid-rank method `(below + 0.5·equal)/n`, deterministic; final scores integer-rounded (ties common by design).
- Withholding boundary tested at 1-vs-2 missing; zero values treated as observed zeros, distinct from null. Verified in code; regression tests added in this audit.

### Backup feasibility
```
solar.value === null -> null/"unavailable"
else clamp(round(solar.value))   # solar.value is itself a percentile among TX counties
```

### Operational context (never affects rank — verified)
- Weather stress: step functions on centroid forecast (heat .40/cold .25/wind .20/precip .15); all-null → imputed neutral 50 flagged `imputed`.
- Grid strain: EIA ERCO hourly demand, last 720h rolling window; score = position of current demand in [min,max] of window; fallback = bundled neutral 50 `quality:"fallback"`.

### Reproducibility
Deterministic given bundled JSON: same inputs → byte-identical outputs except manifest/validation timestamps (`generatedAt`, `Generated:` line). No dataset checksums or analysis fingerprint existed prior to this audit (gap closed in remediation).

## 5. Build & Verification Results (baseline)

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | Pass — 28/28 (7 files) |
| Type-check | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass |
| Data validation | `npm run data:validate` | Pass (structural-only assertions; see F-007) |
| Scoring validation | `npm run data:validate-scoring` | Pass — ρ(outage)=0.603, stability=54.7% (<80% gate), ρ(pop)=0.887; reproduces committed report exactly except timestamp |
| Production build | `npm run build` | Pass |
| Runtime smoke | `next start` + HTTP | Pass (see §3) |

Note: every gate is green while the underlying finding F-001 exists — the checks verify structure and internal consistency, not truth of provenance.

## 6. Findings Summary

| ID | Severity | Priority | Confidence | Category | Title |
|---|---|---|---|---|---|
| F-001 | Critical | P0 | High | Data/Provenance | Structural-need "source" datasets are synthetic formulas attributed to FEMA NRI/CDC SVI/EAGLE-I |
| F-002 | Critical | P0 | High | Data/Provenance | Feasibility solar cache is synthetic formula attributed to NREL PVWatts; manifest hardcodes contradictory `quality:"cached"` |
| F-003 | High | P1 | High | Provenance/Documentation | Fabricated timestamps and drifted claims (README 55.1% vs actual 54.7%; manifest fetchedAt = build time; estimated fallback stamped fresh) |
| F-004 | High | P1 | High | Correctness/Product | "Statewide" weather context computed from one arbitrary county; baked into static prerender as "Current conditions" |
| F-005 | Medium | P2 | High | Provenance | `/api/weather/[fips]` cache fallback bypasses stale marking (~3-month-old cache labeled "cached") |
| F-006 | Medium | P2 | High | Documentation | Rolling-window demand max displayed as "forecast peak demand" |
| F-007 | Medium | P2 | High | Testing/Data | Validation tooling cannot detect provenance fabrication; no checksums/fingerprint; non-deterministic committed artifacts |
| F-008 | Medium | P2 | High | Data/Search | City/ZIP lookup collisions resolved silently (last-writer-wins); two competing generators write the same files |
| F-009 | Low | P3 | High | Search/UX | Partial county-name matches carry confidence "exact" |
| F-010 | Low | P3 | High | UX | SearchBox response race (no cancellation of stale requests) |

**Retracted during remediation:** an eleventh hygiene finding ("tsconfig.tsbuildinfo/next-env.d.ts tracked despite gitignore") was retracted after verification — `git ls-files --error-unmatch` proves both files are untracked and correctly ignored. The initial census conflated an on-disk listing with the tracked-file index.

## 7. Detailed Findings (evidence)

### F-001 — Synthetic structural sources misattributed to federal datasets
- **Evidence:** `scripts/build-indicators.ts:62-93` (`ensureSourceSnapshots`) generates `county-hazard.json`, `county-svi.json`, `county-outage-burden.json` from centroid/population formulas when files are absent. Independent recomputation of those formulas against the committed snapshots matched **254/254 values exactly for all three files**. Ingest scripts `scripts/ingest/{fema-nri,cdc-svi,eagle-i}.ts` are console-log stubs. Attribution surfaces: `src/data/manifests/data-version.json` (owner FEMA/CDC/DOE + vintages "2025-12-v1.20"/"2022"/"2014-2022", fabricated `fetchedAt`), `src/lib/data/mergeCountyProfile.ts:92-117` ("FEMA National Risk Index", "CDC/ATSDR…", "DOE EAGLE-I"), `src/components/layout/DataSourceFooter.tsx:4-10`, component `source` fields `"fema_nri"|"cdc_svi"|"eagle_i"` in the shipped indicator JSON.
- **Consequence:** Every structural score shown to users is a geography+population artifact wearing federal attribution. Population correlation ρ=0.887 is structural (SVI component IS the population percentile), not an incidental bias to monitor.
- **Counterargument:** Values are labeled `quality:"estimated"` throughout. Assessment: insufficient — labels convey uncertainty, not origin; "Source: fema_nri" is affirmative misattribution.
- **Remediation:** Truthful relabeling everywhere (synthetic proxy ids/names/method notes), remove auto-synthesis (fail loudly instead), keep architecture ready for authoritative ingest. Implemented this session.

### F-002 — Synthetic solar feasibility attributed to NREL PVWatts
- **Evidence:** `scripts/generate-cache-data.ts:63-68` (`estimateSolarKwh = round(4800+(lon+106)*18+(32-|lat-29.5|)*45)`); recomputation matched **254/254** committed cache entries; all entries `quality:"estimated"`. Yet `scripts/build-indicators.ts:228` hardcodes manifest `quality:"cached"` under id `nrel_pvwatts` with PVWatts URL/vintage; UI source note reads "NREL PVWatts / bundled solar cache".
- **Remediation:** Bundled indicator source relabeled `synthetic_solar`; live PVWatts client (legitimately NREL when keyed) unchanged; manifest quality made content-derived. Implemented this session.

### F-003 — Fabricated/drifted metadata
- **Evidence:** `build-indicators.ts:198/208/217` sets `fetchedAt: generatedAt` for sources never fetched; `profileService.ts:21-37` `estimatedWeather()` stamps `fetchedAt=new Date()` onto estimated data; README line 54 cites "55.1%" stability vs actual committed+reproduced 54.7%.

### F-004 — Single-county "statewide" weather context
- **Evidence:** `profileService.ts:106-110` uses `weatherCache[0]` (FIPS 48001 Anderson County) for the homepage context bar labeled "Current conditions (statewide context)" (`OperationalContextBar.tsx:21-29`); `src/app/page.tsx` runs in static prerender, baking build-time values with build-time `asOf`.

### F-005 — Stale-cache labeling gap on weather route
- **Evidence:** `src/app/api/weather/[fips]/route.ts:28-29` substitutes bundled cached weather (fetchedAt 2026-05-23) on live failure without `markStale`; the profile path applies it (`profileService.ts:58`). Same underlying value appears as "stale" in profile and "cached" on the weather endpoint — a silent provenance-category move across endpoints.

### F-006 — "Forecast peak" mislabel
- **Evidence:** `eia.ts:105` sets `forecastPeakDemandMw = highMw` (max of trailing 720h actuals); `normalize.ts:213` renders "vs X MW forecast peak".

### F-007 — Validation blind spots
- **Evidence:** `validate-data-manifest.ts` asserts counts/null-consistency only; it passes the fabricated bundle. No checksums anywhere; `validate-scoring.ts` perturbs only the hazard weight ±20%; both scripts emit wall-clock timestamps into committed artifacts (non-deterministic diffs).

### F-008 — Lookup generation collisions
- **Evidence:** `generate-cache-data.ts:214` and `generate-lookup-data.ts:110` both assign `cityMap[name] = {single county}` — duplicate city names collapse last-writer-wins; both scripts target the same output files with different upstream sources/methods. Verified example: "Fairview" absent entirely; ZIP 75104 (Cedar Hill, spans two counties) resolves to first crosswalk row.

### F-009/F-010
- `countySearch.ts:38-51`: startsWith/contains matches assigned `confidence:"exact"`.
- `SearchBox.tsx:17-35`: no AbortController; out-of-order responses can render stale result sets.
- `.gitignore` lists `*.tsbuildinfo`/`next-env.d.ts`; both are tracked.

## 8. Contradictions Table (selected)

| Source A | Source B | Contradiction | Authority |
|---|---|---|---|
| Guardrails doc "do not fabricate provenance/timestamps" | `build-indicators.ts` synthesis + fabricated fetchedAt | Repo violates its own guardrail | Build script controls shipped data |
| Manifest `nrel_pvwatts.quality:"cached"` | Cache entries `quality:"estimated"` | Quality mismatch undetected by validators | Committed JSON |
| README "55.1% rank stability" | Reproduced metric 54.7% | Drifted claim | `validate-scoring.ts` output |
| ADR "legacy composite must not be returned" | Grep: no active importer | Compliant (rejected hypothesis) | n/a |
| Footer "Data sources: FEMA NRI…" | Actual bundle contents | Misattribution | Build pipeline |

## 9. Rejected Hypotheses

1. **Legacy composite leaks into active paths** — rejected; only self-import (`scoreCounty.ts`), no route/profile/UI consumer.
2. **Silent row drops in geographic joins** — rejected; 254 unique FIPS verified across centroids/populations/profiles/utility/solar/weather/indicators/GeoJSON with zero duplicates, zero format errors, name mismatches 0, population mismatches 0.
3. **Score-withholding rule implemented differently than documented** — rejected; builder, runtime scorer, and validator agree on ≤1-missing gate (boundary tests added).
4. **Live APIs can alter annual rankings** — rejected; grid/weather/solar clients feed only `operationalContext` or on-demand endpoints; structural/feasibility indicators load exclusively from bundled JSON.
5. **Secret exposure** — rejected; keys server-side only (`server-only` imports, env accessors); FetchError retains URL internally but routes never serialize error objects; no committed secrets found.
6. **Weather cache wholly fake** — rejected; 235/254 entries are genuine Open-Meteo fetches from 2026-05-23 (19 are labeled estimated fallbacks). Staleness, not fabrication, is the issue here.

## 10. Coverage Ledger (summary)

128 tracked files. Fully inspected: all `src/lib`, `src/app` routes, all components read, all scripts, tests, configs, workflows, manifests, docs, `.env.example`. Metadata-only: `package-lock.json`, `public/*.svg`, `src/app/favicon.ico`. Binary: `texas-counties.geojson` validated programmatically (254 features) rather than read linearly. Dynamically exercised: production server endpoints listed above. No inaccessible areas.

## 11. Remediation Plan

- **P0/R1:** Truthful provenance relabeling of all synthetic values end-to-end (manifest, component records, source-status entries, footer, README, docs); delete auto-synthesis path; fail builds on missing source snapshots. *(Implemented)*
- **P0/R2:** Content-derived SHA-256 fingerprints of inputs/outputs recorded in manifest; validators verify them and enforce manifest↔component provenance consistency. *(Implemented)*
- **P1/R3:** Fix F-004 (median-of-counties statewide weather basis + dynamic rendering + explicit basis label), F-005 (markStale in weather route), F-006 (rolling-max wording). *(Implemented)*
- **P2/R4:** Deterministic sensitivity expansion (per-component weight sweeps, leave-one-out) with stable output artifacts; search fixes (confidence labels, abortable requests); generator collision logging. *(R4 sensitivity + search confidence/abort implemented; collision-aware regeneration requires network refresh of upstream lookups — documented as blocked in-session)*
- **P3/R5:** Hygiene (untrack ignored build artifacts). *(Implemented)*

Residual limitations after remediation: authoritative FEMA/SVI/EAGLE-I/PVWatts ingest remains future work requiring external downloads; until then the axes are explicitly-labeled synthetic planning proxies. Live-keyed API behavior untested against real services.

---

## 12. Addendum — 2026-08-22, authoritative ingestion implemented

The placeholder posture above has been replaced (ADR 003):

- FEMA NRI v1.20 counties and CDC/ATSDR SVI 2022 counties now feed the structural axis from their official ArcGIS services; solar comes from EC JRC PVGIS v5.2 on NREL NSRDB irradiance. All snapshots carry provenance envelopes with verified fingerprints.
- The EAGLE-I archive remains a documented BLOCKED acquisition (`sources/eagle_i/blocked.json`); its component is withheld everywhere rather than proxied.
- Build-time publication gates were added and are enforced at runtime. On the current real bundle: coverage 100%, worst-case ±20% weight-sweep stability 66.5% (< 80% gate) → **structural ordinal rankings withheld bundle-wide**; feasibility publishes. This supersedes the synthetic-era metrics cited in §2/§11 (0.603 ρ / 54.7% stability / 0.887 population correlation applied to the old fabricated bundle; the new bundle's anchors live in `src/tests/dataIntegrity.test.ts` and `src/tests/validationMetrics.test.ts`).
- Known-county validation passes against real values (Harris NRI percentile 100 / Loving ≈ 0; Rockwall SVI < 20 vs Zavala/Collingsworth > 80; PVGIS El Paso 7506 kWh > Houston 5745 kWh for the standard 4 kW system).

