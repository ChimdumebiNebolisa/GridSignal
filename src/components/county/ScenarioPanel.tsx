"use client";

import { useMemo, useState } from "react";
import type { StructuralNeedProfile } from "@/types/county";
import {
  computeScenarioScore,
  isCanonicalScenario,
} from "@/lib/scoring/scenario";

type ScenarioPanelProps = {
  structural: StructuralNeedProfile;
};

const COMPONENTS = [
  { key: "hazardExposure", label: "Hazard risk weight" },
  { key: "socialVulnerability", label: "Social vulnerability weight" },
] as const;

/**
 * Deterministic what-if exploration. Recomputes the published formula from
 * the SAME component values with user weights; never changes canonical
 * scores and is always labeled local/non-canonical.
 */
export function ScenarioPanel({ structural }: ScenarioPanelProps) {
  const [hazardWeight, setHazardWeight] = useState(1);
  const [socialWeight, setSocialWeight] = useState(1);
  const [outageOn, setOutageOn] = useState(false);

  const values = useMemo(
    () => ({
      hazardExposure: structural.components.hazardExposure.value,
      socialVulnerability: structural.components.socialVulnerability.value,
      outageBurden: outageOn ? structural.components.outageBurden.value : null,
    }),
    [structural, outageOn]
  );

  const scenario = useMemo(
    () =>
      computeScenarioScore(values, {
        hazardExposure: hazardWeight / 2,
        socialVulnerability: socialWeight / 2,
      }),
    [values, hazardWeight, socialWeight]
  );

  const canonical =
    isCanonicalScenario({
      hazardExposure: hazardWeight / 2,
      socialVulnerability: socialWeight / 2,
    }) && !outageOn;

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-slate-800">
        Weight scenario — local what-if
      </summary>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Recomputes the published equal-weight formula in your browser using this
        county&apos;s displayed components. Canonical scores never change.
      </p>
      <div className="mt-3 space-y-2">
        {COMPONENTS.map((c) => (
          <label key={c.key} className="block text-[11px] text-slate-600">
            <span className="flex justify-between">
              <span>{c.label}</span>
              <span className="font-mono">
                {(c.key === "hazardExposure" ? hazardWeight : socialWeight).toFixed(1)}×
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={c.key === "hazardExposure" ? hazardWeight : socialWeight}
              onChange={(e) =>
                c.key === "hazardExposure"
                  ? setHazardWeight(Number(e.target.value))
                  : setSocialWeight(Number(e.target.value))
              }
              className="mt-1 w-full accent-slate-700"
            />
          </label>
        ))}
        <label className="flex items-center gap-2 text-[11px] text-slate-600">
          <input
            type="checkbox"
            checked={outageOn}
            onChange={(e) => setOutageOn(e.target.checked)}
            disabled={structural.components.outageBurden.value === null}
            className="accent-slate-700"
          />
          Include outage-burden component{" "}
          {structural.components.outageBurden.value === null && (
            <span className="font-mono text-[10px] text-slate-400">(unavailable)</span>
          )}
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-700">Scenario score</span>
        <span className="font-mono text-sm font-bold tabular-nums" aria-live="polite">
          {scenario.score !== null ? `${scenario.score}/100` : "withheld"}
        </span>
      </div>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-slate-400">
        {canonical
          ? "Matches the canonical equal-weight configuration."
          : "Non-canonical scenario — for exploration only."}
      </p>
    </details>
  );
}

