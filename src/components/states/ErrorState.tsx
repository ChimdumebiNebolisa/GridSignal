type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-center"
      role="alert"
    >
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900"
        >
          Try again
        </button>
      )}
    </div>
  );
}
