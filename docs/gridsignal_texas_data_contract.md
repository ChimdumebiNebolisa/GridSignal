# GridSignal Texas Data Contract

## 1. Core geography

GridSignal Texas uses Texas counties as the primary geography.

Primary unit: Texas county  
Total expected county records: 254  
Primary county identifier: county FIPS code  
Primary map geometry: county polygon from static GeoJSON or Census/TIGER source  
Primary calculation point: county centroid latitude and longitude  

Each county must produce one `CountyEnergyProfile` object. The map, side panel, score breakdown, layer toggles, and report output must all read from this county profile shape.

Utility or service territory is contextual information only. It must not affect the Backup Priority Score unless reliable utility-level reliability data is added and explicitly documented.

## 2. Required county fields

Each county record must include these required fields:

```ts
countyFips: string;
countyName: string;
state: "TX";
centroidLat: number;
centroidLon: number;
population: number | null;
likelyUtilityTerritory: string | null;
gridRegion: "ERCOT" | "Non-ERCOT" | "Unknown";
countyGeometryId: string;
```

Each computed county profile must include these required scoring fields:

```ts
weatherRiskScore: number;
solarPotentialScore: number;
demandExposureScore: number;
statewideGridStrainScore: number;
backupPriorityScore: number;
backupPriorityLabel: "Low" | "Medium" | "High" | "Critical";
```

Each county profile must include these explanation and quality fields:

```ts
scoreExplanation: ScoreExplanation;
recommendation: string;
dataQuality: DataQualitySummary;
lastUpdated: string;
sourceStatus: SourceStatus;
```

Rules:

- `countyFips` must be the stable unique key.
- `countyName` must display as plain county name, such as `Dallas County`.
- `centroidLat` and `centroidLon` must be used for weather and solar API calls.
- `likelyUtilityTerritory` must be labeled as likely or estimated unless backed by authoritative service-area data.
- `gridRegion` must not imply county-level grid precision.
- `lastUpdated` must use ISO 8601 format.

## 3. External APIs and keys

### Open-Meteo

Purpose: weather risk calculation  
Key required: no  
Input: county centroid latitude and longitude  
Output used: temperature, precipitation, wind speed, cloud cover, weather forecast variables  

Required environment variable: none

### NREL PVWatts

Purpose: solar potential calculation  
Key required: yes  
Input: county centroid latitude and longitude  
Output used: estimated annual or monthly solar production  

Required environment variable:

```env
NREL_API_KEY=
```

### Census API

Purpose: population and demand exposure input  
Key required: yes, unless using static cached Census data  
Input: county FIPS or Census query parameters  
Output used: county population  

Required environment variable:

```env
CENSUS_API_KEY=
```

### EIA Hourly Electric Grid Monitor

Purpose: statewide or balancing-authority grid strain  
Key required: yes  
Input: EIA route for balancing-authority or regional electricity operating data  
Output used: demand, forecast demand, or load-related strain indicators  

Required environment variable:

```env
EIA_API_KEY=
```

### ERCOT public data

Purpose: optional replacement or supplement for grid strain  
Key required: possibly yes, depending on access method  
Input: ERCOT public data endpoint or report  
Output used: grid strain, load, forecast load, or reserve-related signal  

Required environment variables, only if used:

```env
ERCOT_USERNAME=
ERCOT_PASSWORD=
ERCOT_SUBSCRIPTION_KEY=
```

### PUCT utility or service territory source

Purpose: likely utility or service territory context  
Key required: no expected key if using static lookup  
Input: county name, county FIPS, or spatial lookup if boundary layer is available  
Output used: likely utility or service territory label  

Required environment variable: none

## 4. Static data files

The app should prefer static bundled data for stable geography and metadata.

Required files:

```txt
/data/texas-counties.geojson
/data/texas-county-centroids.json
/data/texas-county-population.json
/data/texas-county-utility-context.json
```

Optional cache files:

