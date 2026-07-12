# GridSignal Daily Progress

Last updated: 2026-07-12 (America/Chicago)

## Current state

- Phase: canonical two-axis migration, validation, resilience, accessibility, and release verification.
- Completed work unit: full roadmap implementation through documentation and runtime verification.
- In progress: final diff review, progress publication, and release state.
- Canonical scoring decision: Option B behavior confirmed by the user on 2026-07-11 — separate structural resilience need and backup feasibility scores; current weather and statewide grid conditions are context only.
- Public score semantics: changed intentionally. The legacy composite is no longer part of active profile, map, API, UI, or export consumers.

## Ordered checklist

- [x] Inventory scoring modules, configurations, committed data, API fields, UI labels, exports, documentation, map layers, and quality/missingness labels.
- [x] Record baseline typecheck, lint, tests, data validation, scoring validation, and production build.
- [x] Reconcile the canonical two-axis ADR, README, PRD, architecture, design, guardrails, and data contracts.
- [x] Centralize and version canonical scoring behavior as `two-axis-v1`.
- [x] Remove mixed-model fields from active public profile/map/API/UI/export paths.
- [x] Make structural and feasibility null scores explicit with typed no-score reasons.
- [x] Add source manifest provenance/limitation metadata and strict indicator/manifest validation.
- [x] Make validation import the canonical structural scorer and preserve sensitivity/bias gates.
- [x] Add stable API error envelopes, upstream timeout/fallback behavior, stale-data labeling, and route timing diagnostics.
- [x] Add keyboard-accessible county browsing as a map alternative and explicit no-score UI copy.
- [x] Run production build and local HTTP/API smoke checks.
- [x] Update validation reports and public documentation.

## Canonical implementation

- Structural need uses equal weights from `STRUCTURAL_NEED_WEIGHTS`; more than one missing component withholds the score.
- Feasibility is solar-resource feasibility and is null when solar data is unavailable; it is never silently converted to zero.
- Planning labels are Lower, Moderate, Elevated, and Highest. Null scores render Withheld or Unavailable.
- Weather and statewide grid load remain in `operationalContext` and never affect county rank.
- Active map layers are structural need, feasibility, need-vs-feasibility quadrant, and current weather stress.
- Legacy composite code/types remain only for historical migration validation and have no active production consumers.

## Data and quality findings

- Committed indicator coverage is 254/254 for structural need and feasibility.
- After rebuilding from bundled source snapshots, structural scores are non-null for 254/254 and feasibility scores are non-null for 254/254.
- Current bundled structural components are estimated/imputed; solar data is cached/estimated; weather cache data is marked stale after the 72-hour freshness window; statewide grid is an explicit fallback.
- Manifest is schema `2.1.0` with score configuration `two-axis-v1` and source owner/URL/limitation metadata where evidenced.
- License and content hashes were not fabricated because authoritative values were not present in the repository; they remain external provenance follow-up items.

## Validation evidence

- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0.
- `npm run test` — exit 0; 7 files, 28 tests passed.
- `npm run data:validate` — exit 0.
- `npm run data:validate-scoring` — exit 0; Spearman rho 0.603 passes, rank stability 54.7% fails the 80% gate, population correlation 0.887 is flagged, composite remains WITHHOLD.
- `npm run build` — exit 0; Next.js production build generated all routes.
- `git diff --check` — exit 0.
- Production HTTP smoke checks on port 3002: root 200, `/api/counties` 200, `/api/search` 200, `/api/county/48001` 200, `/api/weather/48001` 200, `/api/solar/48001` 200, invalid FIPS 400 with `{ error: { code, message } }`.
- Browser CLI verification was attempted but could not start because the environment lacks the required Chrome distribution. Static keyboard/accessibility markup was reviewed; deployed browser behavior remains unverified locally.

## Affected systems

Indicator build and manifest → canonical scoring → profile assembly → map summaries → county/counties APIs → map, county panel, recommendation, quality badges, county list, and text report. API adapters now expose canonical endpoint score names and stable errors. Documentation and validation outputs describe the same model.

## Publication and deployment

- Branch: `main`.
- GitHub publication: pending final commit/push of this implementation batch.
- Deployment: Vercel CLI had no credentials; the documented unauthenticated fallback was attempted but returned no deployment URL and exited non-zero. No production deployment was performed.

## Remaining uncertainty

- Browser accessibility and production runtime behavior could not be verified in this environment because Chrome was unavailable.
- External source license and hash metadata remain unknown and were intentionally not invented.
- Composite publication remains withheld by validation gates.
