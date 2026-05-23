import type { LayerName } from "@/types/county";
import { LAYER_LABELS, PRIORITY_COLORS } from "@/lib/map/colors";

type MapLegendProps = {
  layer: LayerName;
};

const LEGEND_ITEMS = [
  { label: "Low (0–39)", color: PRIORITY_COLORS.Low },
  { label: "Medium (40–59)", color: PRIORITY_COLORS.Medium },
  { label: "High (60–79)", color: PRIORITY_COLORS.High },
  { label: "Critical (80–100)", color: PRIORITY_COLORS.Critical },
];

export function MapLegend({ layer }: MapLegendProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-800">{LAYER_LABELS[layer]}</p>
      <ul className="mt-2 space-y-1">
        {LEGEND_ITEMS.map((item) => (
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
    </div>
  );
}
