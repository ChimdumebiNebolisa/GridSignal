# GridSignal Texas Technical Architecture

## Runtime flow

```text
bundled sources → canonical indicator scoring → CountyEnergyProfile
CountyEnergyProfile → map summaries / APIs / UI / text report
weather + ERCO grid → operationalContext only
```

Next.js App Router and TypeScript provide server-side profile assembly and route handlers. Leaflet renders bundled Texas county GeoJSON in the browser. Static JSON keeps the initial map usable without live API keys.

## Canonical modules

- `src/lib/scoring/structuralNeed.ts`: equal-weight structural need with explicit missing-component withholding.
- `src/lib/scoring/feasibility.ts`: solar-resource feasibility with explicit unavailable scores.
- `src/lib/scoring/operationalContext.ts`: current weather and statewide grid context only.
- `src/lib/data/mergeCountyProfile.ts`: the single producer boundary for public profiles.
- `src/lib/data/mapSummary.ts`: the client-safe map projection.
- `src/lib/report/buildCountyReport.ts`: the export projection.

Legacy composite code may remain for historical validation, but it must not be imported by profile assembly, map summaries, public APIs, UI, or exports.

## Public surfaces

- `GET /api/counties`: canonical map summaries, GeoJSON, count, and validation result.
- `GET /api/county/[fips]`: full canonical county profile.
- `GET /api/weather/[fips]`: weather stress operational context.
- `GET /api/solar/[fips]`: solar feasibility context.
- `GET /api/grid-strain`: statewide/balancing-authority grid context.
- `GET /api/search?q=`: county, city, and ZIP search.

All responses expose quality/timestamp/limitation metadata where applicable. Errors use a stable `{ error: { code, message } }` shape.

## Data and cache policy

- County geometry, centroids, population, utility context, indicators, and solar/weather caches are bundled static data.
- Weather and grid upstream requests use bounded timeouts and explicit cache/fallback behavior.
- PVWatts falls back to bundled solar cache; EIA falls back to the documented statewide sample.
- Runtime code does not write cache files.
- Private API keys are server-only.

## Accessibility and performance

The map is enhanced by a keyboard-accessible county list. No-score states are rendered as text and gray map regions. Controls use labels, focusable native inputs/buttons, semantic headings, and visible focus styles.

Profiles are cached in-process for 15 minutes and grid data for 15 minutes. Route and fallback diagnostics must not include API keys or full secret-bearing URLs.

## Verification

Use `npm run typecheck`, `npm run lint`, `npm run test`, `npm run data:validate`, `npm run data:validate-scoring`, and `npm run build` before publishing.
