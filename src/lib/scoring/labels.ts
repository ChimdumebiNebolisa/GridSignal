/**
 * GridSignal Texas — Priority label function
 * Implements data contract §8 label thresholds.
 */

import type { BackupPriorityLabel } from "@/types/county";
import { LABEL_THRESHOLDS } from "@/types/scoring";

/**
 * Derive the backup priority label from a numeric score.
 * Thresholds: 0–39 Low, 40–59 Medium, 60–79 High, 80–100 Critical.
 */
export function getBackupPriorityLabel(score: number): BackupPriorityLabel {
  if (score >= LABEL_THRESHOLDS.critical) return "Critical";
  if (score >= LABEL_THRESHOLDS.high) return "High";
  if (score >= LABEL_THRESHOLDS.medium) return "Medium";
  return "Low";
}

/**
 * Human-friendly display language for each label.
 */
export function getLabelDisplayText(label: BackupPriorityLabel): string {
  switch (label) {
    case "Low": return "Lower backup-planning priority";
    case "Medium": return "Moderate backup-planning priority";
    case "High": return "Elevated backup-planning priority";
    case "Critical": return "Highest backup-planning priority";
  }
}
