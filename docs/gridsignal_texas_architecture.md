# GridSignal Texas Technical Architecture

## 1. Tech stack

GridSignal Texas should use a simple, production-ready web stack:

- Framework: Next.js with App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Map rendering: Leaflet with React Leaflet
- Geometry: Static Texas county GeoJSON bundled with the app
- Data format: Local JSON files for static and cached county data
- Server access: Next.js route handlers for external API calls
- Testing: Vitest for scoring/data utilities, TypeScript checks, ESLint, production build
- Deployment target: Vercel or any standard Next.js host

The app should not use a database unless a later implementation proves local JSON and server-side fetch caching are insufficient. For the defined scope, a database is not necessary.

## 2. Folder structure

Use this structure:

```text
src/
  app/
    page.tsx
    layout.tsx
    globals.css
    api/
      counties/
        route.ts
      county/[fips]/
        route.ts
      weather/[fips]/
        route.ts
      solar/[fips]/
        route.ts
      grid-strain/
        route.ts
      search/
        route.ts
  components/
    map/
      TexasCountyMap.tsx
      MapLegend.tsx
      LayerTogglePanel.tsx
      CountyTooltip.tsx
    county/
      CountySidePanel.tsx
      ScoreSummary.tsx
      ScoreBreakdown.tsx
      RecommendationCard.tsx
      DataQualityBadge.tsx
      ReportActions.tsx
    search/
      SearchBox.tsx
      SearchResults.tsx
    layout/
      AppShell.tsx
      Header.tsx
      DataSourceFooter.tsx
    states/
      LoadingState.tsx
      ErrorState.tsx
      EmptyState.tsx
      FallbackNotice.tsx
  data/
    texas-counties.geojson
    county-centroids.json
    county-population.json
    county-utility-context.json
    county-static-profiles.json
    sample-grid-strain.json
  lib/
    api/
      openMeteo.ts
      pvWatts.ts
      census.ts
      eia.ts
      ercot.ts
    scoring/
      normalize.ts
      scoreCounty.ts
      labels.ts
      recommendations.ts
    data/
      counties.ts
      mergeCountyProfile.ts
      validateStaticData.ts
    search/
      countySearch.ts
      cityZipLookup.ts
    report/
      buildCountyReport.ts
    utils/
      env.ts
      fetchJson.ts
      clamp.ts
  types/
    county.ts
    api.ts
    scoring.ts
  tests/
    scoring.test.ts
    normalize.test.ts
    countyProfile.test.ts
public/
  favicon.ico
.env.example
README.md
```

## 3. Static data files

The app should bundle static files so it does not depend on live API calls for basic rendering.

Required files:

```text
src/data/texas-counties.geojson
```

Purpose: Texas county boundaries. Used by the map.

Required fields per feature:

- county name
- county FIPS code

```text
src/data/county-centroids.json
```

Purpose: One centroid per Texas county for API requests.

Required fields:

- county FIPS
- county name
- latitude
- longitude

```text
src/data/county-population.json
```

Purpose: County population cache from Census data.

Required fields:

- county FIPS
- county name
- population
- source year
- source label

```text
src/data/county-utility-context.json
```

Purpose: Likely utility or service territory context from PUCT/public map research or a static lookup.

Required fields:

- county FIPS
- likely utility/service territory name or names
- confidence label: high, medium, low, unknown
- note explaining that this is context only

```text
src/data/county-static-profiles.json
```

Purpose: Pre-merged county metadata used when APIs fail or while live data is loading.

Required fields:

- county FIPS
- county name
- centroid
- population
- likely utility context
- grid region

```text
src/data/sample-grid-strain.json
```

Purpose: fallback grid strain object used only when EIA/ERCOT data is unavailable.

Required fields:

- value
- label
- source: estimated fallback
- last updated
- explanation

## 4. Environment variables

API keys must stay server-side. They must never be exposed in client components.

`.env.example` should contain placeholders only:

```env
NREL_API_KEY=
EIA_API_KEY=
CENSUS_API_KEY=
ERCOT_API_KEY=
ERCOT_USERNAME=
ERCOT_PASSWORD=
NEXT_PUBLIC_APP_NAME=GridSignal Texas
```

