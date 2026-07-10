# ADR 001: Two-Axis Resilience Model

## Status

Accepted (2026-07-10)

## Context

GridSignal Texas originally published a single "Backup Priority Score" combining weather (1-day), solar (annual), population percentile, and statewide ERCOT/EIA demand. This mixed incompatible time horizons, weighted solar feasibility as need, and used uncalibrated "Critical" labels without outcome validation.

## Decision

Adopt **Option C (two-axis model)** with **Option D guardrails**:

1. **Structural Resilience Need** — county-ranked, annual refresh (hazard exposure, social vulnerability, outage burden where available).
2. **Backup Feasibility** — county-ranked, annual refresh (solar resource and future DER proxies).
3. **Current Conditions** — statewide/county contextual banner only (near-term weather stress, ERCO load); does not affect county rank.

Deprecate the composite Backup Priority Score as the primary hero metric. Do not publish a cross-horizon composite until Phase 5 validation passes.

## Primary user

County planner / emergency manager / community resilience staff.

## Validation gates (composite publish criteria)

Publish a within-horizon structural need composite only if ALL are true:

- Required component coverage ≥ 90% of 254 Texas counties.
- Spearman ρ ≥ 0.4 vs EAGLE-I outage burden proxy (2014–2022).
- Rank stability ≥ 80% under ±20% weight perturbation.
- Source vintage ≤ 24 months.
- Expert review of label calibration complete.

Otherwise: show separate transparent indicators only.

## Consequences

- PRD, data contract, UI, and scoring modules must separate axes and time horizons.
- Statewide grid strain is context-only.
- Population is not labeled as electricity demand.
- Silent neutral `50` imputation is banned; missing data must be explicit.
- "Critical" label removed until calibration study.

## Rejected alternatives

- **Single dynamic operational score (A):** insufficient for planning; no validated county outage signal.
- **Long-term index only (B):** loses useful situational weather/grid context.
- **Retain current composite:** methodologically indefensible; ranks unchanged by statewide grid.
