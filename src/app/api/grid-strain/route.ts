import { NextResponse } from "next/server";
import { fetchGridStrain } from "@/lib/api/eia";
import { normalizeGridStrain } from "@/lib/scoring/normalize";

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
    return NextResponse.json(
      { error: "Failed to load grid strain data." },
      { status: 500 }
    );
  }
}
