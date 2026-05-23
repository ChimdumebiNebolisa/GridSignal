import type { CountyEnergyProfile } from "@/types/county";
import { SCORE_WEIGHTS } from "@/types/scoring";

type ScoreBreakdownProps = {
  profile: CountyEnergyProfile;
};

const ROWS = [
  { key: "weatherRiskScore" as const, label: "Weather Risk", weight: SCORE_WEIGHTS.weatherRisk },
  { key: "solarPotentialScore" as const, label: "Solar Potential", weight: SCORE_WEIGHTS.solarPotential },
  { key: "demandExposureScore" as const, label: "Demand Exposure", weight: SCORE_WEIGHTS.demandExposure },
  {
    key: "statewideGridStrainScore" as const,
    label: "Statewide Grid Strain",
    weight: SCORE_WEIGHTS.statewideGridStrain,
  },
];

export function ScoreBreakdown({ profile }: ScoreBreakdownProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">Score Breakdown</h3>
      <ul className="space-y-2">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between rounded border border-slate-100 bg-white px-3 py-2 text-sm"
          >
            <span className="text-slate-700">
              {row.label}{" "}
              <span className="text-slate-400">({Math.round(row.weight * 100)}%)</span>
            </span>
            <span className="font-medium text-slate-900">
              {profile[row.key]}/100
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Final score = 0.30×weather + 0.25×solar + 0.25×demand + 0.20×grid
        (rounded).
      </p>
    </div>
  );
}
