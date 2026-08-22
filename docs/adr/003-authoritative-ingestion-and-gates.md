# ADR 003: Authoritative Ingestion and Publication Gates

## Status

Accepted — 2026-08-22. Supersedes the placeholder posture of ADR 002.

## Context

ADR 002 relabeled the bundled indicators as synthetic placeholders. The next requirement was to replace them with reproducible ingestion from the documented public sources, attach full provenance to every value, and withhold ordinal rankings whenever coverage or sensitivity gates fail.

## Decision

### 1. Authoritative sources (all keyless, documented public APIs)

| Component | Source | Acquisition |
|---|---|---|
| Hazard risk | FEMA National Risk Index v1.20 counties — official FEMA GeoPlatform feature service (`FEMA_NationalRiskIndex`, item `39485e8035d446a5bff03259508ae355`) | `scripts/ingest/fema-nri.ts`; percentile rank of `RISK_SCORE` among TX counties; raw value preserved |
| Social vulnerability | CDC/ATSDR SVI 2022 US counties — official `data_cdc` ArcGIS service, layer "SVI2022 US county" | `scripts/ingest/cdc-svi.ts`; `RPL_THEMES ×100` exactly as published |
| Solar feasibility | EC JRC PVGIS v5.2 `PVcalc` on NREL NSRDB satellite irradiance (2005–2015), standard 4 kW fixed tilt-20/south/14% losses | `scripts/ingest/pvgis-solar.ts`; deterministic inland nudge for offshore centroids (recorded per county) |
| Outage burden | DOE EAGLE-I 2014–2022 archive (OSTI) | **BLOCKED**: multi-GB bulk acquisition infeasible here; `scripts/ingest/eagle-i.ts` writes an explicit blocked marker; component withheld everywhere — never proxied |

Every snapshot uses a provenance envelope (`provenance` + `records`) whose records fingerprint is verified by the build and by validators.

### 2. Per-value provenance

Indicator components expose source, vintage, acquiredAt, method (transformation), quality, explanation; the manifest records endpoints, owners, licenses, coverage, acquisition times, and SHA-256 fingerprints for all inputs/outputs (schema 2.3.0).

### 3. Publication gates (build-time, enforced at runtime)

Declared gates, evaluated on every build:

- Structural coverage ≥ 90% of counties scored.
- Worst-case ±20% single-weight sweep rank stability ≥ 80% (±5 positions).
- Outcome-proxy Spearman ρ ≥ 0.4 when outage data exists (n/a while blocked).

Results live in `manifest.gates`. At runtime `src/lib/scoring/gates.ts` applies them: a failed gate converts the axis's score/label to null with `noScoreReason: "gates_failed"` across profile, map, list, and exports. Components remain visible and labeled.

**Current outcome:** coverage 100%, but worst-case stability = **66.5% < 80%**, so structural ordinal rankings are withheld bundle-wide. Feasibility passes its coverage gate and publishes. This is the intended evidence-backed behavior, not a defect.

### 4. Scenario exploration

`ScenarioPanel` recomputes the canonical formula from displayed components with user weights — client-side, deterministic, never persisting or altering canonical scores, always labeled non-canonical.

## Consequences

- Rankings are a privileged output gated on measured bundle quality, not a default.
- The landing page and explorer disclose the withheld state explicitly.
- When EAGLE-I lands and/or stability improves under review, gates flip publication automatically on rebuild.
