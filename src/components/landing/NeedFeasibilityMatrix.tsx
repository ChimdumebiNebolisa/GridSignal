import type { MapCountySummary } from "@/types/county";
import { QUADRANT_LABELS, matrixPosition } from "@/lib/map/matrix";

type MatrixPoint = {
  fips: string;
  name: string;
  x: number;
  y: number;
  quadrant: string;
};

const QUADRANT_KEYS = Object.keys(QUADRANT_LABELS) as Array<keyof typeof QUADRANT_LABELS>;

/**
 * Restrained CSS 2x2 matrix. Counties are plotted only when BOTH axis values
 * exist; withheld/unavailable values render as an explicit in-frame state,
 * never a fabricated position.
 */
export function NeedFeasibilityMatrix({
  summaries,
  heroFips,
}: {
  summaries: MapCountySummary[];
  heroFips: string;
}) {
  const plotted: MatrixPoint[] = [];
  let withheldCount = 0;

  for (const s of summaries) {
    const pos = matrixPosition(s.structuralNeedScore, s.feasibilityScore);
    if (!pos.plottable) {
      withheldCount++;
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

  // Disclosed selection rule: hero county plus one example per occupied quadrant.
  const byQuadrant = new Map<string, MatrixPoint>();
  for (const p of plotted) {
    if (p.fips === heroFips) continue;
    if (!byQuadrant.has(p.quadrant)) byQuadrant.set(p.quadrant, p);
  }
  const hero = plotted.find((p) => p.fips === heroFips);
  const shown = [...(hero ? [hero] : []), ...byQuadrant.values()].slice(0, 6);
  const isEmpty = shown.length === 0;

  return (
    <div className="gs-frame overflow-hidden">
      <div className="border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] px-4 py-2">
        <span className="font-mono text-xs font-semibold">NEED VS FEASIBILITY MATRIX</span>
      </div>

      <div className="p-4 pb-5 md:p-6 md:pb-7">
        {/* Chart layout: y-axis label lives in its own gutter so it can never
            collide with quadrant text. */}
        <div className="mx-auto flex w-full max-w-[420px] gap-2">
          <div className="relative w-5 shrink-0" aria-hidden>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
              STRUCTURAL NEED →
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`relative rounded-sm border border-[var(--gs-border-strong)] bg-white ${
                isEmpty ? "h-56 md:h-64" : "aspect-square w-full"
              }`}
            >
              {/* quadrant scaffolding */}
              {!isEmpty && (
                <>
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {QUADRANT_KEYS.map((k) => (
                      <div key={k} className="border border-dashed border-[var(--gs-grid-line)] p-1.5">
                        <span className="font-mono text-[9px] leading-tight text-[var(--gs-muted-2)]">
                          {QUADRANT_LABELS[k]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-[var(--gs-border-strong)]" />
                  <div aria-hidden className="absolute left-0 top-1/2 h-px w-full bg-[var(--gs-border-strong)]" />
                </>
              )}

              {isEmpty ? (
                /* Withheld state: explicit, in-frame, no fabricated positions */
                <div className="flex h-full items-center justify-center p-4">
                  <div className="max-w-[320px] rounded-sm border border-dashed border-[var(--gs-border-strong)] bg-[var(--gs-canvas)] px-4 py-5 text-center">
                    <p className="font-mono text-[10px] tracking-widest text-[var(--gs-warning)]">
                      NO COUNTIES PLOTTED
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--gs-muted)]">
                      Structural ordinal rankings are currently withheld by the
                      sensitivity gate, so one required axis value is missing
                      for every county. Positions are never fabricated.
                    </p>
                  </div>
                </div>
              ) : (
                shown.map((p) => (
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
                    {p.fips === heroFips && (
                      <span className="sr-only"> (highlighted hero county)</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
              BACKUP FEASIBILITY →
            </p>
            <p className="mt-1 text-center text-[10px] leading-relaxed text-[var(--gs-muted-2)]">
              Quadrants read against each scale&apos;s midpoint; higher need rises upward.
            </p>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[440px] text-center font-mono text-[10px] leading-relaxed text-[var(--gs-muted-2)]">
          {isEmpty
            ? `All ${withheldCount} counties unplotable right now.`
            : `Shown: highlighted hero county plus one example per occupied quadrant. ${withheldCount > 0 ? `${withheldCount} counties lack both axis values.` : ""}`}
          {" "}
          The matrix describes two separate planning axes; it is not a predictive model and never combines them into one score.
        </p>
      </div>
    </div>
  );
}
