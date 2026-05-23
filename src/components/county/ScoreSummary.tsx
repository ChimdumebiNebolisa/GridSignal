import type { BackupPriorityLabel } from "@/types/county";
import { getLabelDisplayText } from "@/lib/scoring/labels";
import { PRIORITY_COLORS } from "@/lib/map/colors";

type ScoreSummaryProps = {
  score: number;
  label: BackupPriorityLabel;
};

export function ScoreSummary({ score, label }: ScoreSummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Backup Priority
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-slate-900">{score}</span>
        <span className="text-lg text-slate-500">/100</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full border border-slate-300"
          style={{ backgroundColor: PRIORITY_COLORS[label] }}
          aria-hidden
        />
        <span className="text-base font-semibold text-slate-800">{label}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">{getLabelDisplayText(label)}</p>
    </div>
  );
}
