import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <div className="gs-grid-bg relative overflow-hidden rounded-md bg-[var(--gs-ink)] px-6 py-16 text-center md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight text-white md:text-5xl">
            Explore resilience signals across Texas.
          </h2>
          <p className="mx-auto mt-4 max-w-[640px] text-sm leading-relaxed text-[#9fb0c8]">
            The explorer covers all 254 counties with structural need components,
            backup feasibility, current context, and data-quality information on
            every value.
          </p>
          <Link
            href="/explore"
            className="gs-btn-primary mt-8 !bg-white !text-[var(--gs-ink)] hover:!bg-[var(--gs-blue-soft)]"
          >
            EXPLORE ALL COUNTIES →
          </Link>
        </div>
      </div>
    </section>
  );
}
