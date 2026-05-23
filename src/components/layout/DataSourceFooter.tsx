export function DataSourceFooter() {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
      <p>
        Data sources: Open-Meteo (weather), NREL PVWatts (solar), U.S. Census
        (population), EIA Hourly Electric Grid Monitor (ERCO grid strain), PUCT
        / static lookup (utility context). Values may be live, cached, or
        estimated.
      </p>
      <p className="mt-1 text-slate-500">
        GridSignal Texas estimates backup energy planning priority using public
        data. It does not predict outages, determine exact utility reliability,
        or provide legal, engineering, investment, or energy advice.
      </p>
    </footer>
  );
}
