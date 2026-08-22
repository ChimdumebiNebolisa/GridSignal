# ADR 002: Truthful Synthetic Provenance for Bundled Indicators

## Status

Accepted — 2026-08-21, following the adversarial audit (`docs/audit/2026-08-21-adversarial-audit.md`).

## Context

The audit proved (254/254 exact-formula matches) that every bundled structural-need and solar-feasibility value is a deterministic placeholder derived from county-centroid geometry and population, while the manifest, UI source notes, footer, and README attributed those values to FEMA NRI (v1.20), CDC/ATSDR SVI (2022), DOE EAGLE-I (2014–2022), and NREL PVWatts. `scripts/build-indicators.ts` additionally auto-generated fabricated "source" files whenever they were missing, and stamped them with build-time acquisition timestamps. This violated the repository's own guardrails ("Do not fabricate indicators, provenance, source quality, timestamps") and the core product promise of traceable public-data provenance.

Reacquiring the authoritative datasets was not possible in this environment; each blocked path is documented in `scripts/ingest/`.

## Decision

1. **No fabrication, ever.** Missing source snapshots abort `data:build` with instructions. The synthesis path is deleted.
2. **Truthful ids end-to-end.** Bundled indicators use `synthetic_hazard`, `synthetic_svi`, `synthetic_outage`, and `synthetic_solar`. Authoritative provider ids are removed from active types so accidental re-attribution fails typecheck. Live integrations keep honest attribution: Open-Meteo, EIA ERCO, Census, and keyed NREL PVWatts per-request.
3. **Manifest truth.** Manifest v2.2.0 marks each bundled source `status: synthetic_placeholder`, requires a `method` description, forbids authoritative owners on synthetic entries, and records SHA-256 fingerprints of all input datasets and generated indicator files.
4. **Machine-checked provenance.** `npm run data:validate` re-computes fingerprints (tamper detection), verifies component↔manifest source binding, and rejects forbidden federal ids in bundled data.
5. **Honest operational context.** The homepage weather-stress number is the median across all bundled county forecasts with an explicit basis label and oldest-source `asOf`; it is rendered per request, never baked at build time. `/api/weather/[fips]` re-evaluates cache freshness before fallback so a stale snapshot cannot masquerade as fresh cache.

Scores themselves are unchanged by this ADR (same formulas, same values); what changes is what we claim about their origin.

## Consequences

- Users see exactly which numbers are placeholders. Rankings must be presented as proxy-driven planning heuristics until authoritative ingest lands.
- Fingerprint mismatches fail CI-style validation instead of shipping silently drifted bundles.
- The documented population correlation (ρ ≈ 0.887) is understood as a structural property of the placeholder bundle, not a bias to be tuned away.
