"use client";

import type { CountyEnergyProfile } from "@/types/county";
import { ScoreSummary } from "./ScoreSummary";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { RecommendationCard } from "./RecommendationCard";
import { DataQualityBadge } from "./DataQualityBadge";
import { ReportActions } from "./ReportActions";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";

type CountySidePanelProps = {
  profile: CountyEnergyProfile | null;
  loading: boolean;
  error: string | null;
};

export function CountySidePanel({ profile, loading, error }: CountySidePanelProps) {
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
        <EmptyState message="Click a Texas county on the map to view backup-planning priority, score breakdown, and data quality." />
      </div>
    );
  }

  const utilityText =
    profile.likelyUtilityTerritories.length > 0
      ? profile.likelyUtilityTerritories.join(", ")
      : "Unknown";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{profile.countyName}</h2>
        <p className="text-xs text-slate-500">FIPS {profile.countyFips} · Texas</p>
      </div>

      <ScoreSummary
        score={profile.backupPriorityScore}
        label={profile.backupPriorityLabel}
      />

      <p className="text-sm text-slate-700">{profile.scoreExplanation.finalSummary}</p>

      <ScoreBreakdown profile={profile} />

      <RecommendationCard recommendation={profile.recommendation} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Utility Context</h3>
        <p className="text-sm text-slate-700">
          Likely utility/service territory: <strong>{utilityText}</strong>
        </p>
        <p className="text-xs text-slate-500">
          Informational context only — not a legal service-territory determination.
          Does not affect the Backup Priority Score.
        </p>
        {profile.gridRegion !== "Unknown" && (
          <p className="text-xs text-slate-500">Grid region: {profile.gridRegion}</p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Data Quality</h3>
        <DataQualityBadge quality={profile.dataQuality.weather} label="Weather" />
        <DataQualityBadge quality={profile.dataQuality.solar} label="Solar" />
        <DataQualityBadge quality={profile.dataQuality.demand} label="Population" />
        <DataQualityBadge quality={profile.dataQuality.grid} label="Grid strain" />
        <DataQualityBadge quality={profile.dataQuality.utility} label="Utility context" />
      </div>

      <p className="text-xs text-slate-500">
        Last updated: {new Date(profile.lastUpdated).toLocaleString("en-US", {
          timeZone: "UTC",
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        UTC
      </p>

      <ReportActions profile={profile} />

      <p className="text-xs leading-relaxed text-slate-500 border-t border-slate-100 pt-3">
        GridSignal Texas estimates backup energy planning priority using public data.
        It does not predict outages, determine exact utility reliability, or provide
        legal, engineering, investment, or energy advice.
      </p>
    </div>
  );
}
