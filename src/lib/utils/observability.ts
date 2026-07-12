export function logRouteMetric(
  route: string,
  startedAt: number,
  fields: Record<string, string | number | boolean> = {}
) {
  console.info(
    JSON.stringify({
      event: "gridsignal.route",
      route,
      durationMs: Date.now() - startedAt,
      ...fields,
    })
  );
}
