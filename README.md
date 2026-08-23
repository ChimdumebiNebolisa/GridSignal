# GridSignal Texas

Texas county-level public-data explorer for structural resilience need, backup feasibility, and current operating context.

## Product model

GridSignal publishes two separate annual planning axes:

- **Structural resilience need**: hazard risk (FEMA NRI) + social vulnerability (CDC/ATSDR SVI), with historical outage burden (DOE EAGLE-I) reserved as a third component.
- **Backup feasibility**: simulated solar resource for a standard 4 kW fixed-tilt system (EC JRC PVGIS on NREL NSRDB irradiance).

Current weather stress and statewide ERCO grid conditions are shown as operational context only. They do not affect county rankings. GridSignal is a planning signal, not an outage prediction, reliability determination, or professional advice.

## Authoritative data and publication gates

Structural and solar values are ingested from authoritative public sources with per-value source, vintage, acquisition time, transformation method, quality, and SHA-256 fingerprints (`scripts/ingest/`, ADR 003). The EAGLE-I outage archive is documented as blocked; its component is withheld rather than proxied.

Rankings publish only when build-time gates pass: ≥90% county coverage, worst-case ±20% single-weight sweep rank stability ≥80%, and outcome-proxy correlation ≥0.4 when outage data exists. **Current bundle: structural ordinal rankings are withheld — worst-case stability 66.5% < 80% — while component values remain visible and labeled.** Feasibility publishes.

## Local run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` (landing) or `http://localhost:3000/explore` (full interactive explorer).

## Features

- Editorial landing page with a real-data County Resilience File, comparison table, map preview, two-axis matrix, and provenance section.
- Interactive Texas county map at `/explore` with all 254 counties.
- Structural need and backup feasibility layers plus current-weather layer.
- Keyboard-accessible county list as a non-map alternative.
- County profiles with component values, no-score reasons, provenance notes, deterministic weight-scenario exploration, quality labels, and plain-text export.
- Search by county, city, or ZIP with disclosed match confidence.
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

Data refresh: run the ingest scripts in `scripts/ingest/` (FEMA NRI, CDC SVI, PVGIS solar; EAGLE-I documents its blocked state), then `npm run data:build`.

## Data and limitations

- Hazard risk: percentile of FEMA NRI composite `RISK_SCORE` among Texas counties. Social vulnerability: CDC/ATSDR SVI 2022 overall percentile as published. Solar: PVGIS/NSRDB simulation at the county centroid.
- Outage burden is withheld (authoritative archive not yet ingested); the structural axis currently computes from two components.
- Weather uses county-centroid Open-Meteo forecasts; bundled cache entries are labeled cached/stale against a 72-hour window.
- ERCO/EIA grid load is balancing-authority context, never county-level reliability; the "peak" shown is the trailing 30-day demand max, not a forecast.
- Ordinal rankings are gated outputs. When the sensitivity gate fails, scores/labels are withheld everywhere while components stay visible.

## Environment variables

| Variable | Purpose |
|---|---|
| `NREL_API_KEY` | Optional live NREL PVWatts requests (solar endpoint only); bundled PVGIS data remains authoritative without it. |
| `EIA_API_KEY` | Optional live EIA ERCO requests; statewide fallback remains available without it. |
| `CENSUS_API_KEY` | Optional population-cache refresh. |
| `NEXT_PUBLIC_APP_NAME` | Public app title only. |

Private keys stay server-side. Never place secrets in `NEXT_PUBLIC_*` variables.

License: MIT
