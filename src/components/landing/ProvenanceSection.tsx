import { TechnicalLabel } from "@/components/ui/TechnicalLabel";
import type { DataManifest } from "@/types/county";

type ProvenanceSectionProps = {
  manifest: DataManifest | null;
};

const CARDS: Array<{
  label: string;
  title: string;
  provenance: string;
  freshness: string;
  scope: string;
  limitation: string;
}> = [
  {
    label: "Hazard risk",
    title: "Structural indicators: hazard",
    provenance:
      "FEMA National Risk Index v1.20 counties, official FEMA GeoPlatform feature service.",
    freshness: "Bundled snapshot; acquisition timestamp and SHA-256 fingerprint in the manifest.",
    scope: "Percentile of NRI composite RISK_SCORE among the 254 Texas counties.",
    limitation: "Planning proxy for relative hazard risk; not an outage forecast.",
  },
  {
    label: "Vulnerability",
    title: "Structural indicators: social vulnerability",
    provenance: "CDC/ATSDR Social Vulnerability Index 2022, official CDC ArcGIS service (owner data_cdc).",
    freshness: "Bundled snapshot; acquisition timestamp and fingerprint in the manifest.",
    scope: "Overall SVI percentile (RPL_THEMES ×100) exactly as published by ATSDR.",
    limitation: "A community-vulnerability indicator; says nothing about grid reliability itself.",
  },
  {
    label: "Outage burden",
    title: "Structural indicators: outage history",
    provenance:
      "DOE EAGLE-I 2014–2022 archive. Acquisition is currently documented as blocked in sources/eagle_i/blocked.json.",
    freshness: "Component withheld; no substitute value is used anywhere in the product.",
    scope:
      "Not applicable while blocked; structural scores currently compute from the two available components.",
    limitation:
      "Withholding is deliberate: fabricating or proxying outage history would corrupt the axis.",
  },
  {
    label: "Solar feasibility",
    title: "Backup feasibility: solar resource",
    provenance:
      "EC JRC PVGIS v5.2 PVcalc on NREL NSRDB satellite irradiance (2005–2015 climatology). Keyless public API.",
    freshness: "Bundled snapshot with per-county acquisition time and bundle fingerprint.",
    scope: "Simulated annual output of a standard 4 kW fixed-tilt system at each county centroid.",
    limitation:
      "County-centroid relative comparison only; not site-specific design and not an NREL PVWatts result.",
  },
  {
    label: "Weather context",
    title: "Operating context: weather",
    provenance: "Open-Meteo forecast API at county centroids; live per request in /explore.",
    freshness: "Bundled cache entries are labeled cached/stale against a 72-hour window.",
    scope: "Near-term county weather stress; displayed as context only.",
    limitation: "Never affects structural need, feasibility, or any ranking.",
  },
  {
    label: "Statewide grid",
    title: "Operating context: ERCO/EIA load",
    provenance: "EIA Hourly Electric Grid Monitor, ERCO balancing-authority demand.",
    freshness: "15-minute TTL when an EIA key is configured; documented neutral fallback otherwise.",
    scope: "Statewide/balancing-authority signal; explicitly not county-level reliability.",
    limitation: "Never implies county-level measurements; never affects rankings.",
  },
];

export function ProvenanceSection({ manifest }: ProvenanceSectionProps) {
  return (
    <section id="data" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <p className="gs-label">Data &amp; provenance</p>
      <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
        Know what is measured, estimated, cached, or unavailable
      </h2>
      <p className="mt-3 max-w-[700px] text-sm leading-relaxed text-[var(--gs-muted)]">
        Every GridSignal value carries source, vintage, acquisition time,
        transformation method, quality, and a verifiable fingerprint.
        {" "}
        {manifest?.gates?.rankingsPublished === false &&
          "For the current bundle, ordinal rankings are withheld because sensitivity gates did not pass; component values remain visible and labeled."}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <article key={c.label} className="gs-frame-flat p-4">
            <TechnicalLabel>{c.label}</TechnicalLabel>
            <h3 className="mt-1 text-base font-semibold leading-snug">{c.title}</h3>
            <dl className="mt-3 space-y-2 text-xs leading-relaxed">
              <div>
                <dt className="gs-label">Provenance</dt>
                <dd className="mt-0.5 text-[var(--gs-ink-soft)]">{c.provenance}</dd>
              </div>
              <div>
                <dt className="gs-label">Freshness</dt>
                <dd className="mt-0.5 text-[var(--gs-ink-soft)]">{c.freshness}</dd>
              </div>
              <div>
                <dt className="gs-label">Scope</dt>
                <dd className="mt-0.5 text-[var(--gs-ink-soft)]">{c.scope}</dd>
              </div>
              <div>
                <dt className="gs-label">Limitation</dt>
                <dd className="mt-0.5 text-[var(--gs-ink-soft)]">{c.limitation}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {manifest && (
        <p className="mt-6 font-mono text-[11px] text-[var(--gs-muted-2)]">
          Manifest schema {manifest.schemaVersion} · scoring config{" "}
          {manifest.scoreConfigVersion} · built {new Date(manifest.generatedAt).toISOString().slice(0, 10)} ·{" "}
          {Object.keys(manifest.fingerprints?.artifacts ?? {}).length} fingerprinted artifacts
        </p>
      )}
    </section>
  );
}
