import { NextResponse } from "next/server";
import { buildCountyProfileByFips } from "@/lib/data/profileService";
import { apiError } from "@/lib/api/response";
import { logRouteMetric } from "@/lib/utils/observability";

type RouteParams = { params: Promise<{ fips: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const { fips } = await params;

  if (!/^48\d{3}$/.test(fips)) {
    return apiError("INVALID_FIPS", "Invalid Texas county FIPS code.", 400);
  }

  try {
    const profile = await buildCountyProfileByFips(fips);
    if (!profile) {
      return apiError("COUNTY_NOT_FOUND", "County not found.", 404);
    }
    const response = NextResponse.json(profile);
    logRouteMetric("/api/county/[fips]", startedAt, { status: 200 });
    return response;
  } catch (error) {
    console.error(`[API /county/${fips}]`, error);
    return apiError("COUNTY_UNAVAILABLE", "Failed to load county profile.", 500);
  }
}
