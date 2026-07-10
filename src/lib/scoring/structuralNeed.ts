/**
 * GridSignal Texas — Structural resilience need scoring (annual)
 */

import type {
  CountyStructuralNeedRecord,
  DataQuality,
  IndicatorComponent,
  StructuralNeedProfile,
} from "@/types/county";
import { getOverallDataQuality } from "@/lib/data/dataQuality";
import { getPlanningLabel } from "@/lib/scoring/labels";
import { clamp } from "@/lib/utils/clamp";

const MAX_MISSING_FOR_COMPOSITE = 1;

function componentQuality(c: IndicatorComponent): DataQuality {
  if (c.value === null) return "unavailable";
  return c.imputed ? "estimated" : c.quality;
}

export function calculateStructuralNeed(
  record: CountyStructuralNeedRecord
): StructuralNeedProfile {
  const components = record.components;
  const available = (
    Object.entries(components) as [keyof typeof components, IndicatorComponent][]
  ).filter(([, c]) => c.value !== null);

  const missingComponents = record.missingComponents;
  const qualities = Object.values(components).map(componentQuality);
  const quality = getOverallDataQuality(qualities);

  if (available.length === 0 || missingComponents.length > MAX_MISSING_FOR_COMPOSITE) {
    return {
      score: null,
      label: getPlanningLabel(null),
      components,
      missingComponents,
      quality,
    };
  }

  const score = clamp(
    Math.round(
      available.reduce((sum, [, c]) => sum + (c.value ?? 0), 0) / available.length
    ),
    0,
    100
  );

  return {
    score,
    label: getPlanningLabel(score),
    components,
    missingComponents,
    quality,
  };
}
