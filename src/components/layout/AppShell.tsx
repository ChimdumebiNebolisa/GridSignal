import type { ReactNode } from "react";
import { Header } from "./Header";
import { DataSourceFooter } from "./DataSourceFooter";

type AppShellProps = {
  mapArea: ReactNode;
  sidePanel: ReactNode;
};

export function AppShell({ mapArea, sidePanel }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <a
        href="#explorer-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[1100] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to explorer
      </a>
      <Header />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main id="explorer-main" className="relative min-h-0 flex-1">{mapArea}</main>
        <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:w-[400px] lg:border-t-0 lg:border-l">
          {sidePanel}
        </aside>
      </div>
      <DataSourceFooter />
    </div>
  );
}