```txt
/data/cache/solar-potential-by-county.json
/data/cache/weather-risk-by-county.json
/data/cache/grid-strain-latest.json
/data/cache/county-energy-profiles.json
```

### texas-counties.geojson

Contains county polygon boundaries.

Required properties per feature:

```ts
{
  GEOID: string;
  NAME: string;
  STATEFP: "48";
}
```

### texas-county-centroids.json

Contains county centroids.

```ts
{
  countyFips: string;
  countyName: string;
  centroidLat: number;
  centroidLon: number;
}
```

### texas-county-population.json

Contains county population.

```ts
{
  countyFips: string;
  countyName: string;
  population: number;
  year: number;
  source: "Census API" | "Static Census cache";
}
```

### texas-county-utility-context.json

Contains likely utility or service territory context.

```ts
{
  countyFips: string;
  countyName: string;
  likelyUtilityTerritories: string[];
  utilityContextQuality: "official_boundary" | "static_lookup" | "estimated" | "unknown";
  notes?: string;
}
```

Utility context must support multiple utilities because many counties may overlap more than one service territory.

## 5. Score input definitions

### Weather risk score

A 0 to 100 score estimating weather conditions that may increase backup-planning relevance.

Inputs may include:

- forecast high temperature
- forecast low temperature
- precipitation probability or amount
- wind speed or gusts
- weather severity indicators available from Open-Meteo
- cloud cover, only as secondary context

The score is county-specific because it uses county centroid weather data.

### Solar potential score

A 0 to 100 score estimating how suitable the county is for solar production.

Inputs may include:

- PVWatts estimated annual AC output
- PVWatts monthly AC output
- county centroid location
- standard assumed system configuration

The score is county-specific because it uses county centroid solar estimates.

### Demand exposure score

A 0 to 100 score estimating how many people may be exposed to backup-planning need.

Inputs may include:

- county population
- normalized population rank among Texas counties
- optional future static inputs only if available, such as housing units or business count

The score is county-specific because it uses county population.

### Statewide grid strain score

A 0 to 100 score estimating current or recent grid pressure across the Texas grid or relevant balancing authority.

Inputs may include:

- current demand
- forecast demand
- demand as share of available capacity, if available
- reserve margin proxy, if available
- EIA balancing-authority data or ERCOT public data

This score is not county-specific unless a reliable county-level grid source exists. If statewide data is used, the same grid strain score applies to all counties and must be labeled as statewide or balancing-authority level.

### Utility or service territory context

A non-scoring context field showing likely service territory information.

Inputs may include:

- PUCT public map data
- static lookup table
- utility territory boundary data if available

This field must not affect the Backup Priority Score by default.

## 6. Normalization rules for each score

All component scores must be normalized to the 0 to 100 range.

### Shared clamp rule

Every score must be clamped:

```ts
normalizedScore = Math.max(0, Math.min(100, normalizedScore));
```

### Weather risk normalization

Use deterministic sub-scores and combine them.

Recommended weather sub-score weights:

```txt
heat risk: 40%
cold risk: 25%
wind risk: 20%
precipitation risk: 15%
```

Example deterministic method:

```ts
heatRisk =
  highTempF >= 105 ? 100 :
  highTempF >= 100 ? 85 :
  highTempF >= 95 ? 70 :
  highTempF >= 90 ? 50 :
  highTempF >= 85 ? 30 :
  10;

coldRisk =
  lowTempF <= 15 ? 100 :
  lowTempF <= 25 ? 85 :
  lowTempF <= 32 ? 70 :
  lowTempF <= 40 ? 40 :
  10;

windRisk =
  maxWindMph >= 45 ? 100 :
  maxWindMph >= 35 ? 80 :
  maxWindMph >= 25 ? 60 :
  maxWindMph >= 15 ? 35 :
  10;

precipRisk =
  precipInches >= 2.0 ? 100 :
  precipInches >= 1.0 ? 75 :
  precipInches >= 0.5 ? 50 :
  precipInches > 0 ? 25 :
  10;
```

