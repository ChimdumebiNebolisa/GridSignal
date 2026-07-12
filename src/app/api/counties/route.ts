import { NextResponse } from "next/server";
import { buildMapSummaries } from "@/lib/data/profileService";
import { getTexasGeoJson, TEXAS_COUNTY_COUNT } from "@/lib/data/counties";
import { runStaticDataValidation } from "@/lib/data/validateStaticData";
import { getCountyCentroids } from "@/lib/data/counties";
import { apiError } from "@/lib/api/response";
import { logRouteMetric } from "@/lib/utils/observability";

export async function GET() {
  const startedAt = Date.now();
  try {
    const summaries = await buildMapSummaries();
    const geojson = getTexasGeoJson();
    const centroids = getCountyCentroids();

    const validation = runStaticDataValidation({
      countyCount: summaries.length,
      fipsList: centroids.map((c) => c.countyFips),
      centroids,
      geoFips: geojson.features
        .map((f) => (f.properties as { GEOID?: string } | null)?.GEOID)
        .filter((fips): fips is string => Boolean(fips)),
    });

    const response = NextResponse.json({
      counties: summaries,
      geojson,
      countyCount: summaries.length,
      expectedCount: TEXAS_COUNTY_COUNT,
      validation,
    });
    logRouteMetric("/api/counties", startedAt, {
      status: 200,
      countyCount: summaries.length,
    });
    return response;
  } catch (error) {
    console.error("[API /counties]", error);
    logRouteMetric("/api/counties", startedAt, { status: 500 });
    return apiError("COUNTIES_UNAVAILABLE", "Failed to load county profiles.", 500);
  }
}
