import type { MapCountySummary } from "@/types/county";
import { QUADRANT_LABELS, matrixPosition } from "@/lib/map/matrix";

type MatrixPoint = {
  key: string;
  name: string;
  x: number;
  y: number;
  quadrant?: string;
  illustrative?: boolean;
};

const QUADRANT_KEYS = Object.keys(QUADRANT_LABELS) as Array<keyof typeof QUADRANT_LABELS>;

/** Fictional demonstration points; never presented as measured counties. */
const DEMO_POINTS: MatrixPoint[] = [
  { key: "demo-a", name: "Example A", x: 78, y: 76, illustrative: true },
  { key: "demo-b", name: "Example B", x: 24, y: 68, illustrative: true },
  { key: "demo-c", name: "Example C", x: 72, y: 28, illustrative: true },
  { key: "demo-d", name: "Example D", x: 22, y: 22, illustrative: true },
];

function QuadrantScaffolding() {
  return (
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
  );
}

function PointChip({ p }: { p: MatrixPoint }) {
  return (
    <div
      className={`absolute z-10 -translate-x-1/2 translate-y-1/2 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[9px] ${
        p.illustrative
          ? "border-dashed border-[var(--gs-warning)] bg-[var(--gs-warning-bg)] text-[var(--gs-warning)]"
          : "border-[var(--gs-blue)] bg-[var(--gs-blue)] text-white"
      }`}
      style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
    >
      [{p.name}]
      {!p.illustrative && <span className="sr-only"> (live county value)</span>}
    </div>
  );
}

function AxisFrame({ children, tall }: { children: React.ReactNode; tall: boolean }) {
  return (
    <div
      className={`relative rounded-sm border border-[var(--gs-border-strong)] bg-white ${
        tall ? "aspect-square w-full" : "h-52 md:h-60"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Restrained CSS 2x2 matrix. Real counties are plotted only when BOTH axis
 * values exist. When rankings are gated, an explicitly-badged ILLUSTRATIVE
 * demo (fictional [Example] chips, dashed styling) shows how the matrix
 * reads, clearly separated from any live data, never fabricated into it.
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
      key: s.countyFips,
      name: s.countyName,
      x: pos.x,
      y: pos.y,
      quadrant: pos.quadrant,
    });
  }

  const byQuadrant = new Map<string, MatrixPoint>();
  for (const p of plotted) {
    if (p.key === heroFips) continue;
    if (!byQuadrant.has(p.quadrant!)) byQuadrant.set(p.quadrant!, p);
  }
  const hero = plotted.find((p) => p.key === heroFips);
  const shown: MatrixPoint[] = [...(hero ? [hero] : []), ...byQuadrant.values()].slice(0, 6);
  const isGated = shown.length === 0;

  return (
    <div className="gs-frame overflow-hidden">
      <div className="border-b border-[var(--gs-border)] bg-[var(--gs-canvas)] px-4 py-2">
        <span className="font-mono text-xs font-semibold">NEED VS FEASIBILITY MATRIX</span>
      </div>

      <div className="space-y-5 p-4 pb-5 md:p-6 md:pb-7">
        {/* ---------- Live matrix (only when real counties can be placed) ---------- */}
        {!isGated && (
          <div>
            <p className="mb-2 gs-label">Live view</p>
            <div className="mx-auto flex w-full max-w-[420px] gap-2">
              <div className="relative w-5 shrink-0" aria-hidden>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
                  STRUCTURAL NEED →
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <AxisFrame tall>
                  <QuadrantScaffolding />
                  {shown.map((p) => (
                    <PointChip key={p.key} p={p} />
                  ))}
                </AxisFrame>
                <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
                  BACKUP FEASIBILITY →
                </p>
              </div>
            </div>
            {withheldCount > 0 && (
              <p className="mt-3 text-center font-mono text-[10px] text-[var(--gs-muted-2)]">
                {withheldCount} counties lack both axis values and are not placed.
              </p>
            )}
          </div>
        )}

        {/* ---------- Illustrative demo (gated bundles only) ---------- */}
        {isGated && (
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="gs-label !text-[var(--gs-warning)]">Illustrative example</p>
              <span className="rounded-sm border border-[#ead79c] bg-[var(--gs-warning-bg)] px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-[var(--gs-warning)]">
                FICTIONAL [BRACKETED] VALUES · NOT MEASURED DATA
              </span>
            </div>
            <div className="mx-auto flex w-full max-w-[420px] gap-2">
              <div className="relative w-5 shrink-0" aria-hidden>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
                  STRUCTURAL NEED →
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative aspect-square w-full rounded-sm border border-dashed border-[var(--gs-border-strong)] bg-white">
                  <QuadrantScaffolding />
                  {DEMO_POINTS.map((p) => (
                    <PointChip key={p.key} p={p} />
                  ))}
                </div>
                <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-[var(--gs-muted)]">
                  BACKUP FEASIBILITY →
                </p>
              </div>
            </div>
            <p className="mx-auto mt-3 max-w-[440px] text-center font-mono text-[10px] leading-relaxed text-[var(--gs-muted-2)]">
              Live county chips will replace this demo once the sensitivity
              gate passes. Every point here is fictional and bracketed; no
              real county position is implied.
            </p>
          </div>
        )}

        <p className="mx-auto max-w-[440px] text-center font-mono text-[10px] leading-relaxed text-[var(--gs-muted-2)]">
          The matrix describes two separate planning axes against each scale&apos;s
          midpoint; it is not a predictive model and never combines them into one score.
        </p>
      </div>
    </div>
  );
}
