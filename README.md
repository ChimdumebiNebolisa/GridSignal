# GridSignal Texas

Texas county-level interactive map for backup energy planning priority using public weather, solar, demand, and grid strain data.

## Problem it solves

Texas energy signals are spread across weather, solar, population, grid, and utility sources. GridSignal Texas combines them into one explainable county-level **Backup Priority Score** so users can see where backup planning may be worth evaluating—without outage prediction or professional advice claims.

## Demo

Run locally with `npm run dev` and open [http://localhost:3000](http://localhost:3000). The map colors all 254 Texas counties; click a county for the detail panel, layer toggles, search, and report copy/export.

## Features

- Interactive Texas county map (254 counties) with no required external base tiles
- Counties colored by Backup Priority Score or component layers
- Layer toggles: Backup Priority, Weather Risk, Solar Potential, Demand Exposure, Statewide Grid Strain
- County detail side panel with score breakdown, recommendation, utility context, and data quality
- Search by county name, city, or ZIP (city/ZIP labeled as approximate when applicable)
- Copy or download plain-text county report
- Deterministic scoring from public data with live, cached, estimated, and unavailable labels
- API routes for counties, county profiles, weather, solar, grid strain, and search

## Tech stack

- Next.js App Router (TypeScript)
- Tailwind CSS
- React Leaflet / Leaflet
- Static GeoJSON and JSON data files
- Vitest for scoring and data tests
- No database, authentication, or payments

## Architecture

```
src/app/          → pages and API route handlers
src/components/   → map, county panel, search, layout UI
src/lib/scoring/  → pure normalization and score calculation
src/lib/api/      → Open-Meteo, PVWatts, EIA, Census clients
src/lib/data/     → static loaders, profile merge, validation
src/data/         → Texas GeoJSON, centroids, caches, lookups
```

Scores are computed server-side from bundled caches and optional live APIs. API keys stay in server route handlers only.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template:

```bash
cp .env.example .env.local
```

3. Add API keys to `.env.local` (optional for basic use—static caches and fallbacks apply):

- `NREL_API_KEY` — [NREL developer signup](https://developer.nrel.gov/signup/)
- `EIA_API_KEY` — [EIA Open Data registration](https://www.eia.gov/opendata/register.php)
- `CENSUS_API_KEY` — only for live Census calls (static population cache is bundled)

4. Run the dev server:

```bash
npm run dev
```

## How to use

1. Open the app and view the Texas county map (default layer: Backup Priority).
2. Use layer toggles to recolor by weather, solar, demand, or statewide grid strain.
3. Click a county to open the side panel with scores, breakdown, recommendation, and utility context.
4. Search for a county, city, or ZIP; approximate matches are labeled.
5. Use **Copy report** or **Download .txt** for a shareable county summary.

## Key technical decisions

- **Precomputed weather cache** for all 254 counties so map and panel scores stay consistent (live weather available via `/api/weather/[fips]`).
- **PVWatts** via current NREL/NLR endpoints with static solar cache fallback.
- **EIA ERCO** demand normalized against a rolling min/max from the same series; neutral 50 when unavailable.
- **No OSM tile dependency** — counties render from bundled GeoJSON on a plain background.
- **Utility context** is informational only and never affects the score.
- **City/ZIP lookup** from static centroid-based mappings with “Approximate county match” labeling.

## Limitations

- Estimates **backup-planning priority**, not outage probability or household-level reliability.
- **Statewide grid strain** is balancing-authority level (ERCO), not county-specific grid reliability.
- **Likely utility/service territory** is context only—not a legal service-area determination.
- **City and ZIP** matches may be approximate; multiple-county ZIPs are not fully resolved.
- Missing API keys use cached or neutral estimated values, clearly labeled in the UI.
- Scores depend on available public data quality and documented normalization rules.

## License

MIT
