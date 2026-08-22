import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--gs-border)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-sm font-semibold">GridSignal</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--gs-muted)]">
            Texas county-level planning signals for structural resilience need
            and backup feasibility. Not an outage prediction, reliability
            determination, or professional advice.
          </p>
          <p className="mt-3 font-mono text-[10px] text-[var(--gs-muted-2)]">
            MIT License · Public data sources attributed in-app
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-2">
          <a href="#method" className="gs-label hover:text-[var(--gs-ink)]">Methodology</a>
          <a href="#data" className="gs-label hover:text-[var(--gs-ink)]">Data / Provenance</a>
          <a href="https://github.com/ChimdumebiNebolisa/GridSignal" className="gs-label hover:text-[var(--gs-ink)]">
            GitHub
          </a>
          <a href="/api/counties" className="gs-label hover:text-[var(--gs-ink)]">Counties API</a>
        </nav>
      </div>
      <div className="border-t border-[var(--gs-border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="font-mono text-[10px] text-[var(--gs-muted-2)]">
            © 2026 GridSignal contributors
          </span>
          <Link href="/explore" className="font-mono text-[10px] text-[var(--gs-blue)] hover:underline">
            /explore →
          </Link>
        </div>
      </div>
    </footer>
  );
}
