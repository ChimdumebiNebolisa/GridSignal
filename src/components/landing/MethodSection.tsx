import type { MapCountySummary } from "@/types/county";
import { NeedFeasibilityMatrix } from "./NeedFeasibilityMatrix";

/**
 * Two-axis reasoning section (DESIGN.md §9): structural need and backup
 * feasibility answer different questions and are never combined.
 */
export function MethodSection({
  summaries,
  heroFips,
}: {
  summaries: MapCountySummary[];
  heroFips: string;
}) {
  return (
    <section id="method" className="border-y border-[var(--gs-border)] bg-[var(--gs-canvas)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="gs-label">Method</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Need and feasibility are different questions
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--gs-muted)]">
            GridSignal deliberately keeps its two planning axes separate.
            Structural resilience need asks how much underlying stress a county
            shows across hazard risk and social vulnerability. Backup feasibility
            asks whether solar resource supports distributed backup power under a
            standard system assumption.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gs-blue)]" />
              <span>
                <strong>Structural resilience need.</strong> Equal-weight
                combination of available components, withheld when more than one
                is missing or when publication gates fail.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gs-blue)]" />
              <span>
                <strong>Backup feasibility.</strong> Percentile of simulated PV
                output for a standard 4 kW fixed-tilt system at each county
                centroid (PVGIS/NSRDB).
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gs-blue)]" />
              <span>
                <strong>No composite score.</strong> The axes are never collapsed
                into one &quot;GridSignal score,&quot; and current conditions never alter either axis.
              </span>
            </li>
          </ul>
          <p className="mt-6 font-mono text-[11px] leading-relaxed text-[var(--gs-muted-2)]">
            Publication gates: coverage ≥ 90% of counties scored; worst-case ±20%
            single-weight sweep must hold rank stability ≥ 80%; outcome-proxy
            correlation ≥ 0.4 when outage data is present. Failed gates withhold
            ordinal rankings bundle-wide.
          </p>
        </div>
        <NeedFeasibilityMatrix summaries={summaries} heroFips={heroFips} />
      </div>
    </section>
  );
}
