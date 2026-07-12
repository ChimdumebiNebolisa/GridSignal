import { describe, expect, it } from "vitest";
import { markStale } from "@/lib/data/freshness";

describe("markStale", () => {
  it("marks cached data stale beyond its freshness window", () => {
    const now = Date.parse("2026-07-12T00:00:00.000Z");
    expect(markStale("cached", "2026-07-10T00:00:00.000Z", 24, now)).toBe("stale");
  });

  it("preserves explicit fallback and unavailable states", () => {
    const now = Date.parse("2026-07-12T00:00:00.000Z");
    expect(markStale("fallback", "2020-01-01T00:00:00.000Z", 1, now)).toBe("fallback");
    expect(markStale("unavailable", null, 1, now)).toBe("unavailable");
  });
});
