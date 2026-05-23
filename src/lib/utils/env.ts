/**
 * Server-side environment variable accessors.
 * These must ONLY be used in server components or route handlers.
 * Never import this in client components.
 */

export function getNrelApiKey(): string | null {
  return process.env.NREL_API_KEY || null;
}

export function getEiaApiKey(): string | null {
  return process.env.EIA_API_KEY || null;
}

export function getCensusApiKey(): string | null {
  return process.env.CENSUS_API_KEY || null;
}

export function getErcotApiKey(): string | null {
  return process.env.ERCOT_API_KEY || null;
}

/**
 * Require an env var — throws if missing.
 * Use for keys that are absolutely required for a given API call.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Add it to .env.local (see .env.example for reference).`
    );
  }
  return value;
}
