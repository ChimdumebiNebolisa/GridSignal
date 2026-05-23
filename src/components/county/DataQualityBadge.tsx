import type { DataQuality } from "@/types/county";
import { dataQualityLabel } from "@/lib/data/dataQuality";

type DataQualityBadgeProps = {
  quality: DataQuality;
  label: string;
};

const QUALITY_STYLES: Record<DataQuality, string> = {
  live: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cached: "bg-blue-100 text-blue-800 border-blue-200",
  estimated: "bg-amber-100 text-amber-800 border-amber-200",
  unavailable: "bg-slate-100 text-slate-600 border-slate-200",
};

export function DataQualityBadge({ quality, label }: DataQualityBadgeProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span
        className={`rounded border px-2 py-0.5 text-xs font-medium ${QUALITY_STYLES[quality]}`}
      >
        {dataQualityLabel(quality)}
      </span>
    </div>
  );
}
