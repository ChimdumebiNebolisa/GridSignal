"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeatureCollection } from "geojson";
import type { LayerName, MapCountySummary } from "@/types/county";
import { MapLegend } from "@/components/map/MapLegend";
import { LoadingState } from "@/components/states/LoadingState";

const TexasCountyMap = dynamic(
  () => import("@/components/map/TexasCountyMap").then((m) => m.TexasCountyMap),
  {
    ssr: false,
    loading: () => <LoadingState message="Loading Texas county map..." />,
  }
);

type MapFeatureProps = {
  summaries: MapCountySummary[];
  geojson: FeatureCollection;
};

/**
 * Read-only landing preview of the real explorer map. Clicking a county
 * deep-links into /explore — the full interaction lives there.
 */
export function MapFeature({ summaries, geojson }: MapFeatureProps) {
  const router = useRouter();
  const layer: LayerName = "feasibility"; // feasibility axis is currently the published one

  return (
    <div
      className="gs-frame overflow-hidden"
      role="region"
      aria-label="Interactive preview of the Texas county feasibility map. Full interaction available in the explorer."
    >
      <div className="flex items-center justify-between border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] px-4 py-2">
        <span className="font-mono text-xs font-semibold">TEXAS COUNTY SIGNAL MAP</span>
        <span className="font-mono text-[10px] text-[var(--gs-muted-2)]">
          preview · full interaction at /explore
        </span>
      </div>
      <div className="relative h-[420px] md:h-[520px]">
        <TexasCountyMap
          geojson={geojson}
          counties={summaries}
          selectedFips={null}
          layer={layer}
          onSelectCounty={(fips) => router.push(`/explore?county=${fips}`)}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500]">
          <div className="pointer-events-auto rounded-md border border-[var(--gs-border)] bg-white/95 p-2 shadow-sm">
            <MapLegend layer={layer} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--gs-border)] bg-[var(--gs-canvas)] px-4 py-2">
        <p className="font-mono text-[10px] text-[var(--gs-muted)]">
          All 254 counties · keyboard-accessible list available in the explorer.
        </p>
        <Link href="/explore" className="font-mono text-[11px] font-semibold text-[var(--gs-blue)] hover:underline">
          OPEN EXPLORER →
        </Link>
      </div>
    </div>
  );
}