Rules:

- `.env.local` must be listed in `.gitignore`.
- Real API keys must never be committed.
- Client components must not access private environment variables.
- API clients must validate required environment variables before making external calls.
- If an optional key is missing, the app must use the defined fallback and label the output as estimated or unavailable.

## 5. API route design

Use route handlers as a thin server layer. They should fetch external data, apply caching, normalize responses, and return app-specific JSON.

```text
GET /api/counties
```

Returns a list of county profiles needed for initial map rendering.

Use:

- static county profile data
- cached population
- cached utility context
- latest available grid strain summary
- computed or fallback score values

```text
GET /api/county/[fips]
```

Returns the full profile for one county.

Includes:

- county metadata
- score inputs
- final score
- recommendation
- utility context
- data quality labels
- source summaries

```text
GET /api/weather/[fips]
```

Fetches Open-Meteo data using the county centroid.

Returns:

- temperature indicators
- precipitation indicators
- wind indicators
- cloud cover indicators if used
- normalized weather risk score
- source and timestamp

```text
GET /api/solar/[fips]
```

Fetches NREL PVWatts data using the county centroid.

Returns:

- estimated annual AC output
- normalized solar potential score
- assumptions used for PVWatts request
- source and timestamp

```text
GET /api/grid-strain
```

Fetches EIA or ERCOT grid strain data.

Returns:

- statewide or balancing-authority grid strain score
- source type: EIA, ERCOT, cached, estimated fallback
- timestamp
- explanation that the value is not county-specific

```text
GET /api/search?q=
```

Searches county names and optional static city/ZIP lookup data.

Returns:

- matched county FIPS
- display name
- match type: county, city, ZIP
- confidence label

## 6. Data fetching and caching strategy

The app should minimize live API calls.

Static data:

- County boundaries are bundled as GeoJSON.
- County centroids are bundled as JSON.
- County population should be bundled as JSON after being fetched from Census.
- Utility context should be bundled as JSON.

Live or cached data:

- Open-Meteo weather can be fetched on demand or revalidated every few hours.
- PVWatts solar values should be precomputed or cached because county solar potential changes slowly.
- EIA/ERCOT grid strain should be fetched live or revalidated hourly.

Recommended caching rules:

```text
County GeoJSON: static bundle
County centroids: static bundle
Population: static cache, refresh manually when desired
Utility context: static cache, refresh manually when desired
PVWatts solar: static/precomputed cache, refresh rarely
Open-Meteo weather: revalidate every 1 to 3 hours
EIA/ERCOT grid strain: revalidate every 15 to 60 minutes
```

Next.js server fetches should use `next: { revalidate: seconds }` where applicable.

If deployed to an environment where filesystem writes are unreliable, do not write runtime cache files. Use static JSON plus framework fetch caching.

## 7. Scoring engine design

The scoring engine must be isolated in `src/lib/scoring/` and must not depend on React.

Core formula:

```text
Backup Priority Score =
0.30(weather risk)
+ 0.25(solar potential)
+ 0.25(demand exposure)
+ 0.20(statewide grid strain)
```

Required functions:

```ts
normalizeWeatherRisk(input: WeatherInput): NormalizedScore
normalizeSolarPotential(input: SolarInput): NormalizedScore
normalizeDemandExposure(input: DemandInput): NormalizedScore
normalizeGridStrain(input: GridStrainInput): NormalizedScore
calculateBackupPriorityScore(input: ScoreInputs): BackupPriorityResult
getBackupPriorityLabel(score: number): BackupPriorityLabel
buildRecommendation(profile: CountyEnergyProfile): string
```

Rules:

- Every normalized score must be clamped to 0 to 100.
- Missing inputs must produce a fallback score with a data quality label.
- The final score must be rounded consistently, preferably to the nearest whole number.
- Utility/service territory must not affect the score.
- Statewide grid strain must be labeled as statewide or balancing-authority level, not county-level.
- The score must be described as backup-planning priority, not outage probability.

