export function FallbackNotice() {
  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      role="status"
    >
      Some live data is unavailable. Showing cached or estimated values where
      available.
    </div>
  );
}
