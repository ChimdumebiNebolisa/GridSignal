/**
 * GridSignal Texas — ERCOT API client (STUB)
 * 
 * ERCOT integration is deferred. EIA is used as the default grid strain source.
 * This stub returns null so the architecture is ready if the user later
 * provides ERCOT credentials.
 * 
 * TODO: Implement if user provides ERCOT_API_KEY / ERCOT_USERNAME / ERCOT_PASSWORD
 */

import type { GridStrainResult } from "@/types/api";

/**
 * Stub: Returns null. ERCOT integration is not active.
 */
export async function fetchErcotGridStrain(): Promise<GridStrainResult | null> {
  // ERCOT integration deferred — return null to signal caller should use EIA
  return null;
}
