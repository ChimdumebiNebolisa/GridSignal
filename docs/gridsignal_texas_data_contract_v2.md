# GridSignal Texas Data Contract v2.1

## Canonical axes

| Field | Horizon | County rank? | Missing behavior |
|---|---|---:|---|
| `structuralNeed` | Multi-year, annual refresh | Yes | `score: null` with `noScoreReason` when unavailable or more than one component is missing |
| `feasibility` | Annual refresh | Yes | `score: null` with `noScoreReason: unavailable` when solar is missing |
| `operationalContext` | Current/near-term | No | Labeled cached, estimated, stale, fallback, or unavailable |
| `utilityContext` | Static/as sourced | No | Separate context quality; never degrades score quality |

## Public county profile

```ts
type PlanningLabel = "Lower" | "Moderate" | "Elevated" | "Highest";
type NoScoreReason = "missing_components" | "unavailable";

type CountyEnergyProfile = {
  countyFips: string;
  countyName: string;
  structuralNeed: {
    score: number | null;
    label: PlanningLabel | null;
    noScoreReason: NoScoreReason | null;
    components: IndicatorComponentSet;
    missingComponents: string[];
    quality: DataQuality;
  };
  feasibility: {
    score: number | null;
    label: PlanningLabel | null;
    noScoreReason: NoScoreReason | null;
    components: { solarResource: IndicatorComponent };
    quality: DataQuality;
  };
  operationalContext: OperationalContext;
  dataQuality: DataQualitySummary;
  sourceStatus: SourceStatus;
  recommendation: string;
  dataManifestVersion: string;
  lastUpdated: string;
  profileAssembledAt: string;
};
```

Legacy `backupPriorityScore`, `backupPriorityLabel`, demand-exposure, and weather-risk composite fields are not part of active public profile/map/API/export contracts.

## Scoring rules

- Structural need uses equal weights: hazard exposure, social vulnerability, and outage burden.
- If more than one structural component is missing, structural score and label are withheld.
- Available structural components are weighted by the canonical configuration and renormalized across available components only when the missing-count gate permits scoring.
- Feasibility is the normalized solar-resource score; solar is never treated as structural need.
- Scores are clamped to 0–100 and rounded to whole numbers.
- Operational weather and statewide grid strain never affect county rank.
- Utility context never affects scores.

## Data quality

`DataQuality` is one of `live`, `cached`, `estimated`, `stale`, `fallback`, or `unavailable`.

Every score-bearing component exposes value, quality, source, vintage, explanation, and optional imputation status. Null scores expose a no-score reason. The UI and exports must not convert null to a neutral label or number.

## Manifest

`src/data/manifests/data-version.json` publishes `schemaVersion`, `scoreConfigVersion`, `generatedAt`, source records (id, vintage, built time, coverage, quality, method, limitation), and SHA-256 `fingerprints` for bundled inputs and generated indicators.

Current schema version: `2.2.0`. Current score configuration version: `two-axis-v1`.

Provenance rule: bundled structural and solar components use `synthetic_*` source ids and are never attributed to authoritative providers until a real ingest replaces them (ADR 002). `npm run data:validate` enforces fingerprints, component↔manifest binding, and this rule.
