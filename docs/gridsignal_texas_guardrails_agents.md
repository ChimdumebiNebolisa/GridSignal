# GridSignal Texas Agent Guardrails

## Canonical model

Use separate structural resilience need and backup feasibility scores. Weather and statewide grid strain are operational context only. Do not reintroduce or expose the historical Backup Priority composite.

## Data integrity

- Do not fabricate indicators, provenance, source quality, timestamps, or utility boundaries.
- Do not silently convert null planning scores to 0 or 50.
- Preserve explicit missing, estimated, cached, stale, fallback, approximate, and unavailable states.
- Keep source vintage, limitations, and county coverage visible.

## Public claims

Describe results as public-data planning signals. Never claim outage prediction, guaranteed reliability, exact service territory, site-specific solar design, or professional advice.

## Security

Keep API keys server-side. Do not log secrets, auth headers, cookies, or full URLs containing credentials. Use bounded upstream timeouts.

## Change discipline

Preserve unrelated user changes, avoid unrelated refactors, run targeted checks first, then the full verification suite before publishing.
