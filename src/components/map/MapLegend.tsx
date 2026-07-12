import type { LayerName } from "@/types/county";
import { LAYER_LABELS, PLANNING_COLORS } from "@/lib/map/colors";

type MapLegendProps = {
  layer: LayerName;
};

const PLANNING_LEGEND = [
  { label: "Lower (0–39)", color: PLANNING_COLORS.Lower },
  { label: "Moderate (40–59)", color: PLANNING_COLORS.Moderate },
  { label: "Elevated (60–79)", color: PLANNING_COLORS.Elevated },
  { label: "Highest (80–100)", color: PLANNING_COLORS.Highest },
];

const QUADRANT_LEGEND = [
  { label: "High need, high feasibility", color: "#c45c26" },
  { label: "High need, lower feasibility", color: "#b84a3a" },
  { label: "Lower need, high feasibility", color: "#5a8f6e" },
  { label: "Lower need, lower feasibility", color: "#94a3b8" },
];

export function MapLegend({ layer }: MapLegendProps) {
  const items =
    layer === "needFeasibilityQuadrant" ? QUADRANT_LEGEND : PLANNING_LEGEND;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-800">{LAYER_LABELS[layer]}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-slate-700">
            <span
              className="h-3 w-5 shrink-0 rounded border border-slate-300"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            {item.label}
          </li>
        ))}
      </ul>
      {(layer === "structuralNeed" || layer === "feasibility") && (
        <p className="mt-2 text-[10px] text-slate-500">
          Unavailable or withheld values are shown in gray
        </p>
      )}
    </div>
  );
}
