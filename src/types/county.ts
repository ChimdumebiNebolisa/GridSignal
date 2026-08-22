/**
 * GridSignal Texas — Core county types (v2)
 */

// --- Enums and label types ---

/** Historical-only type kept for migration validation; never used in public profiles. */
export type BackupPriorityLabel = "Low" | "Medium" | "High" | "Critical";

export type PlanningLabel = "Lower" | "Moderate" | "Elevated" | "Highest";
export type NoScoreReason = "missing_components" | "unavailable" | "gates_failed";

export type GridRegion = "ERCOT" | "Non-ERCOT" | "Unknown";

export type DataQuality =
  | "live"
  | "cached"
  | "estimated"
  | "fallback"
  | "stale"
  | "unavailable";

export type UtilityContextQuality =
  | "official_boundary"
  | "static_lookup"
  | "estimated"
  | "unknown";

/**
 * Identifies the origin of a displayed value. Bundled indicator values come
 * from authoritative public ingests (fema_nri, cdc_svi, eagle_i, pvgis_nsrdb);
 * runtime context comes from open_meteo / eia_grid_monitor.
 */
export type SourceName =
  | "county_geojson"
  | "census_population"
  | "open_meteo"
  | "eia_grid_monitor"
  | "puct_utility_context"
  | "fema_nri"
  | "cdc_svi"
  | "eagle_i"
  | "pvgis_nsrdb";

export type LayerName =
  | "structuralNeed"
  | "feasibility"
  | "needFeasibilityQuadrant"
  | "weatherStress";

export type MissingPolicy =
  | "exclude_and_reweight"
  | "withhold_component"
  | "withhold_composite";

// --- Manifest and provenance ---

export type ProvenanceRecord = {
  id: string;
  vintage: string;
  /** When this snapshot was acquired from the authoritative upstream. */
  fetchedAt: string;
  coverage: string;
  quality: DataQuality;
  url?: string;
  endpoint?: string;
  /** e.g. "blocked" when an authoritative acquisition is documented as infeasible. */
  status?: string;
  owner?: string;
  license?: string;
  sha256?: string;
  limitation?: string;
  staleAfterHours?: number;
  /** How bundled values were produced (field used + transformation). */
  method?: string;
};

/** Build-time publication gates. Rankings are withheld when gates fail. */
export type RankingGates = {
  structural: {
    /** Share of counties with a computable structural score (0-1). */
    coverageShare: number;
    coveragePass: boolean;
    stabilityWorstCase: number | null;
    stabilityPass: boolean | null;
    proxyCorrelation: number | null;
    proxyPass: boolean | null;
    pass: boolean;
    notes: string[];
  };
  feasibility: {
    coverageShare: number;
    coveragePass: boolean;
    pass: boolean;
  };
  rankingsPublished: boolean;
};

export type DataManifest = {
  schemaVersion: string;
  scoreConfigVersion: string;
  generatedAt: string;
  sources: ProvenanceRecord[];
  gates?: RankingGates;
  /**
   * SHA-256 content fingerprints (hex) of bundled input datasets and generated
   * indicator artifacts, keyed by path relative to src/data. Enables
   * machine-checked reproducibility and tamper detection.
   */
  fingerprints?: {
    algorithm: string;
    artifacts: Record<string, string>;
  };
};

// --- Indicator types ---

export type IndicatorComponent = {
  value: number | null;
  quality: DataQuality;
  source: string;
  vintage: string;
  explanation: string;
  imputed?: boolean;
  /** When the value was acquired from its authoritative upstream, if applicable. */
  acquiredAt?: string;
  /** Upstream acquisition/refresh path, when applicable. */
  method?: string;
};

export type StructuralNeedProfile = {
  score: number | null;
  label: PlanningLabel | null;
  noScoreReason: NoScoreReason | null;
  components: {
    hazardExposure: IndicatorComponent;
    socialVulnerability: IndicatorComponent;
    outageBurden: IndicatorComponent;
  };
  missingComponents: string[];
  quality: DataQuality;
};

export type FeasibilityProfile = {
  score: number | null;
  label: PlanningLabel | null;
  noScoreReason: NoScoreReason | null;
  components: {
    solarResource: IndicatorComponent;
  };
  quality: DataQuality;
};

export type OperationalContext = {
  weatherStressScore: number;
  weatherStressExplanation: string;
  /**
   * How the weather-stress number was derived (e.g. a single county-centroid
   * forecast vs the median across bundled county forecasts).
   */
  weatherStressBasis?: string;
  statewideGridStrainScore: number;
  statewideGridStrainExplanation: string;
  asOf: string;
  limitation: string;
};

export type CountyStructuralNeedRecord = {
  countyFips: string;
  structuralNeedScore: number | null;
  components: StructuralNeedProfile["components"];
  missingComponents: string[];
  quality: DataQuality;
};

export type CountyFeasibilityRecord = {
  countyFips: string;
  feasibilityScore: number | null;
  components: FeasibilityProfile["components"];
  quality: DataQuality;
};

// --- Source and quality types ---

export type SourceStatusEntry = {
  source: SourceName;
  sourceName: string;
  quality: DataQuality;
  fetchedAt?: string | null;
  lastUpdated: string | null;
  limitation: string;
  message: string;
};

export type SourceStatus = SourceStatusEntry[];

export type ScoreInput = {
  value: number;
  quality: DataQuality;
  explanation: string;
  imputed?: boolean;
};

export type DataQualitySummary = {
  overall: DataQuality;
  structuralNeed: DataQuality;
  feasibility: DataQuality;
  operational: DataQuality;
  contextQuality: DataQuality;
};

// --- County record types ---

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
  structuralNeed: StructuralNeedProfile;
  feasibility: FeasibilityProfile;
  operationalContext: OperationalContext;
  dataManifestVersion: string;
  profileAssembledAt: string;
  lastUpdated: string;
  recommendation: string;
  dataQuality: DataQualitySummary;
  sourceStatus: SourceStatus;
};

// --- Static data file shapes ---

export type CountyCentroidRecord = {
  countyFips: string;
  countyName: string;
  centroidLat: number;
  centroidLon: number;
};

export type CountyPopulationRecord = {
  countyFips: string;
  countyName: string;
  population: number;
  year: number;
  source: "Census API" | "Static Census cache";
};

export type CountyUtilityContextRecord = {
  countyFips: string;
  countyName: string;
  likelyUtilityTerritories: string[];
  utilityContextQuality: UtilityContextQuality;
  notes?: string;
};

export type SolarCacheEntry = {
  countyFips: string;
  annualAcKwh: number;
  systemCapacityKw: number;
  fetchedAt: string;
  quality: DataQuality;
};

// --- Search types ---

export type SearchMatchType = "county" | "city" | "zip";

export type SearchResult = {
  countyFips: string;
  displayName: string;
  matchType: SearchMatchType;
  confidence: "exact" | "approximate";
};

export type MapCountySummary = {
  countyFips: string;
  countyName: string;
  structuralNeedScore: number | null;
  structuralNeedLabel: PlanningLabel | null;
  structuralNeedNoScoreReason: NoScoreReason | null;
  feasibilityScore: number | null;
  feasibilityLabel: PlanningLabel | null;
  feasibilityNoScoreReason: NoScoreReason | null;
  weatherStressScore: number;
  dataQuality: DataQualitySummary;
};
