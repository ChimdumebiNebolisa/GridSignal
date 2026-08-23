import { buildLandingData, selectComparisonRows, HERO_COUNTY_FIPS } from "@/lib/data/landing";
import { getDataManifest } from "@/lib/data/indicators";
import { getTexasGeoJson } from "@/lib/data/counties";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { CountyFile } from "@/components/landing/CountyFile";
import { AnnotationNote } from "@/components/landing/AnnotationNote";
import { CountySignalsTable } from "@/components/landing/CountySignalsTable";
import { MapFeature } from "@/components/landing/MapFeature";
import { MethodSection } from "@/components/landing/MethodSection";
import { ProvenanceSection } from "@/components/landing/ProvenanceSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  const { summaries, hero } = buildLandingData();
  const manifest = getDataManifest();
  const { rows: tableRows, sortedBy } = selectComparisonRows(summaries);
  const geojson = getTexasGeoJson();
  const rankingsPublished = manifest?.gates?.rankingsPublished ?? false;

  return (
    <div className="min-h-screen bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[1000] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        {/* Hero + County Resilience File share one continuous grid section
            so the background tiles seamlessly and a single divider closes it. */}
        <section className="gs-grid-bg border-b border-[var(--gs-border)]">
          <Hero rankingsPublished={rankingsPublished} />
          <div className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_248px]">
              <CountyFile hero={hero} />
              <div className="flex flex-col gap-3 lg:pt-6">
                <AnnotationNote tone="yellow" label="Structural need">
                  Hazard risk and social vulnerability combine into a planning
                  axis. With the outage archive blocked, the axis currently
                  computes from two components.
                </AnnotationNote>
                <AnnotationNote tone="blue" label="Backup feasibility">
                  Solar-resource feasibility for a standard 4 kW fixed-tilt
                  system; a separate axis, never merged with structural need.
                </AnnotationNote>
                <AnnotationNote tone="green" label="Provenance">
                  Every value shows source, vintage, acquisition time,
                  transformation, quality, and fingerprint.
                </AnnotationNote>
                <AnnotationNote tone="peach" label="Operating context">
                  Weather and statewide ERCO load are context only. They never
                  alter structural rankings.
                </AnnotationNote>
              </div>
            </div>
          </div>
        </section>

        {/* County signals comparison */}
        <section id="signals" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="gs-label">County signals</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Compare county signals
          </h2>
          <p className="mb-8 mt-3 max-w-[700px] text-sm leading-relaxed text-[var(--gs-muted)]">
            Inspect counties side by side without collapsing fundamentally
            different dimensions into one score. Values come from the bundled
            snapshot layer that powers the explorer.{" "}
            {sortedBy === "feasibility" &&
              "Selection currently uses the backup-feasibility axis because structural ordinal rankings are withheld by gate."}
          </p>
          <CountySignalsTable rows={tableRows} />
        </section>

        {/* Texas map feature */}
        <section className="border-y border-[var(--gs-border)] bg-[var(--gs-canvas)]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <p className="gs-label">The map</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Read Texas county by county
            </h2>
            <p className="mb-8 mt-3 max-w-[700px] text-sm leading-relaxed text-[var(--gs-muted)]">
              The same county signals, spatially. Click any of the 254 counties
              to open it in the full explorer.
            </p>
            <MapFeature summaries={summaries} geojson={geojson} />
          </div>
        </section>

        <MethodSection summaries={summaries} heroFips={HERO_COUNTY_FIPS} />

        <ProvenanceSection manifest={manifest} />

        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
