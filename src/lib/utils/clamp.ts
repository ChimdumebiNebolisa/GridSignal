/**
 * Clamp a numeric value to a [min, max] range.
 * Used by all normalization functions to enforce 0–100 bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
