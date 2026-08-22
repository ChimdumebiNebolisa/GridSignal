import type { DataQuality } from "@/types/county";
import { dataQualityLabel } from "@/lib/data/dataQuality";

const CHIP_CLASS: Record<DataQuality, string> = {
  live: "gs-chip gs-chip-live",
  cached: "gs-chip gs-chip-cached",
  estimated: "gs-chip gs-chip-estimated",
  stale: "gs-chip gs-chip-stale",
  fallback: "gs-chip gs-chip-fallback",
  unavailable: "gs-chip gs-chip-unavailable",
};

/**
 * Status chip with non-color text encoding: the label text itself carries the
 * state (a11y — color is never the only signal).
 */
export function StatusTag({ quality }: { quality: DataQuality }) {
  return <span className={CHIP_CLASS[quality]}>{dataQualityLabel(quality)}</span>;
}
