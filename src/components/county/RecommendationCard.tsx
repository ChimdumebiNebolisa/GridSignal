type RecommendationCardProps = {
  recommendation: string;
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">Recommendation</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{recommendation}</p>
      <p className="mt-2 text-xs text-slate-500">
        Planning context only — not outage prediction, engineering, legal,
        financial, or investment advice.
      </p>
    </div>
  );
}