Final:

```ts
weatherRiskScore =
  0.40 * heatRisk +
  0.25 * coldRisk +
  0.20 * windRisk +
  0.15 * precipRisk;
```

If weather data is unavailable, use fallback rules in Section 9.

### Solar potential normalization

Use PVWatts estimated annual AC output for a standard system.

Required standard assumptions:

```txt
system_capacity: 4 kW
module_type: standard
array_type: fixed roof mount or fixed open rack
tilt: 20 degrees unless better default is chosen
azimuth: 180 degrees
losses: standard PVWatts default or documented fixed value
```

Recommended normalization:

```ts
solarPotentialScore = percentileRank(countyAnnualAcKwh, allTexasCountyAnnualAcKwh);
```

Rules:

- Highest solar output counties approach 100.
- Lowest solar output counties approach 0.
- Use all 254 Texas counties as the comparison set.
- Recompute only when solar cache is regenerated.
- Do not compare Texas counties to national values unless explicitly documented.

If PVWatts data is unavailable, use fallback rules in Section 9.

### Demand exposure normalization

Use county population percentile or min-max normalization.

Preferred method:

```ts
demandExposureScore = percentileRank(countyPopulation, allTexasCountyPopulations);
```

Alternative method if percentile helper is not implemented:

```ts
demandExposureScore =
  ((countyPopulation - minPopulation) / (maxPopulation - minPopulation)) * 100;
```

Rules:

- Use the same method for every county.
- If using min-max, clamp to 0 to 100.
- If population is missing, do not invent population.

### Statewide grid strain normalization

Use current demand relative to a recent reference baseline.

Preferred method:

```ts
gridStrainScore =
  ((currentDemandMw - lowReferenceDemandMw) /
  (highReferenceDemandMw - lowReferenceDemandMw)) * 100;
```

Reference values may come from:

- same-day forecast range
- recent 30-day historical range
- documented ERCOT or EIA operating data
- static fallback thresholds if live data is unavailable

If only current demand and forecast demand are available:

```ts
gridStrainScore =
  (currentDemandMw / forecastPeakDemandMw) * 100;
```

Rules:

- Clamp to 0 to 100.
- Label as statewide or balancing-authority level.
- Do not display it as county-level grid reliability.
- If no grid data is available, use fallback rules in Section 9.

## 7. Final scoring formula

The Backup Priority Score is calculated as:

```txt
Backup Priority Score =
0.30(weather risk)
+ 0.25(solar potential)
+ 0.25(demand exposure)
+ 0.20(statewide grid strain)
```

In TypeScript:

```ts
backupPriorityScore = Math.round(
  0.30 * weatherRiskScore +
  0.25 * solarPotentialScore +
  0.25 * demandExposureScore +
  0.20 * statewideGridStrainScore
);
```

Rules:

- All component scores must be 0 to 100 before the final score is calculated.
- Final score must be rounded to the nearest whole number.
- Final score must be clamped to 0 to 100.
- Utility territory must not be included in the formula.
- If a score uses fallback data, the final profile must expose that in `dataQuality`.

## 8. Label thresholds

Use these final labels:

```txt
0 to 39: Low
40 to 59: Medium
60 to 79: High
80 to 100: Critical
```

TypeScript label logic:

```ts
function getBackupPriorityLabel(score: number): BackupPriorityLabel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}
```

Display language:

- Low: lower backup-planning priority
- Medium: moderate backup-planning priority
- High: elevated backup-planning priority
- Critical: highest backup-planning priority

Avoid these phrases:

- outage prediction
- outage risk forecast
- guaranteed reliability issue
- utility failure score
- blackout prediction

Use these phrases instead:

- backup-planning priority
- estimated planning signal
- public-data score
- grid strain context
- weather exposure

## 9. Fallback rules when APIs fail

Fallbacks must be deterministic, visible to the user, and marked in data quality fields.

