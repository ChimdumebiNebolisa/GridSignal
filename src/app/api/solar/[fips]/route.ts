import { NextResponse } from "next/server";
import { getCentroidByFips, getSolarCache } from "@/lib/data/counties";
import { fetchSolarPotential } from "@/lib/api/pvWatts";
import { normalizeSolarPotential } from "@/lib/scoring/normalize";
import { apiError } from "@/lib/api/response";

type RouteParams = { params: Promise<{ fips: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { fips } = await params;

  if (!/^48\d{3}$/.test(fips)) {
    return apiError("INVALID_FIPS", "Invalid Texas county FIPS code.", 400);
  }

  const centroid = getCentroidByFips(fips);
  if (!centroid) {
    return apiError("COUNTY_NOT_FOUND", "County not found.", 404);
  }

  try {
    const solar = await fetchSolarPotential(
      fips,
      centroid.centroidLat,
      centroid.centroidLon
    );
    const solarCache = getSolarCache();
    const liveAnnualAcKwh = solar.annualAcKwh;
    const scoringSolarCache =
      liveAnnualAcKwh !== null
        ? solarCache.map((entry) =>
            entry.countyFips === fips
              ? {
                  ...entry,
                  annualAcKwh: liveAnnualAcKwh,
                  quality: solar.quality,
                  fetchedAt: solar.fetchedAt,
                }
              : entry
          )
        : solarCache;
    const normalized = normalizeSolarPotential(fips, scoringSolarCache);

    return NextResponse.json({
      ...solar,
      feasibilityScore: solar.annualAcKwh === null ? null : normalized.value,
      scoreQuality: solar.annualAcKwh === null ? "unavailable" : normalized.quality,
      explanation: normalized.explanation,
    });
  } catch (error) {
    console.error(`[API /solar/${fips}]`, error);
    return apiError("SOLAR_UNAVAILABLE", "Failed to load solar data.", 500);
  }
}