## 8. Map rendering design

Use Leaflet with static GeoJSON.

Client-side map responsibilities:

- Render Texas county boundaries.
- Color counties by the selected layer.
- Support hover tooltip with county name and selected score.
- Support click to select county.
- Fit map bounds to Texas on load.
- Keep county selection in local component state or URL query state.

Layer modes:

```text
Backup Priority
Weather Risk
Solar Potential
Demand Exposure
Statewide Grid Strain
```

Coloring rules:

- The selected layer determines county fill color.
- Grid strain may appear the same across all counties if the active source is statewide.
- Utility context should not be rendered as a scoring layer unless reliable boundary data exists.

The map should not display exact transmission lines, substations, or household-level reliability claims.

## 9. Component structure

Use small components with clear responsibility.

Primary page:

```text
src/app/page.tsx
```

Responsibilities:

- Load county profiles.
- Manage selected county.
- Manage selected layer.
- Render app shell, map, side panel, and footer.

Map components:

```text
TexasCountyMap.tsx
```

Renders GeoJSON and handles hover/click.

```text
MapLegend.tsx
```

Explains score ranges and selected layer.

```text
LayerTogglePanel.tsx
```

Controls selected score layer.

County components:

```text
CountySidePanel.tsx
```

Displays selected county details.

```text
ScoreSummary.tsx
```

Displays final score and label.

```text
ScoreBreakdown.tsx
```

Displays weighted score inputs.

```text
RecommendationCard.tsx
```

Displays deterministic recommendation text.

```text
DataQualityBadge.tsx
```

Displays live, cached, estimated, unavailable, or mixed status.

```text
ReportActions.tsx
```

Copies or exports a plain county report.

Search components:

```text
SearchBox.tsx
SearchResults.tsx
```

Search county/city/ZIP and select the mapped county.

Layout components:

```text
AppShell.tsx
Header.tsx
DataSourceFooter.tsx
```

Maintain page structure and source transparency.

## 10. Error handling strategy

Every external source must have an error path.

API failure behavior:

- Open-Meteo failure: use unavailable or cached weather score and label it clearly.
- PVWatts failure: use cached solar value if available, otherwise mark solar as unavailable.
- EIA/ERCOT failure: use cached value if available, otherwise use estimated fallback and label it as estimated.
- Census failure: use bundled population cache.
- Utility lookup missing: show unknown utility context.

UI failure behavior:

- Initial county data failure: show a full-page error with retry instructions.
- Individual API failure: keep map usable and mark affected data as estimated, cached, or unavailable.
- Search miss: show no result found and suggest searching by county name.
- Missing county selection: show neutral empty panel instructions.

The app must never silently hide missing or estimated data.

## 11. Testing and verification

Required commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Required tests:

- Weight formula returns expected final score.
- Scores are clamped between 0 and 100.
- Label thresholds work correctly.
- Missing API inputs produce correct fallback labels.
- Utility context does not affect score.
- Statewide grid strain is handled as statewide context.
- County profile merge fails clearly when required static fields are missing.

Manual verification checklist:

- Texas county map renders.
- County click opens side panel.
- Layer toggles change map coloring.
- Score breakdown adds up to the displayed final score.
- Search can find a county.
- Missing API key does not crash the app.
- Data quality labels are visible.
- Report copy/export works.
- README setup steps are accurate.

## 12. README requirements

The README must include exactly the information needed to run, understand, and evaluate the app.

Required sections:

```text
Project name and one-line description
Problem it solves
Demo
Features
Tech stack
Architecture
Setup
How to use
Key technical decisions
Limitations
License
```

Setup must explain:

- installing dependencies
- creating `.env.local`
- adding NREL, EIA, Census, and optional ERCOT keys
- running the dev server
- running typecheck, lint, tests, and build

Limitations must state:

- The app estimates backup-planning priority, not outage probability.
- Utility/service territory is context only.
- Statewide or balancing-authority grid strain is not county-level grid precision.
- Scores are deterministic and depend on available public data.
- Missing APIs may trigger cached, estimated, or unavailable labels.

The README must not include a future improvements section.