### Open-Meteo failure

Fallback order:

1. Use cached weather value if available and not older than 24 hours.
2. Use county seasonal baseline if available.
3. Mark weather risk as unavailable and exclude it only if the scoring engine supports reweighting.
4. If reweighting is not implemented, use neutral value `50` and mark as estimated.

Required UI label:

```txt
Weather data unavailable. Using cached or estimated weather risk.
```

### PVWatts failure

Fallback order:

1. Use cached PVWatts value if available.
2. Use static solar cache generated from prior successful PVWatts calls.
3. Use regional Texas solar baseline only if clearly labeled as estimated.
4. Use neutral value `50` if no defensible fallback exists.

Required UI label:

```txt
Solar estimate unavailable. Using cached or estimated solar potential.
```

### Census failure

Fallback order:

1. Use bundled static Census population file.
2. Use last successful cached county population file.
3. Mark population unavailable and use neutral demand score `50`.

Required UI label:

```txt
Population data unavailable. Using cached or estimated demand exposure.
```

### EIA or ERCOT failure

Fallback order:

1. Use most recent cached grid strain if available and not older than 6 hours.
2. Use daily cached grid strain if available and not older than 24 hours.
3. Use neutral statewide grid strain value `50`.
4. Mark statewide grid strain as estimated.

Required UI label:

```txt
Grid strain data unavailable. Using cached or neutral statewide grid strain.
```

### PUCT or utility context failure

Fallback order:

1. Use static county utility context lookup.
2. Show `Unknown`.
3. Do not change score.

Required UI label:

```txt
Utility context unavailable. Score is unaffected.
```

### Reweighting rule

Default behavior should not reweight scores unless explicitly implemented and tested.

Preferred default:

```txt
Use neutral value 50 for unavailable scoring inputs and mark the source as estimated.
```

Reason: reweighting can make scores harder to compare across counties.

## 10. TypeScript data types

```ts
export type BackupPriorityLabel = "Low" | "Medium" | "High" | "Critical";

export type GridRegion = "ERCOT" | "Non-ERCOT" | "Unknown";

export type DataQuality = "live" | "cached" | "estimated" | "unavailable";

export type UtilityContextQuality =
  | "official_boundary"
  | "static_lookup"
  | "estimated"
  | "unknown";

export type SourceName =
  | "county_geojson"
  | "county_centroid"
  | "census_population"
  | "open_meteo"
  | "nrel_pvwatts"
  | "eia_grid_monitor"
  | "ercot_public_data"
  | "puct_utility_context";

export type SourceStatusEntry = {
  source: SourceName;
  quality: DataQuality;
  lastUpdated: string | null;
  message: string;
};

export type SourceStatus = SourceStatusEntry[];

export type ScoreInput = {
  value: number;
  quality: DataQuality;
  explanation: string;
};

export type ScoreExplanation = {
  weatherRisk: ScoreInput;
  solarPotential: ScoreInput;
  demandExposure: ScoreInput;
  statewideGridStrain: ScoreInput;
  finalSummary: string;
};

export type DataQualitySummary = {
  overall: DataQuality;
  weather: DataQuality;
  solar: DataQuality;
  demand: DataQuality;
  grid: DataQuality;
  utility: DataQuality;
};

export type CountyBaseRecord = {
  countyFips: string;
  countyName: string;
  state: "TX";
  centroidLat: number;
  centroidLon: number;
  population: number | null;
  likelyUtilityTerritories: string[];
  utilityContextQuality: UtilityContextQuality;
  gridRegion: GridRegion;
  countyGeometryId: string;
};

export type CountyEnergyProfile = CountyBaseRecord & {
  weatherRiskScore: number;
  solarPotentialScore: number;
  demandExposureScore: number;
  statewideGridStrainScore: number;
  backupPriorityScore: number;
  backupPriorityLabel: BackupPriorityLabel;
  scoreExplanation: ScoreExplanation;
  recommendation: string;
  dataQuality: DataQualitySummary;
  sourceStatus: SourceStatus;
  lastUpdated: string;
};

export type WeatherApiResult = {
  countyFips: string;
  highTempF: number | null;
  lowTempF: number | null;
  maxWindMph: number | null;
  precipInches: number | null;
  cloudCoverPercent: number | null;
  fetchedAt: string;
  quality: DataQuality;
};

export type SolarApiResult = {
  countyFips: string;
  annualAcKwh: number | null;
  monthlyAcKwh: number[] | null;
  systemCapacityKw: number;
  fetchedAt: string;
  quality: DataQuality;
};

export type GridStrainResult = {
  region: "Texas" | "ERCOT" | "EIA_BalancingAuthority" | "Unknown";
  currentDemandMw: number | null;
  forecastPeakDemandMw: number | null;
  gridStrainScore: number;
  fetchedAt: string;
  quality: DataQuality;
};

export type ScoreBreakdown = {
  weatherWeighted: number;
  solarWeighted: number;
  demandWeighted: number;
  gridWeighted: number;
  finalScore: number;
};
```

