import { describe, expect, it } from "vitest";
import { searchAll } from "@/lib/search/search";
import { searchCountyNames } from "@/lib/search/countySearch";
import { getCountyCentroids } from "@/lib/data/counties";

describe("search confidence labeling", () => {
  it("labels exact full-name county matches as exact", () => {
    const results = searchCountyNames("houston county", getCountyCentroids());
    expect(results[0].confidence).toBe("exact");
  });

  it("labels partial county-name matches as approximate", () => {
    for (const q of ["hous", "harr"]) {
      const results = searchCountyNames(q, getCountyCentroids(), 5);
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.confidence, `${q} -> ${r.displayName}`).toBe("approximate");
      }
    }
  });

  it("labels ZIP matches as approximate", () => {
    const results = searchAll("77002");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].matchType).toBe("zip");
    expect(results[0].confidence).toBe("approximate");
  });
});

describe("namesake disambiguation (city vs same-named county)", () => {
  it("returns both the city and the namesake county for 'houston'", () => {
    const results = searchAll("houston");
    const types = results.map((r) => `${r.matchType}:${r.countyFips}`);
    expect(types.some((t) => t.startsWith("city:"))).toBe(true);
    expect(types.some((t) => t.includes("48201"))).toBe(true); // Harris
    // City result ranks before or with the county results.
    expect(results[0].matchType === "city" || results[1]?.matchType === "city").toBe(
      true
    );
  });

  it("prefers an exact county match when the query says 'county'", () => {
    const results = searchAll("houston county");
    expect(results[0].matchType).toBe("county");
    expect(results[0].displayName.toLowerCase()).toBe("houston county");
    expect(results[0].confidence).toBe("exact");
  });

  it("never maps two different display names to a duplicated entry", () => {
    const results = searchAll("orange");
    const keys = results.map((r) => `${r.matchType}:${r.displayName}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
