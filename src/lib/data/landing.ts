/**
 * GridSignal Texas — Landing data assembly.
 *
 * Deterministic and network-free: uses the bundled indicator snapshots, the
 * bundled weather cache (labeled with its real freshness), and the documented
 * statewide fallback grid sample. Live operational context remains exclusive
 * to /explore so the landing page can prerender reproducibly.
 */

import "server-only";
import {
  getCountyStaticProfiles,
  getSampleGridStrain,
  getSolarCache,
  getWeatherCache,
} from "@/lib/data/counties";
import { mergeCountyProfile } from "@/lib/data/mergeCountyProfile";
import { summaryFromProfile } from "@/lib/data/mapSummary";
import type { CountyEnergyProfile, MapCountySummary } from "@/types/county";

export const HERO_COUNTY_FIPS = "48113"; // Dallas County — stable illustrative default

export type LandingData = {
  summaries: MapCountySummary[];
  hero: CountyEnergyProfile;
};

export function buildLandingData(): LandingData {
  const bases = getCountyStaticProfiles();
  const solarCache = getSolarCache();
  const weatherByFips = new Map(getWeatherCache().map((w) => [w.countyFips, w]));
  // Documented neutral statewide fallback — never presented as live.
  const gridStrain = getSampleGridStrain();

  const heroBase = bases.find((b) => b.countyFips === HERO_COUNTY_FIPS);
  if (!heroBase) throw new Error("Hero county profile missing from static bundle");

  const profiles = bases.map((base) => {
    const cachedWeather = weatherByFips.get(base.countyFips);
    const weather =
      cachedWeather ??
      ({
        countyFips: base.countyFips,
        highTempF: null,
        lowTempF: null,
        maxWindMph: null,
        precipInches: null,
        cloudCoverPercent: null,
        fetchedAt: new Date(0).toISOString(),
        quality: "unavailable",
        sourceName: "Open-Meteo Forecast API",
        lastUpdated: null,
        limitation: "Weather cache entry unavailable for this county.",
      } as const);
    return mergeCountyProfile({ base, weather, solarCache, gridStrain });
  });

  const hero = profiles.find((p) => p.countyFips === HERO_COUNTY_FIPS)!;
  return { summaries: profiles.map(summaryFromProfile), hero };
}

/**
 * Disclosed selection rule for the comparison table. Prefers structural-need
 * extremes; falls back to feasibility extremes when structural ordinal values
 * are withheld bundle-wide (gate failure), and reports which axis was used.
 */
export function selectComparisonRows(
  summaries: MapCountySummary[],
  limit = 8
): { rows: MapCountySummary[]; sortedBy: "structuralNeed" | "feasibility" } {
  const byNeed = [...summaries]
    .filter((s) => s.structuralNeedScore !== null)
    .sort((a, b) => (b.structuralNeedScore as number) - (a.structuralNeedScore as number));

  if (byNeed.length >= 4) {
    return {
      rows: dedupe([...byNeed.slice(0, 5), ...byNeed.slice(-3).reverse()]).slice(0, limit),
      sortedBy: "structuralNeed",
    };
  }

  const byFeas = [...summaries]
    .filter((s) => s.feasibilityScore !== null)
    .sort((a, b) => (b.feasibilityScore as number) - (a.feasibilityScore as number));
  return {
    rows: dedupe([...byFeas.slice(0, 5), ...byFeas.slice(-3).reverse()]).slice(0, limit),
    sortedBy: "feasibility",
  };
}

function dedupe(rows: MapCountySummary[]): MapCountySummary[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.countyFips)) return false;
    seen.add(r.countyFips);
    return true;
  });
}
