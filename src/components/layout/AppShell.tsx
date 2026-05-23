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
      <Header />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-0 flex-1">{mapArea}</main>
        <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:w-[400px] lg:border-t-0 lg:border-l">
          {sidePanel}
        </aside>
      </div>
      <DataSourceFooter />
    </div>
  );
}
