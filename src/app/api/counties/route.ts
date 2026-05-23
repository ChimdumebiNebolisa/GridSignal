import { NextResponse } from "next/server";
import { buildMapSummaries } from "@/lib/data/profileService";
import { getTexasGeoJson, TEXAS_COUNTY_COUNT } from "@/lib/data/counties";
import { runStaticDataValidation } from "@/lib/data/validateStaticData";
import { getCountyCentroids } from "@/lib/data/counties";

export async function GET() {
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

    return NextResponse.json({
      counties: summaries,
      geojson,
      countyCount: summaries.length,
      expectedCount: TEXAS_COUNTY_COUNT,
      validation,
    });
  } catch (error) {
    console.error("[API /counties]", error);
    return NextResponse.json(
      { error: "Failed to load county profiles." },
      { status: 500 }
    );
  }
}
