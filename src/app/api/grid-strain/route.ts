import { NextResponse } from "next/server";
import { fetchGridStrain } from "@/lib/api/eia";
import { normalizeGridStrain } from "@/lib/scoring/normalize";
import { apiError } from "@/lib/api/response";

export async function GET() {
  try {
    const gridStrain = await fetchGridStrain();
    const normalized = normalizeGridStrain(gridStrain);

    return NextResponse.json({
      ...gridStrain,
      label:
        "Statewide or balancing-authority grid strain (ERCO). Not county-level grid reliability.",
      gridStrainScore: normalized.value,
      scoreQuality: normalized.quality,
      explanation: normalized.explanation,
    });
  } catch (error) {
    console.error("[API /grid-strain]", error);
    return apiError("GRID_STRAIN_UNAVAILABLE", "Failed to load grid strain data.", 500);
  }
}
