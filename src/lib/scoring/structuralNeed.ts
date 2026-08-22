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
import { STRUCTURAL_NEED_WEIGHTS } from "@/types/scoring";

export const MAX_MISSING_FOR_STRUCTURAL_NEED = 1;

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
  // Axis quality reflects what actually feeds the computation: a withheld
  // component makes the axis PARTIAL (worst of available qualities), not
  // "unavailable", as long as the score itself remains computable.
  const qualitiesForQuality = (
    available.length === 0 ||
    missingComponents.length > MAX_MISSING_FOR_STRUCTURAL_NEED
      ? Object.values(components)
      : Object.values(components).filter((c) => c.value !== null)
  ).map(componentQuality);
  const quality = getOverallDataQuality(qualitiesForQuality);

  if (available.length === 0 || missingComponents.length > MAX_MISSING_FOR_STRUCTURAL_NEED) {
    return {
      score: null,
      label: null,
      noScoreReason:
        available.length === 0 ? "unavailable" : "missing_components",
      components,
      missingComponents,
      quality,
    };
  }

  const totalWeight = available.reduce(
    (sum, [key]) => sum + STRUCTURAL_NEED_WEIGHTS[key],
    0
  );
  const score = clamp(
    Math.round(
      available.reduce(
        (sum, [key, c]) =>
          sum + (c.value ?? 0) * STRUCTURAL_NEED_WEIGHTS[key],
        0
      ) / totalWeight
    ),
    0,
    100
  );

  return {
    score,
    label: getPlanningLabel(score),
    noScoreReason: null,
    components,
    missingComponents,
    quality,
  };
}
