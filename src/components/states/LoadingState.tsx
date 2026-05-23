type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = "Loading GridSignal Texas data...",
}: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 p-8 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
