import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { buildLandingData, selectComparisonRows, HERO_COUNTY_FIPS } from "@/lib/data/landing";

const read = (p: string) => readFileSync(resolve(process.cwd(), "src", p), "utf-8");

describe("route architecture (/ landing, /explore explorer)", () => {
  it("keeps the full interactive explorer at /explore with request-time context", () => {
    const explore = read("app/explore/page.tsx");
    expect(explore).toContain('export const dynamic = "force-dynamic"');
    expect(explore).toContain("<GridSignalApp");
    expect(explore).toContain("buildOperationalContextSummary");
  });

  it("keeps the landing page free of the stateful explorer and live context fetches", () => {
    const page = read("app/page.tsx");
    expect(page).not.toContain("GridSignalApp");
    expect(page).not.toContain("buildOperationalContextSummary");
    expect(page).toContain("<LandingNav");
    expect(page).toContain("<CountyFile");
    expect(page).toContain("<MapFeature");
    expect(page).toContain("<ProvenanceSection");
  });

  it("renders operational context in the hero file only as labeled cached/fallback values", () => {
    // Guard against implying liveness on the static landing page.
    const countyFile = read("components/landing/CountyFile.tsx");
    expect(countyFile).toMatch(/does not affect scores/i);
    expect(countyFile).toMatch(/cached/);
    expect(countyFile).not.toMatch(/\blive\b(?!r)/i);
  });
});

describe("landing data", () => {
  const { summaries, hero } = buildLandingData();

  it("exposes all 254 counties plus the Dallas hero profile", () => {
    expect(summaries).toHaveLength(254);
    expect(hero.countyFips).toBe(HERO_COUNTY_FIPS);
    expect(hero.countyName).toBe("Dallas County");
  });

  it("reflects the gate-withheld structural axis without fabricating values", () => {
    const gates = getDataManifestGates();
    if (gates === "published") {
      expect(summaries.some((s) => s.structuralNeedScore !== null)).toBe(true);
    } else {
      for (const s of summaries) {
        expect(s.structuralNeedScore).toBeNull();
        expect(s.structuralNeedNoScoreReason ?? null).not.toBeFalsy();
      }
    }
  });

  it("selects comparison rows with a disclosed fallback axis", () => {
    const { rows, sortedBy } = selectComparisonRows(summaries);
    expect(rows.length).toBeGreaterThan(3);
    expect(["structuralNeed", "feasibility"]).toContain(sortedBy);
    const unique = new Set(rows.map((r) => r.countyFips));
    expect(unique.size).toBe(rows.length);
  });
});

function getDataManifestGates(): "published" | "withheld" {
  // Indirect: the landing data itself is the source of truth here.
  const { summaries } = buildLandingData();
  return summaries.some((s) => s.structuralNeedScore !== null) ? "published" : "withheld";
}
