/**
 * Derive profile timestamps from score-bearing sources.
 */

export function deriveProfileTimestamps(
  sourceFetchedAts: (string | null | undefined)[]
): { lastUpdated: string; profileAssembledAt: string } {
  const profileAssembledAt = new Date().toISOString();
  const valid = sourceFetchedAts.filter(
    (t): t is string => typeof t === "string" && t.length > 0
  );
  if (valid.length === 0) {
    return { lastUpdated: profileAssembledAt, profileAssembledAt };
  }
  const oldest = valid.reduce((min, t) => (t < min ? t : min), valid[0]);
  return { lastUpdated: oldest, profileAssembledAt };
}
