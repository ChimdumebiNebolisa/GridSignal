# ADR 001: Two-Axis Resilience Model

## Status

Accepted — canonical public model confirmed 2026-07-11.

## Decision

GridSignal uses two separate annual planning axes:

1. **Structural resilience need** — hazard exposure, social vulnerability, and historical outage burden.
2. **Backup feasibility** — solar-resource feasibility using a documented standard-system assumption.

Current weather stress and statewide ERCO/EIA grid conditions are operational context only. They never affect county rank.

The legacy cross-horizon Backup Priority composite is not a public product metric. It remains only in historical migration/validation code where needed and must not be returned by active profile, map, API, or export paths.

## Scoring and missingness rules

- Structural need uses equal weights across available components.
- Structural need is withheld when more than one component is missing.
- Feasibility is withheld when solar data is unavailable.
- Scores are clamped to 0–100 and rounded to whole numbers.
- No silent neutral `50` imputation is used for planning scores.
- Null scores expose an explicit reason and remain visible in UI, APIs, and exports.
- Utility context does not affect either score.

## Validation gates

Do not publish a composite until all historical validation gates pass. Current validation keeps it withheld because rank stability is below the 80% gate and expert label calibration is incomplete.

Structural indicators are planning heuristics, not outage-probability predictions or reliability determinations.

## Consequences

- Public contracts, documentation, tests, exports, and UI must use structural need, feasibility, and operational context fields.
- Legacy Backup Priority labels, including Critical, are not active product labels.
- Source quality, vintage, missingness, and limitations must be visible.
- Data and scoring configuration versions must be published in the manifest.
