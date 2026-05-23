import { NextResponse } from "next/server";
import { buildCountyProfileByFips } from "@/lib/data/profileService";

type RouteParams = { params: Promise<{ fips: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { fips } = await params;

  if (!/^48\d{3}$/.test(fips)) {
    return NextResponse.json({ error: "Invalid Texas county FIPS code." }, { status: 400 });
  }

  try {
    const profile = await buildCountyProfileByFips(fips);
    if (!profile) {
      return NextResponse.json({ error: "County not found." }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error(`[API /county/${fips}]`, error);
    return NextResponse.json(
      { error: "Failed to load county profile." },
      { status: 500 }
    );
  }
}
