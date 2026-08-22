/**
 * GridSignal Texas — Need vs Feasibility quadrant placement.
 *
 * Pure CSS-matrix positioning helper. Midpoint 50/50 splits the 0-100 scales;
 * a county is plottable only when BOTH axis values exist — withheld or
 * unavailable values are never fabricated into a position.
 */

export type QuadrantKey =
  | "higherNeedHigherFeasibility"
  | "higherNeedLowerFeasibility"
  | "lowerNeedHigherFeasibility"
  | "lowerNeedLowerFeasibility";

export const MATRIX_MIDPOINT = 50;

export function matrixPosition(
  structuralNeed: number | null,
  feasibility: number | null
): { x: number; y: number; quadrant: QuadrantKey; plottable: true } | { plottable: false } {
  if (structuralNeed === null || feasibility === null) return { plottable: false };
  const x = Math.max(0, Math.min(100, feasibility));
  const y = Math.max(0, Math.min(100, structuralNeed));
  const higherNeed = y >= MATRIX_MIDPOINT;
  const higherFeasibility = x >= MATRIX_MIDPOINT;
  return {
    x,
    y,
    quadrant:
      higherNeed && higherFeasibility
        ? "higherNeedHigherFeasibility"
        : higherNeed
          ? "higherNeedLowerFeasibility"
          : higherFeasibility
            ? "lowerNeedHigherFeasibility"
            : "lowerNeedLowerFeasibility",
    plottable: true,
  };
}

export const QUADRANT_LABELS: Record<QuadrantKey, string> = {
  higherNeedHigherFeasibility: "Higher need · higher feasibility",
  higherNeedLowerFeasibility: "Higher need · lower feasibility",
  lowerNeedHigherFeasibility: "Lower need · higher feasibility",
  lowerNeedLowerFeasibility: "Lower need · lower feasibility",
};
