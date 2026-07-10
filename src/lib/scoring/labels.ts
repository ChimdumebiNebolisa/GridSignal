/**
 * GridSignal Texas — Priority label functions (v2)
 */

import type { BackupPriorityLabel, PlanningLabel } from "@/types/county";
import { LABEL_THRESHOLDS, PLANNING_LABEL_THRESHOLDS } from "@/types/scoring";

export function getPlanningLabel(score: number | null): PlanningLabel {
  if (score === null) return "Moderate";
  if (score >= PLANNING_LABEL_THRESHOLDS.highest) return "Highest";
  if (score >= PLANNING_LABEL_THRESHOLDS.elevated) return "Elevated";
  if (score >= PLANNING_LABEL_THRESHOLDS.moderate) return "Moderate";
  return "Lower";
}

export function getPlanningLabelDisplayText(label: PlanningLabel): string {
  switch (label) {
    case "Lower":
      return "Lower structural planning priority";
    case "Moderate":
      return "Moderate structural planning priority";
    case "Elevated":
      return "Elevated structural planning priority";
    case "Highest":
      return "Highest structural planning priority";
  }
}

/** @deprecated Legacy label — retained for deprecated composite */
export function getBackupPriorityLabel(score: number): BackupPriorityLabel {
  if (score >= LABEL_THRESHOLDS.critical) return "Critical";
  if (score >= LABEL_THRESHOLDS.high) return "High";
  if (score >= LABEL_THRESHOLDS.medium) return "Medium";
  return "Low";
}

/** @deprecated */
export function getLabelDisplayText(label: BackupPriorityLabel): string {
  switch (label) {
    case "Low":
      return "Lower backup-planning priority";
    case "Medium":
      return "Moderate backup-planning priority";
    case "High":
      return "Elevated backup-planning priority";
    case "Critical":
      return "Highest backup-planning priority";
  }
}
