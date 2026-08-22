"use client";

import type { CountyEnergyProfile } from "@/types/county";
import { IndicatorSummary } from "./ScoreSummary";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ScenarioPanel } from "./ScenarioPanel";
import { RecommendationCard } from "./RecommendationCard";
import { DataQualityBadge } from "./DataQualityBadge";
import { ReportActions } from "./ReportActions";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";

type CountySidePanelProps = {
  profile: CountyEnergyProfile | null;
  loading: boolean;
  error: string | null;
  dataManifestVersion?: string;
};

export function CountySidePanel({
  profile,
  loading,
  error,
  dataManifestVersion,
}: CountySidePanelProps) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <LoadingState message="Loading county profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <EmptyState message={error} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <EmptyState message="Click a Texas county to view structural resilience need, backup feasibility, current conditions, and data provenance." />
      </div>
    );
  }

  const utilityText =
    profile.likelyUtilityTerritories.length > 0
      ? profile.likelyUtilityTerritories.join(", ")
      : "Unknown";

  const manifestVersion = dataManifestVersion ?? profile.dataManifestVersion;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{profile.countyName}</h2>
        <p className="text-xs text-slate-500">
          FIPS {profile.countyFips} · Texas · Data schema {manifestVersion}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <IndicatorSummary
          title="Structural Resilience Need"
          score={profile.structuralNeed.score}
          label={profile.structuralNeed.label}
          noScoreReason={profile.structuralNeed.noScoreReason}
        />
        <IndicatorSummary
          title="Backup Feasibility"
          score={profile.feasibility.score}
          label={profile.feasibility.label}
          noScoreReason={profile.feasibility.noScoreReason}
        />
      </div>

      <ScoreBreakdown profile={profile} />

      <ScenarioPanel structural={profile.structuralNeed} />

      <RecommendationCard recommendation={profile.recommendation} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Utility Context</h3>
        <p className="text-sm text-slate-700">
          Likely utility/service territory: <strong>{utilityText}</strong>
        </p>
        <p className="text-xs text-slate-500">
          Informational context only — not a legal service-territory determination.
          Does not affect scores.
        </p>
        {profile.gridRegion !== "Unknown" && (
          <p className="text-xs text-slate-500">Grid region: {profile.gridRegion}</p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Data Quality</h3>
        <DataQualityBadge quality={profile.dataQuality.overall} label="Overall (scores)" />
        <DataQualityBadge quality={profile.dataQuality.structuralNeed} label="Structural need" />
        <DataQualityBadge quality={profile.dataQuality.feasibility} label="Feasibility" />
        <DataQualityBadge quality={profile.dataQuality.operational} label="Operational" />
        <DataQualityBadge quality={profile.dataQuality.contextQuality} label="Utility context" />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Source Notes</h3>
        <ul className="space-y-2">
          {profile.sourceStatus.map((status) => (
            <li
              key={status.source}
              className="rounded border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{status.sourceName}</span>
                <span className="capitalize text-slate-500">{status.quality}</span>
              </div>
              <p className="mt-1">{status.message}</p>
              <p className="mt-1 text-slate-500">{status.limitation}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500">
        Data oldest source:{" "}
        {new Date(profile.lastUpdated).toLocaleString("en-US", {
          timeZone: "UTC",
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        UTC · Assembled{" "}
        {new Date(profile.profileAssembledAt).toLocaleString("en-US", {
          timeZone: "UTC",
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        UTC
      </p>

      <ReportActions profile={profile} />

      <p className="text-xs leading-relaxed text-slate-500 border-t border-slate-100 pt-3">
        GridSignal Texas presents structural resilience need and backup feasibility
        using public data. It does not predict outages, determine exact utility
        reliability, or provide legal, engineering, investment, or energy advice.
      </p>
    </div>
  );
}
