# GridSignal Texas Data Contract v2

Supersedes scoring sections of v1. Geography and API adapter sections remain valid unless noted.

## 1. Indicator axes and time horizons

| Axis | Horizon | Refresh | County rank? |
|------|---------|---------|--------------|
| `structuralNeed` | Multi-year | Annual | Yes |
| `feasibility` | Annual | Annual | Yes |
| `operationalContext` | 0–72h + current hour | Hourly/daily | No |
| `utilityContext` | Static | As sourced | No |

## 2. County profile shape (v2 additions)

```ts
profileAssembledAt: string;       // ISO — when profile was built
lastUpdated: string;              // ISO — oldest score-bearing source fetchedAt
dataManifestVersion: string;

structuralNeed: StructuralNeedProfile;
feasibility: FeasibilityProfile;
operationalContext: OperationalContext;

// Deprecated — retained for migration/tests only
backupPriorityScore?: number;
backupPriorityLabel?: BackupPriorityLabel;
```

## 3. StructuralNeedProfile

```ts
score: number | null;             // null if withheld (missing components)
label: PlanningLabel;
components: {
  hazardExposure: IndicatorComponent;
  socialVulnerability: IndicatorComponent;
  outageBurden: IndicatorComponent;
};
missingComponents: string[];
quality: DataQuality;
```

## 4. FeasibilityProfile

```ts
score: number;
label: PlanningLabel;
components: {
  solarResource: IndicatorComponent;
};
quality: DataQuality;
```

## 5. OperationalContext

```ts
weatherStressScore: number;
weatherStressExplanation: string;
statewideGridStrainScore: number;
statewideGridStrainExplanation: string;
asOf: string;
limitation: string;
```

## 6. IndicatorComponent

```ts
value: number | null;
quality: DataQuality;
source: string;
vintage: string;
explanation: string;
imputed?: boolean;
```

## 7. Missing-data policy

- **Ban silent neutral 50.** Use `imputed: true` when estimating.
- If more than one structural need component missing → `structuralNeed.score = null`, list gaps.
- Statewide grid missing → operational banner only; exclude from any composite.

## 8. Data manifest

`src/data/manifests/data-version.json`:

```ts
{
  schemaVersion: "2.0.0";
  scoreConfigVersion: "none" | string;
  generatedAt: string;
  sources: ProvenanceRecord[];
}
```

## 9. Map layers (v2)

- `structuralNeed`
- `feasibility`
- `needFeasibilityQuadrant`
- `weatherStress`
- Legacy layers deprecated: `backupPriority`, `demandExposure`, `statewideGridStrain` as rank inputs

## 10. Static files

```
src/data/manifests/data-version.json
src/data/indicators/county-structural-need.json
src/data/indicators/county-feasibility.json
src/data/sources/{source_id}/{vintage}/
```

Actual runtime filenames (unchanged): `county-centroids.json`, `county-population.json`, `texas-counties.geojson`, cache files under `src/data/cache/`.

## 11. Quality rollup

`dataQuality.overall` computed from **score-bearing indicators only** (structural need components, feasibility, operational weather). Utility context uses separate `contextQuality` and does not degrade overall score quality.
