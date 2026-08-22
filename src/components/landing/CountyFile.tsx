import type { CountyEnergyProfile, DataQuality } from "@/types/county";
import { TechnicalLabel } from "@/components/ui/TechnicalLabel";
import { StatusTag } from "@/components/ui/StatusTag";

type CountyFileProps = {
  hero: CountyEnergyProfile;
};

function IndicatorRow({
  label,
  value,
  quality,
  source,
}: {
  label: string;
  value: number | null;
  quality: DataQuality;
  source: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-[var(--gs-border)] px-4 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--gs-ink)]">{label}</p>
        <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--gs-muted-2)]">
          {source}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {value !== null ? `${value}/100` : "—"}
        </span>
        <StatusTag quality={quality} />
      </div>
    </li>
  );
}

export function CountyFile({ hero }: CountyFileProps) {
  const need = hero.structuralNeed;
  const feas = hero.feasibility;

  return (
    <div className="gs-frame overflow-hidden text-left">
      {/* window-chrome style header */}
      <div className="flex items-center justify-between border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] px-4 py-2">
        <span className="font-mono text-xs font-semibold text-[var(--gs-ink-soft)]">
          COUNTY RESILIENCE FILE
        </span>
        <span className="font-mono text-[10px] text-[var(--gs-muted-2)]">
          FIPS {hero.countyFips} · snapshot
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[240px_1fr]">
        {/* Left rail */}
        <div className="border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] p-4 md:border-b-0 md:border-r">
          <TechnicalLabel>County</TechnicalLabel>
          <p className="mt-1 text-lg font-semibold leading-tight">{hero.countyName}</p>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="gs-label">Data schema</dt>
              <dd className="font-mono text-xs">{hero.dataManifestVersion}</dd>
            </div>
            <div>
              <dt className="gs-label">Overall quality (scores)</dt>
              <dd className="mt-1">
                <StatusTag quality={hero.dataQuality.overall} />
              </dd>
            </div>
            <div>
              <dt className="gs-label">Structural axis</dt>
              <dd className="mt-1">
                <StatusTag quality={hero.dataQuality.structuralNeed} />
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-[var(--gs-muted)]">
            Bundled authoritative snapshots. Acquisition times and fingerprints
            are recorded in the data manifest.
          </p>
        </div>

        {/* Analytical area */}
        <div className="divide-y divide-[var(--gs-border)]">
          <section className="p-4 pb-2">
            <div className="mb-2 flex items-center justify-between">
              <TechnicalLabel>Structural resilience need</TechnicalLabel>
              <span className="font-mono text-xs text-[var(--gs-muted-2)]">
                {need.score !== null ? `${need.score}/100` : "withheld"}
              </span>
            </div>
            <ul className="gs-frame-flat overflow-hidden">
              <IndicatorRow
                label="Hazard risk (NRI composite)"
                value={need.components.hazardExposure.value}
                quality={need.components.hazardExposure.quality}
                source="fema_nri · RISK_SCORE percentile"
              />
              <IndicatorRow
                label="Social vulnerability"
                value={need.components.socialVulnerability.value}
                quality={need.components.socialVulnerability.quality}
                source="cdc_svi · RPL_THEMES ×100"
              />
              <IndicatorRow
                label="Historical outage burden"
                value={need.components.outageBurden.value}
                quality={need.components.outageBurden.quality}
                source="eagle_i · withheld (archive not ingested)"
              />
            </ul>
            {need.score === null && (
              <p className="mt-2 font-mono text-[11px] text-[var(--gs-warning)]">
                {need.noScoreReason === "gates_failed"
                  ? "Ranking withheld: coverage/sensitivity gate failed for this bundle."
                  : "Score withheld."}
              </p>
            )}
          </section>

          <section className="p-4 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <TechnicalLabel>Backup feasibility</TechnicalLabel>
              <span className="font-mono text-xs text-[var(--gs-muted-2)]">
                {feas.score !== null ? `${feas.score}/100` : "withheld"}
              </span>
            </div>
            <ul className="gs-frame-flat overflow-hidden">
              <IndicatorRow
                label="Solar resource — 4 kW fixed tilt"
                value={feas.components.solarResource.value}
                quality={feas.components.solarResource.quality}
                source="pvgis_nsrdb · E_y percentile"
              />
            </ul>
          </section>

          <section className="bg-[var(--gs-canvas)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <TechnicalLabel>Operating context — does not affect scores</TechnicalLabel>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="gs-frame-flat p-2.5">
                <p className="gs-label">Weather stress</p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {hero.operationalContext.weatherStressScore}/100{" "}
                  <span className="text-[10px] font-normal text-[var(--gs-muted-2)]">cached</span>
                </p>
              </div>
              <div className="gs-frame-flat p-2.5">
                <p className="gs-label">ERCO load context</p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {hero.operationalContext.statewideGridStrainScore}/100{" "}
                  <span className="text-[10px] font-normal text-[var(--gs-muted-2)]">fallback</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
