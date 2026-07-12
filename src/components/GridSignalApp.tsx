"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { CountyEnergyProfile, LayerName, MapCountySummary, OperationalContext } from "@/types/county";
import { summaryFromProfile } from "@/lib/data/mapSummary";
import { AppShell } from "@/components/layout/AppShell";
import { OperationalContextBar } from "@/components/layout/OperationalContextBar";
import { SearchBox } from "@/components/search/SearchBox";
import { LayerTogglePanel } from "@/components/map/LayerTogglePanel";
import { MapLegend } from "@/components/map/MapLegend";
import { CountyList } from "@/components/map/CountyList";
import { CountySidePanel } from "@/components/county/CountySidePanel";
import { LoadingState } from "@/components/states/LoadingState";
import { FallbackNotice } from "@/components/states/FallbackNotice";

const TexasCountyMap = dynamic(
  () => import("@/components/map/TexasCountyMap").then((m) => m.TexasCountyMap),
  {
    ssr: false,
    loading: () => <LoadingState message="Loading Texas county map..." />,
  }
);

type GridSignalAppProps = {
  initialCounties: MapCountySummary[];
  initialGeojson: FeatureCollection;
  initialOperationalContext: OperationalContext;
};

export function GridSignalApp({
  initialCounties,
  initialGeojson,
  initialOperationalContext,
}: GridSignalAppProps) {
  const [counties, setCounties] = useState(initialCounties);
  const [geojson] = useState(initialGeojson);
  const [operationalContext, setOperationalContext] = useState(
    initialOperationalContext
  );
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [profile, setProfile] = useState<CountyEnergyProfile | null>(null);
  const [layer, setLayer] = useState<LayerName>("structuralNeed");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showFallback] = useState(
    () =>
      initialCounties.some(
        (c) =>
          c.dataQuality.overall === "estimated" ||
          c.dataQuality.overall === "fallback" ||
          c.dataQuality.overall === "cached" ||
          c.dataQuality.overall === "stale"
      )
  );

  const loadProfile = useCallback(async (fips: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/county/${fips}`);
      if (!res.ok) throw new Error("County not found");
      const data: CountyEnergyProfile = await res.json();
      setProfile(data);
      setOperationalContext(data.operationalContext);
      setCounties((prev) =>
        prev.map((c) =>
          c.countyFips === fips ? summaryFromProfile(data) : c
        )
      );
    } catch {
      setProfileError("Failed to load county profile.");
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleSelectCounty = (fips: string) => {
    setSelectedFips(fips);
    void loadProfile(fips);
  };

  const mapArea = (
    <div className="relative flex h-full min-h-[320px] flex-col bg-slate-200">
      <OperationalContextBar context={operationalContext} />
      <div className="relative min-h-0 flex-1">
        <TexasCountyMap
          geojson={geojson}
          counties={counties}
          selectedFips={selectedFips}
          layer={layer}
          onSelectCounty={handleSelectCounty}
        />
        <div className="pointer-events-none absolute inset-0 z-[500]">
          <div className="pointer-events-auto flex flex-col gap-2 p-3">
            <SearchBox onSelectCounty={handleSelectCounty} />
            <CountyList
              counties={counties}
              selectedFips={selectedFips}
              onSelectCounty={handleSelectCounty}
            />
            {showFallback && <FallbackNotice />}
          </div>
          <div className="pointer-events-auto absolute right-3 top-3">
            <LayerTogglePanel selected={layer} onChange={setLayer} />
          </div>
          <div className="pointer-events-auto absolute bottom-3 left-3">
            <MapLegend layer={layer} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      mapArea={mapArea}
      sidePanel={
        <CountySidePanel
          profile={profile}
          loading={profileLoading}
          error={profileError}
        />
      }
    />
  );
}
