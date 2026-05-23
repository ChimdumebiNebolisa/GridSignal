import { NextResponse } from "next/server";
import { getCentroidByFips, getWeatherCacheByFips } from "@/lib/data/counties";
import { fetchWeather } from "@/lib/api/openMeteo";
import { normalizeWeatherRisk } from "@/lib/scoring/normalize";

type RouteParams = { params: Promise<{ fips: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { fips } = await params;

  if (!/^48\d{3}$/.test(fips)) {
    return NextResponse.json({ error: "Invalid Texas county FIPS code." }, { status: 400 });
  }

  const centroid = getCentroidByFips(fips);
  if (!centroid) {
    return NextResponse.json({ error: "County not found." }, { status: 404 });
  }

  try {
    const cached = getWeatherCacheByFips(fips);
    const weather =
      cached ??
      (await fetchWeather(fips, centroid.centroidLat, centroid.centroidLon));

    const normalized = normalizeWeatherRisk(weather);

    return NextResponse.json({
      ...weather,
      weatherRiskScore: normalized.value,
      scoreQuality: normalized.quality,
      explanation: normalized.explanation,
    });
  } catch (error) {
    console.error(`[API /weather/${fips}]`, error);
    return NextResponse.json(
      { error: "Failed to load weather data." },
      { status: 500 }
    );
  }
}
