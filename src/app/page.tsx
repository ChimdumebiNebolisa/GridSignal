import { GridSignalApp } from "@/components/GridSignalApp";
import { buildMapSummaries } from "@/lib/data/profileService";
import { getTexasGeoJson } from "@/lib/data/counties";

export default async function Home() {
  const counties = await buildMapSummaries();
  const geojson = getTexasGeoJson();

  return <GridSignalApp initialCounties={counties} initialGeojson={geojson} />;
}
