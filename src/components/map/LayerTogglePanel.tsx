"use client";

import type { LayerName } from "@/types/county";
import { LAYER_DESCRIPTIONS, LAYER_LABELS } from "@/lib/map/colors";

const LAYERS: LayerName[] = [
  "backupPriority",
  "weatherRisk",
  "solarPotential",
  "demandExposure",
  "statewideGridStrain",
];

type LayerTogglePanelProps = {
  selected: LayerName;
  onChange: (layer: LayerName) => void;
};

export function LayerTogglePanel({ selected, onChange }: LayerTogglePanelProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur-sm">
      <p className="mb-2 px-1 text-xs font-semibold text-slate-700">Map layer</p>
      <div
        className="flex flex-col gap-1"
        role="radiogroup"
        aria-label="Map layer selection"
      >
        {LAYERS.map((layer) => (
          <label
            key={layer}
            className={`cursor-pointer rounded px-2 py-1.5 text-xs ${
              selected === layer
                ? "bg-slate-800 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            title={LAYER_DESCRIPTIONS[layer]}
          >
            <input
              type="radio"
              name="map-layer"
              value={layer}
              checked={selected === layer}
              onChange={() => onChange(layer)}
              className="sr-only"
            />
            {LAYER_LABELS[layer]}
          </label>
        ))}
      </div>
    </div>
  );
}
