import type { MapCountySummary } from "@/types/county";
import { QUADRANT_LABELS, matrixPosition } from "@/lib/map/matrix";

type MatrixPoint = {
  fips: string;
  name: string;
  x: number;
  y: number;
  quadrant: string;
};

/**
 * Restrained CSS 2x2 matrix. Counties are plotted only when BOTH axis values
 * exist; withheld/unavailable values render as an explicit state, never a
 * fabricated position.
 */
export function NeedFeasibilityMatrix({
  summaries,
  heroFips,
}: {
  summaries: MapCountySummary[];
  heroFips: string;
}) {
  const plotted: MatrixPoint[] = [];
  const withheld: string[] = [];

  for (const s of summaries) {
    const pos = matrixPosition(s.structuralNeedScore, s.feasibilityScore);
    if (!pos.plottable) {
      withheld.push(s.countyName);
      continue;
    }
    plotted.push({
      fips: s.countyFips,
      name: s.countyName,
      x: pos.x,
      y: pos.y,
      quadrant: pos.quadrant,
    });
  }

  // Disclosed selection rule: the hero county plus one extreme per quadrant.
  const byQuadrant = new Map<string, MatrixPoint>();
  for (const p of plotted) {
    if (p.fips === heroFips) continue;
    if (!byQuadrant.has(p.quadrant)) byQuadrant.set(p.quadrant, p);
  }
  const hero = plotted.find((p) => p.fips === heroFips);
  const shown = [...(hero ? [hero] : []), ...byQuadrant.values()].slice(0, 6);

  return (
    <div className="gs-frame overflow-hidden">
      <div className="border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] px-4 py-2">
        <span className="font-mono text-xs font-semibold">NEED VS FEASIBILITY MATRIX</span>
      </div>
      <div className="p-4">
        <div className="relative mx-auto aspect-square w-full max-w-[420px] rounded-sm border border-[var(--gs-border-strong)] bg-white">
          {/* quadrant grid */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {(Object.keys(QUADRANT_LABELS) as Array<keyof typeof QUADRANT_LABELS>).map((k) => (
              <div key={k} className="border border-dashed border-[var(--gs-grid-line)] p-1.5">
                <span className="font-mono text-[9px] leading-tight text-[var(--gs-muted-2)]">
                  {QUADRANT_LABELS[k]}
                </span>
              </div>
            ))}
          </div>
          {/* midlines */}
          <div aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-[var(--gs-border-strong)]" />
          <div aria-hidden className="absolute left-0 top-1/2 h-px w-full bg-[var(--gs-border-strong)]" />
          {/* axis labels */}
          <span className="absolute -left-2 top-1/2 hidden -rotate-90 font-mono text-[10px] tracking-widest text-[var(--gs-muted)] md:block">
            STRUCTURAL NEED →
          </span>
          <span className="absolute bottom-[-22px] left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
            BACKUP FEASIBILITY →
          </span>
          {/* points */}
          {shown.map((p, i) => (
            <div
              key={p.fips}
              className={`absolute z-10 -translate-x-1/2 translate-y-1/2 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] ${
                p.fips === heroFips
                  ? "border-[var(--gs-blue)] bg-[var(--gs-blue)] text-white"
                  : "border-[var(--gs-border-strong)] bg-white text-[var(--gs-ink)]"
              }`}
              style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
            >
              {p.name.replace(" County", "")}
              <span className="sr-only"> — {QUADRANT_LABELS[p.quadrant as keyof typeof QUADRANT_LABELS]}</span>
              <span aria-hidden className="ml-1 opacity-60">{i === 0 && p.fips === heroFips ? "★" : ""}</span>
            </div>
          ))}
        </div>

        {withheld.length > 0 && (
          <p className="mt-8 font-mono text-[11px] leading-relaxed text-[var(--gs-muted)]">
            Not plotted: {withheld.length === 254 ? "all counties" : `${withheld.length} counties`} — at least one axis value is withheld or unavailable for these counties (currently: structural ordinal rankings withheld by sensitivity gate). No positions are fabricated.
          </p>
        )}
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-[var(--gs-muted-2)]">
          Shown: highlighted hero county plus one example per occupied quadrant. The matrix describes the two separate planning axes; it is not a predictive model and never combines them into one score.
        </p>
      </div>
    </div>
  );
}
