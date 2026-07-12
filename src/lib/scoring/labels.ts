/**
 * GridSignal Texas — Priority label functions (v2)
 */

import type { BackupPriorityLabel, PlanningLabel } from "@/types/county";
import { PLANNING_LABEL_THRESHOLDS } from "@/types/scoring";

export function getPlanningLabel(score: number | null): PlanningLabel | null {
  if (score === null) return null;
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
/** Historical-only label helper; not used by active product consumers. */
export function getBackupPriorityLabel(score: number): BackupPriorityLabel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}