## 11. Data quality labels

Use these labels consistently.

### Live

Meaning: current data was fetched successfully from the source during the latest refresh window.

Display:

```txt
Live
```

### Cached

Meaning: source data was not fetched live, but a recent stored value is being used.

Display:

```txt
Cached
```

### Estimated

Meaning: a deterministic fallback, baseline, or neutral value is being used.

Display:

```txt
Estimated
```

### Unavailable

Meaning: no reliable value exists for this field.

Display:

```txt
Unavailable
```

Overall data quality should be calculated conservatively:

```ts
function getOverallDataQuality(parts: DataQuality[]): DataQuality {
  if (parts.includes("unavailable")) return "unavailable";
  if (parts.includes("estimated")) return "estimated";
  if (parts.includes("cached")) return "cached";
  return "live";
}
```

UI rule:

- Always show data quality for each score input.
- Always show a plain-English reason for estimated or cached values.
- Never hide fallback behavior.

## 12. Validation checklist

### Geography validation

- Confirm exactly 254 Texas counties are present.
- Confirm each county has a unique FIPS code.
- Confirm each county has a valid centroid.
- Confirm each county has a matching GeoJSON feature.
- Confirm county names display correctly.

### Population validation

- Confirm each county has population or a clear fallback.
- Confirm population values are numeric.
- Confirm demand exposure scores are 0 to 100.
- Confirm demand exposure does not use fabricated values.

### Weather validation

- Confirm Open-Meteo calls use county centroid coordinates.
- Confirm weather outputs are converted to consistent units.
- Confirm weather risk scores are 0 to 100.
- Confirm missing weather data triggers data quality labels.

### Solar validation

- Confirm PVWatts calls use county centroid coordinates.
- Confirm the same PVWatts system assumptions are used for every county.
- Confirm annual AC output is cached.
- Confirm solar potential scores are 0 to 100.
- Confirm missing solar data triggers fallback labels.

### Grid strain validation

- Confirm grid strain uses EIA or ERCOT public data.
- Confirm statewide or balancing-authority data is labeled correctly.
- Confirm the app does not claim county-level grid precision.
- Confirm grid strain scores are 0 to 100.
- Confirm missing grid data uses cached or neutral fallback.

### Utility context validation

- Confirm utility/service territory does not affect final score.
- Confirm multiple likely utilities are supported.
- Confirm unknown utility context displays as `Unknown`.
- Confirm the UI says likely or estimated when appropriate.

### Final score validation

- Confirm all component scores are clamped to 0 to 100.
- Confirm final formula uses the required weights.
- Confirm final score is rounded to a whole number.
- Confirm labels match the exact thresholds.
- Confirm every county can generate a complete county panel.
- Confirm every county can generate a copy/export report.
- Confirm no UI wording claims outage prediction, engineering advice, investment advice, or legal advice.
