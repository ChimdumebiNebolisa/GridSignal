/**
 * GridSignal Texas — Core county types
 * Derived from gridsignal_texas_data_contract.md §2 and §10
 */

// --- Enums and label types ---

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

export type LayerName =
  | "backupPriority"
  | "weatherRisk"
  | "solarPotential"
  | "demandExposure"
  | "statewideGridStrain";

// --- Source and quality types ---

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
