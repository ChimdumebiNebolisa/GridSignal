# GridSignal Texas

Texas county-level public-data explorer for structural resilience need, backup feasibility, and current operating context.

## Product model

GridSignal publishes two separate annual planning axes:

- **Structural resilience need**: hazard exposure, social vulnerability, and historical outage-burden indicators.
- **Backup feasibility**: solar-resource feasibility using a standard county-centroid PVWatts assumption.

Current weather stress and statewide ERCO grid conditions are shown as operational context only. They do not affect county rankings. GridSignal is a planning signal, not an outage prediction, reliability determination, or professional advice.

Structural scores are withheld when more than one required component is missing. Missing, estimated, cached, stale, fallback, and unavailable data are labeled in profiles and reports.

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
- FEMA NRI, CDC/ATSDR SVI, and DOE EAGLE-I values are labeled estimated in the current bundle.
- Solar values are cached or estimated; PVWatts uses a standard 4 kW system at the county centroid and is not site-specific design advice.
- Weather uses county-centroid forecasts and may be cached or unavailable.
- ERCO/EIA grid load is statewide or balancing-authority context, not county-specific reliability.
- Utility/service-territory context is approximate and does not affect scores.
- The current structural validation reports 0.603 Spearman correlation with the outage-burden proxy, 55.1% rank stability under the documented perturbation, and 0.887 population correlation; the cross-horizon composite remains withheld.

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
