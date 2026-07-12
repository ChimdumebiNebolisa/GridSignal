import type { DataQuality } from "@/types/county";

export function markStale(
  quality: DataQuality,
  timestamp: string | null | undefined,
  maxAgeHours: number,
  now = Date.now()
): DataQuality {
  if (!timestamp || quality === "fallback" || quality === "unavailable") return quality;
  const ageMs = now - Date.parse(timestamp);
  return ageMs > maxAgeHours * 60 * 60 * 1000 ? "stale" : quality;
}
