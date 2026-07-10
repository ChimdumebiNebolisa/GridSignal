"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { LayerName } from "@/types/county";
import { getLayerColor, getLayerScore, LAYER_LABELS } from "@/lib/map/colors";
import type { MapCountySummary } from "@/types/county";
import "leaflet/dist/leaflet.css";

type TexasCountyMapProps = {
  geojson: FeatureCollection;
  counties: MapCountySummary[];
  selectedFips: string | null;
  layer: LayerName;
  onSelectCounty: (fips: string) => void;
};

function TexasBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [25.8, -106.7],
        [36.5, -93.5],
      ],
      { padding: [20, 20] }
    );
  }, [map]);
  return null;
}

type CountyProps = { GEOID: string; NAME: string };

function tooltipForLayer(layer: LayerName, county: MapCountySummary): string {
  switch (layer) {
    case "structuralNeed":
      return `Structural need: ${county.structuralNeedScore ?? "withheld"}/100 (${county.structuralNeedLabel})`;
    case "feasibility":
      return `Feasibility: ${county.feasibilityScore}/100 (${county.feasibilityLabel})`;
    case "needFeasibilityQuadrant":
      return `Need ${county.structuralNeedScore ?? "—"} / Feasibility ${county.feasibilityScore}`;
    case "weatherStress":
      return `Weather stress: ${county.weatherStressScore}/100`;
    default:
      return `Score: ${getLayerScore(layer, county) ?? "—"}/100`;
  }
}

export function TexasCountyMap({
  geojson,
  counties,
  selectedFips,
  layer,
  onSelectCounty,
}: TexasCountyMapProps) {
  const scoreByFips = useMemo(() => {
    const map = new Map<string, MapCountySummary>();
    for (const c of counties) map.set(c.countyFips, c);
    return map;
  }, [counties]);

  const style = (feature?: Feature<Geometry, CountyProps>): PathOptions => {
    const fips = feature?.properties?.GEOID ?? "";
    const county = scoreByFips.get(fips);
    const selected = fips === selectedFips;

    return {
      fillColor: county ? getLayerColor(layer, county) : "#cbd5e1",
      fillOpacity: selected ? 0.92 : 0.78,
      color: selected ? "#1e293b" : "#64748b",
      weight: selected ? 2.5 : 0.8,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, CountyProps>, leafletLayer: Layer) => {
    const fips = feature.properties.GEOID;
    const county = scoreByFips.get(fips);
    const name = feature.properties.NAME;

    leafletLayer.bindTooltip(
      `<strong>${name} County</strong><br/>${
        county ? tooltipForLayer(layer, county) : "No data"
      }<br/><span style="font-size:10px">${LAYER_LABELS[layer]}</span>`,
      { sticky: true, className: "county-tooltip" }
    );

    leafletLayer.on({
      click: () => onSelectCounty(fips),
    });
  };

  return (
    <MapContainer
      center={[31.0, -99.0]}
      zoom={6}
      className="h-full w-full z-0"
      scrollWheelZoom
      attributionControl={false}
    >
      <TexasBounds />
      <GeoJSON
        key={`${layer}-${selectedFips ?? "none"}`}
        data={geojson}
        style={style}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
