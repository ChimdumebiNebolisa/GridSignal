import Link from "next/link";

const LINKS = [
  { href: "#method", label: "Method" },
  { href: "#signals", label: "County signals" },
  { href: "#data", label: "Data" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-[900] border-b border-[#22304a] bg-[var(--gs-ink)]">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-baseline gap-2 text-white">
          <span className="text-sm font-semibold tracking-tight">GridSignal</span>
          <span className="gs-label !text-[var(--gs-muted-2)]">Texas</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="gs-label px-3 py-3 !text-[var(--gs-on-dark-muted)] transition-colors hover:!text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/explore"
            className="gs-label px-3 py-3 !text-[var(--gs-on-dark-muted)] transition-colors hover:!text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Explore
          </Link>
        </nav>
        <Link
          href="/explore"
          className="gs-btn-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          EXPLORE TEXAS
        </Link>
      </div>
    </header>
  );
}
