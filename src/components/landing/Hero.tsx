import Link from "next/link";

export function Hero({ rankingsPublished }: { rankingsPublished: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 text-center md:pb-16 md:pt-24">
        <p className="mx-auto inline-block rounded-sm border border-[#c4d9f7] bg-[var(--gs-blue-soft)] px-3 py-1 gs-label !text-[#1d4ed8]">
          Texas grid resilience planning
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight text-[var(--gs-ink)] md:text-6xl">
          Make Texas grid resilience easier to understand.
        </h1>
        <p className="mx-auto mt-6 max-w-[700px] text-base leading-relaxed text-[var(--gs-muted)]">
          GridSignal brings structural resilience need, backup feasibility,
          county weather context, and statewide grid conditions into one
          county-level planning view, with sources, vintage, and data quality
          attached to every value. It is a planning signal, not an outage
          prediction.
        </p>
        <p className="mx-auto mt-4 max-w-[700px] font-mono text-xs text-[var(--gs-muted-2)]">
          {rankingsPublished
            ? "Indicator values are bundled snapshots; quality and provenance are labeled on every value."
            : "Current bundle: structural ordinal rankings are withheld because the sensitivity gate did not pass (66.5% worst-case stability vs an 80% target). Component values remain visible."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/explore" className="gs-btn-primary">
            EXPLORE TEXAS
          </Link>
          <a href="#method" className="gs-btn-secondary">
            VIEW METHODOLOGY
          </a>
        </div>
    </div>
  );
}
