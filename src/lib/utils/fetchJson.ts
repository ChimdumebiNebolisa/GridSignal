/**
 * Typed JSON fetch wrapper with timeout and error handling.
 * For use in server-side API clients only.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export async function fetchJson<T>(
  url: string,
  options?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: options?.headers,
    });

    if (!response.ok) {
      throw new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        url
      );
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    if (error instanceof FetchError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchError(`Request timed out after ${timeoutMs}ms`, undefined, url);
    }
    throw new FetchError(
      `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      url
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
