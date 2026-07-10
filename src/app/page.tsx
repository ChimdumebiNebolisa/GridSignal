import { GridSignalApp } from "@/components/GridSignalApp";
import {
  buildMapSummaries,
  buildOperationalContextSummary,
} from "@/lib/data/profileService";
import { getTexasGeoJson } from "@/lib/data/counties";

export default async function Home() {
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
