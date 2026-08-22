import { GridSignalApp } from "@/components/GridSignalApp";
import {
  buildMapSummaries,
  buildOperationalContextSummary,
} from "@/lib/data/profileService";
import { getTexasGeoJson } from "@/lib/data/counties";

// Operational context must reflect request-time data, never a build-time bake
// (audit F-004). Scores themselves remain bundled and deterministic.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore — GridSignal Texas",
  description:
    "Interactive Texas county explorer for structural resilience need, backup feasibility, current context, and data provenance.",
};

export default async function ExplorePage() {
  const [counties, operationalContext] = await Promise.all([
    buildMapSummaries(),
    buildOperationalContextSummary(),
  ]);
  const geojson = getTexasGeoJson();

  return (
    <GridSignalApp
      initialCounties={counties}
      initialGeojson={geojson}
      initialOperationalContext={operationalContext}
    />
  );
}
