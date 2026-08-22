export function DataSourceFooter() {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
      <p>
        Data sources: bundled{" "}
        <strong>synthetic planning proxies</strong> for hazard exposure, social
        vulnerability, outage burden, and solar resource (deterministic
        placeholders pending authoritative FEMA NRI, CDC/ATSDR SVI, DOE EAGLE-I,
        and NREL PVWatts ingest — labeled &quot;Estimated&quot; throughout);
        Open-Meteo (weather stress), EIA ERCO (statewide load context), U.S.
        Census (population context), static utility lookup. Values may be live,
        cached, estimated, stale, fallback, or unavailable.
      </p>
      <p className="mt-1 text-slate-500">
        GridSignal Texas presents structural resilience need and backup
        feasibility using public data. It does not predict outages, determine
        exact utility reliability, or provide legal, engineering, investment, or
        energy advice.
      </p>
    </footer>
  );
}
