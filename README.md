# GridSignal Texas

Texas county-level public-data explorer for structural resilience need, backup feasibility, and current operating context.

## Product model

GridSignal publishes two separate annual planning axes:

- **Structural resilience need**: hazard exposure, social vulnerability, and historical outage-burden indicators.
- **Backup feasibility**: solar-resource feasibility using a standard county-centroid 4 kW system assumption.

**Provenance status (2026-08 audit):** the bundled structural and solar indicator values are **synthetic planning proxies** — deterministic placeholders derived from county-centroid geometry and population (see [docs/audit/2026-08-21-adversarial-audit.md](docs/audit/2026-08-21-adversarial-audit.md) and ADR 002). They are labeled `synthetic_*` in data, manifest, UI, and reports, and are **not** derived from FEMA NRI, CDC/ATSDR SVI, DOE EAGLE-I, or NREL PVWatts until an authoritative ingest replaces them (`scripts/ingest/` documents each path). Weather cache values are genuine Open-Meteo centroid forecasts (bundled snapshot); live Open-Meteo, EIA ERCO, Census, and keyed NREL PVWatts integrations are real.

Current weather stress and statewide ERCO grid conditions are shown as operational context only. They do not affect county rankings. GridSignal is a planning signal, not an outage prediction, reliability determination, or professional advice.

Structural scores are withheld when more than one required component is missing. Missing, estimated, cached, stale, fallback, and unavailable data are labeled in profiles and reports. Every build publishes SHA-256 fingerprints of inputs and generated indicators; `npm run data:validate` re-verifies them.

## Local run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Features

- Interactive Texas county map with 254 counties.
- Structural need, backup feasibility, need-vs-feasibility quadrant, and current-weather layers.
- Keyboard-accessible county list as an alternative to map interaction.
- County profile with component values, no-score reasons, recommendations, utility context, quality labels, provenance, and plain-text export.
- Search by county, city, or ZIP with approximate-match labels.
- APIs for counties, county profiles, weather context, solar feasibility, statewide grid context, and search.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run data:validate
npm run data:validate-scoring
npm run build
```

## Data and limitations

- Structural and feasibility indicators are bundled snapshots and must be refreshed through the data-build/ingest workflow.
- The current structural and solar bundles are **synthetic placeholders** (`synthetic_hazard`, `synthetic_svi`, `synthetic_outage`, `synthetic_solar`), labeled "Estimated" throughout. The social-vulnerability proxy is the population percentile itself, so high population correlation is structural in this bundle.
- Weather uses county-centroid Open-Meteo forecasts and may be cached (stale snapshots are labeled) or unavailable.
- ERCO/EIA grid load is statewide or balancing-authority context, not county-specific reliability; the "peak" shown is the trailing 30-day demand max, not a forecast.
- The homepage "Current conditions" weather number is the median across all bundled county forecasts, not one county's reading.
- Utility/service-territory context is approximate and does not affect scores.
- Deterministic validation on the current bundle: 0.603 Spearman correlation with the outage-burden proxy, worst-case ±20% hazard-weight rank stability of 54.7% (< 80% gate), leave-one-component-out rank stability between 14.6% and 22.0%, and 0.887 population correlation; the cross-horizon composite remains withheld.

## Environment variables

| Variable | Purpose |
|---|---|
| `NREL_API_KEY` | Optional live PVWatts requests; bundled solar data remains available without it. |
| `EIA_API_KEY` | Optional live EIA ERCO requests; statewide fallback remains available without it. |
| `CENSUS_API_KEY` | Optional population-cache refresh. |
| `NEXT_PUBLIC_APP_NAME` | Public app title only. |

Private keys stay server-side. Never place secrets in `NEXT_PUBLIC_*` variables.

## Repository

[ChimdumebiNebolisa/GridSignal](https://github.com/ChimdumebiNebolisa/GridSignal)

License: MIT
