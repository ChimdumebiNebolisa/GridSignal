import { NextResponse } from "next/server";
import { getCentroidByFips, getSolarCache } from "@/lib/data/counties";
import { fetchSolarPotential } from "@/lib/api/pvWatts";
import { normalizeSolarPotential } from "@/lib/scoring/normalize";

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
    const solar = await fetchSolarPotential(
      fips,
      centroid.centroidLat,
      centroid.centroidLon
    );
    const normalized = normalizeSolarPotential(fips, getSolarCache());

    return NextResponse.json({
      ...solar,
      solarPotentialScore: normalized.value,
      scoreQuality: normalized.quality,
      explanation: normalized.explanation,
    });
  } catch (error) {
    console.error(`[API /solar/${fips}]`, error);
    return NextResponse.json(
      { error: "Failed to load solar data." },
      { status: 500 }
    );
  }
}
