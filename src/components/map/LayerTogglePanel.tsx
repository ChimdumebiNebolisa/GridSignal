"use client";

import type { LayerName } from "@/types/county";
import { ACTIVE_LAYERS, LAYER_DESCRIPTIONS, LAYER_LABELS } from "@/lib/map/colors";

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
        {ACTIVE_LAYERS.map((layer) => (
          <label
            key={layer}
            className={`cursor-pointer rounded px-2 py-1.5 text-xs transition-colors focus-within:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--gs-blue)] has-[:focus-visible]:ring-offset-1 ${
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
