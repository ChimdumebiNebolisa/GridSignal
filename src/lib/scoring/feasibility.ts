/**
 * GridSignal Texas — Backup feasibility scoring (annual)
 */

import type {
  CountyFeasibilityRecord,
  DataQuality,
  FeasibilityProfile,
} from "@/types/county";
import { getPlanningLabel } from "@/lib/scoring/labels";
import { clamp } from "@/lib/utils/clamp";

export function calculateFeasibility(
  record: CountyFeasibilityRecord
): FeasibilityProfile {
  const solar = record.components.solarResource;
  const score =
    solar.value !== null
      ? clamp(Math.round(solar.value), 0, 100)
      : null;

  const quality: DataQuality =
    solar.value === null
      ? "unavailable"
      : solar.imputed
        ? "estimated"
        : solar.quality;

  return {
    score,
    label: getPlanningLabel(score),
    noScoreReason: score === null ? "unavailable" : null,
    components: record.components,
    quality,
  };
}
