import { NextResponse } from "next/server";
import { getCentroidByFips, getWeatherCacheByFips } from "@/lib/data/counties";
import { fetchWeather } from "@/lib/api/openMeteo";
import { normalizeWeatherRisk } from "@/lib/scoring/normalize";
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
    const cached = getWeatherCacheByFips(fips);
    const liveWeather = await fetchWeather(
      fips,
      centroid.centroidLat,
      centroid.centroidLon
    );
    const weather =
      liveWeather.quality === "unavailable" && cached ? cached : liveWeather;

    const normalized = normalizeWeatherRisk(weather);

    return NextResponse.json({
      ...weather,
      weatherStressScore: normalized.value,
      scoreQuality: normalized.quality,
      explanation: normalized.explanation,
    });
  } catch (error) {
    console.error(`[API /weather/${fips}]`, error);
    const fallback = getWeatherCacheByFips(fips) ?? {
      countyFips: fips,
      highTempF: null,
      lowTempF: null,
      maxWindMph: null,
      precipInches: null,
      cloudCoverPercent: null,
      fetchedAt: new Date().toISOString(),
      quality: "estimated" as const,
      sourceName: "Estimated weather fallback",
      lastUpdated: new Date().toISOString(),
      limitation:
        "Weather request failed and no cache was available; using neutral planning estimate.",
    };
    const normalized = normalizeWeatherRisk(fallback);
    return NextResponse.json({
      ...fallback,
      weatherStressScore: normalized.value,
      scoreQuality: normalized.quality,
      explanation: normalized.explanation,
    });
  }
}
