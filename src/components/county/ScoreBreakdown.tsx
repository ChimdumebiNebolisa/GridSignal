import type { CountyEnergyProfile } from "@/types/county";

type ScoreBreakdownProps = {
  profile: CountyEnergyProfile;
};

function ComponentRow({
  label,
  value,
  source,
  imputed,
}: {
  label: string;
  value: number | null;
  source: string;
  imputed?: boolean;
}) {
  return (
    <li className="rounded border border-slate-100 bg-white px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">
          {value !== null ? `${value}/100` : "Unavailable"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Source: {source}
        {imputed ? " (imputed)" : ""}
      </p>
    </li>
  );
}

export function ScoreBreakdown({ profile }: ScoreBreakdownProps) {
  const { structuralNeed, feasibility, operationalContext } = profile;
  const { hazardExposure, socialVulnerability, outageBurden } =
    structuralNeed.components;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Structural Resilience Need
        </h3>
        <ul className="space-y-2">
          <ComponentRow
            label="Hazard exposure"
            value={hazardExposure.value}
            source={hazardExposure.source}
            imputed={hazardExposure.imputed}
          />
          <ComponentRow
            label="Social vulnerability"
            value={socialVulnerability.value}
            source={socialVulnerability.source}
            imputed={socialVulnerability.imputed}
          />
          <ComponentRow
            label="Outage burden"
            value={outageBurden.value}
            source={outageBurden.source}
            imputed={outageBurden.imputed}
          />
        </ul>
        {structuralNeed.missingComponents.length > 0 && (
          <p className="text-xs text-amber-700">
            Missing: {structuralNeed.missingComponents.join(", ")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Backup Feasibility</h3>
        <ul className="space-y-2">
          <ComponentRow
            label="Solar resource"
            value={feasibility.components.solarResource.value}
            source={feasibility.components.solarResource.source}
            imputed={feasibility.components.solarResource.imputed}
          />
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Current Conditions</h3>
        <ul className="space-y-2">
          <ComponentRow
            label="Weather stress"
            value={operationalContext.weatherStressScore}
            source="open_meteo"
          />
          <ComponentRow
            label="Statewide grid load context"
            value={operationalContext.statewideGridStrainScore}
            source="eia_grid_monitor"
          />
        </ul>
        <p className="text-xs text-slate-500">{operationalContext.limitation}</p>
      </div>
    </div>
  );
}
