# AGENTS.md

## 1. Product boundaries

GridSignal Texas is a Texas-only county-level interactive energy map.

The app must do exactly this:
- Show Texas counties on an interactive map.
- Color counties by Backup Priority Score.
- Let users click a county and see score inputs, explanation, recommendation, utility/service territory context, and data quality.
- Let users search by county, city, or ZIP code when reliable lookup data exists.
- Let users copy or export a plain county report.
- Use deterministic scoring only.

The app must not become:
- A national grid map.
- An outage predictor.
- A utility billing calculator.
- A chatbot.
- A user account product.
- A paid SaaS product.
- A power-line, substation, or transmission reliability explorer.
- An investment, legal, or engineering advice tool.
- An InfraMap clone.
- An ERCOT dashboard clone.

Working agreements:
- Think before coding.
- Turn the request into a concrete goal before coding.
- State assumptions explicitly.
- If something is unclear, say what is unclear instead of guessing.
- If multiple valid interpretations exist, present them instead of choosing silently.
- Prefer the simplest approach that fully solves the fixed scope.
- Push back on unnecessary complexity.
- Do not add features beyond the fixed scope.

## 2. Data honesty rules

All displayed data must be traceable to a visible source, static file, API response, cache, or deterministic fallback.

Rules:
- Do not invent county values.
- Do not fabricate utility names.
- Do not fabricate API responses.
- Do not present placeholder data as real data.
- Do not claim county-level grid precision if the grid source is statewide, regional, balancing-authority-level, or estimated.
- Utility/service territory is context only. It must not directly affect the Backup Priority Score unless reliable utility-level reliability data exists.
- If an API fails, show fallback data only when the fallback is defined in the data contract.
- Fallback data must be labeled as estimated, cached, unavailable, or fallback.
- All scores must be explainable from their component inputs.
- Every county detail panel must expose the score breakdown.

Data quality labels:
- Live: fetched from an external API during the current request or current cache window.
- Cached: loaded from stored data that was previously fetched or bundled.
- Estimated: derived from proxy, fallback, centroid, statewide, or regional data.
- Unavailable: no reliable value exists.

Required wording for estimated data:
- "Estimated from public data."
- "Statewide grid signal mapped to county view."
- "Likely utility/service territory."
- "Not a legal service-territory determination."

## 3. API and secret handling rules

API keys and credentials must stay server-side.

Rules:
- Never commit `.env.local`.
- Never commit real API keys, tokens, usernames, passwords, cookies, or session data.
- Create `.env.example` with placeholder variable names only.
- Read secrets from environment variables only.
- Do not expose secrets to client components.
- Do not log API keys, full request URLs containing keys, auth headers, cookies, or secrets.
- Do not add paid APIs.
- Do not require a credit card for the app to work.
- Do not bypass CAPTCHA, MFA, email verification, provider terms, or access controls.
- If provider signup, account approval, CAPTCHA, MFA, or key creation is required, stop and ask the user to complete that step.

Allowed APIs:
- Open-Meteo for weather.
- NREL PVWatts for solar potential.
- Census API or static cached Census data for population.
- EIA Hourly Electric Grid Monitor or ERCOT public data for statewide or balancing-authority grid strain.
- PUCT public maps or a static lookup table for utility/service territory context.

Required environment variables:
- `NREL_API_KEY`
- `EIA_API_KEY`
- `CENSUS_API_KEY`
- `ERCOT_API_KEY` or documented ERCOT auth variables if used

Optional command before implementation:
```bash
npx skills add https://github.com/raroque/vibe-security-skill --skill vibe-security
```

## 4. Scoring rules

The scoring formula is fixed.

Backup Priority Score:

```text
0.30(weather risk)
+ 0.25(solar potential)
+ 0.25(demand exposure)
+ 0.20(statewide grid strain)
```

Rules:
- Each component score must normalize to 0 to 100.
- The final score must normalize to 0 to 100.
- Use deterministic functions only.
- Do not use AI to assign or explain numeric scores.
- Do not change weights unless the user explicitly changes the data contract.
- Do not add utility/service territory into the score unless reliable utility-level reliability data exists and the user explicitly approves changing the scoring model.
- Do not let statewide grid strain dominate county differences.
- If statewide grid strain is unavailable, use the defined fallback and mark the value as estimated or unavailable.
- If a component is unavailable, follow the data contract fallback rule. Do not silently substitute unrelated values.
- Keep scoring logic isolated in a testable module.

Score labels:
- 0 to 39: Low
- 40 to 59: Medium
- 60 to 79: High
- 80 to 100: Critical

The app may say:
- "Backup planning priority."
- "Higher priority based on public data signals."
- "Score reflects weather, solar, demand, and statewide grid strain inputs."

The app must not say:
- "Outage risk score."
- "This county will lose power."
- "This predicts blackouts."
- "This utility is unreliable."
- "This area has weak grid reliability."

## 5. UI wording rules

The UI must be precise and avoid fake certainty.

Avoid these phrases:
- "Outage prediction"
- "Blackout prediction"
- "Failure probability"
- "Grid failure risk"
- "This county will lose power"
- "This area is unsafe"
- "This utility is unreliable"
- "Guaranteed backup savings"
- "Investment recommendation"
- "Engineering recommendation"
- "Legal determination"
- "Official service territory"
- "Exact utility boundary"
- "Exact household risk"
- "Substation reliability"
- "Transmission reliability"

Use these safer replacements:
- "Backup Priority Score"
- "Backup planning priority"
- "Estimated from public data"
- "Likely utility/service territory"
- "Public grid signal"
- "Statewide grid strain"
- "County-level planning view"
- "Recommendation for planning context only"
- "Not outage prediction"
- "Not engineering, legal, financial, or investment advice"
- "Service territory context is informational"
- "Data quality: live, cached, estimated, or unavailable"

Required disclaimers:
- "GridSignal Texas is a planning tool based on public and estimated data. It does not predict outages."
- "Utility/service territory is shown as context only and may not reflect legal service boundaries."
- "Scores are deterministic estimates, not professional engineering, legal, financial, or investment advice."

Tone rules:
- Serious and clear.
- No hype.
- No fear-based wording.
- No claim of official authority.
- No fake precision.

## 6. Code quality rules

Implementation rules:
- Write the minimum code necessary.
- Do not add abstractions, configurability, or flexibility unless required by the fixed scope.
- Do not refactor unrelated code.
- Do not clean up adjacent code, comments, or formatting unless the task requires it.
- Match existing style and local conventions.
- Remove only the unused imports, variables, or functions that your own changes made obsolete.
- If unrelated dead code or design issues are noticed, mention them instead of changing them.
- Keep server-only API logic separate from client UI logic.
- Keep scoring logic isolated and testable.
- Keep data normalization functions isolated and testable.
- Keep static data files readable and documented.
- Use TypeScript types for county profiles, score inputs, score outputs, data quality, and API responses.
- Prefer simple JSON files for cached/static county data.
- Do not add a database unless the user explicitly approves it.
- Do not add authentication.
- Do not add payments.
- Do not add analytics tracking unless explicitly requested.

Preferred structure:
- `src/app` for Next.js routes and pages.
- `src/components` for UI components.
- `src/lib` for scoring, normalization, API clients, caching, and utilities.
- `src/types` for TypeScript types.
- `src/data` or `public/data` for static county GeoJSON and cached metadata.
- `docs` for PRD, data contract, design spec, architecture, guardrails, and build plan.

## 7. Testing rules

Verification rules:
- Never claim success without verification.
- Use the narrowest reasonable check.
- For bug fixes, reproduce the issue before confirming the fix when possible.
- For refactors, confirm behavior is unchanged.
- If something could not be verified, say that explicitly.
- Do not hide failed tests, build errors, type errors, API errors, or missing data.

Required checks before claiming done:
- Install dependencies successfully.
- Typecheck passes.
- Lint passes if configured.
- Build passes.
- App runs locally.
- Texas county map renders.
- County click opens side panel.
- Score breakdown renders.
- Score labels match thresholds.
- API keys are not exposed client-side.
- `.env.local` is ignored.
- `.env.example` exists with placeholders only.
- External API failure states render honestly.
- At least one county can show live, cached, estimated, or unavailable data labels.
- README explains setup, data sources, scoring, limitations, and how to run.

Recommended commands:
```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

If a command is unavailable because the project does not define it, either add the appropriate script or state why the check is not available.

## 8. Forbidden changes

Do not make these changes:
- Do not expand beyond Texas.
- Do not add national support.
- Do not add accounts.
- Do not add payments.
- Do not add a chatbot.
- Do not add AI-generated county explanations.
- Do not add outage prediction.
- Do not add emergency alert functionality.
- Do not add utility bill estimates.
- Do not add household-level risk scoring.
- Do not add parcel-level solar analysis.
- Do not add exact substation or transmission-line reliability claims.
- Do not add real-time outage tracking unless the user explicitly approves a reliable public source and rewrites the product scope.
- Do not add a future roadmap inside the app.
- Do not add features only because they seem impressive.
- Do not change the scoring formula.
- Do not make utility/service territory a score input.
- Do not commit secrets.
- Do not use paid APIs.
- Do not present generated filler as verified data.
- Do not silently replace missing API data with unrelated proxy data.

## 9. Stop conditions

Stop and ask for user input when:
- An API provider requires account creation, CAPTCHA, MFA, email verification, legal terms acceptance, or payment information.
- A required API key is missing.
- A required data source is unavailable and no fallback is defined.
- A data source conflicts with the data contract.
- A requested feature conflicts with the fixed product scope.
- A change would require adding accounts, payments, a database, national support, or outage prediction.
- The scoring formula would need to change.
- Utility/service territory data cannot be mapped honestly.
- A build, typecheck, lint, or required verification step fails and the cause is not clear.
- A dependency requires a paid plan or restrictive license.
- A map tile provider requires paid usage, a credit card, or terms that conflict with the app.

When stopping, report:
- What is blocked.
- What has been verified.
- What decision or input is needed.
- The safest narrow option.

## 10. Final definition of done

The build is complete only when all of these are true:
- The app is Texas-only.
- The Texas county map renders correctly.
- Counties are colored by Backup Priority Score.
- Users can select a county and see a side panel.
- The side panel shows weather risk, solar potential, demand exposure, statewide grid strain, utility/service territory context, score label, recommendation, and data quality.
- The score is computed with the fixed formula.
- Every score component is normalized from 0 to 100.
- Utility/service territory is context only.
- The UI avoids outage prediction and fake precision.
- API keys are server-side only.
- `.env.local` is ignored.
- `.env.example` contains placeholders only.
- API failure states are handled and labeled.
- The report copy/export feature works.
- The README explains setup, API keys, data sources, scoring, limitations, and local run commands.
- Typecheck passes.
- Lint passes or any unavailable lint command is documented.
- Build passes.
- Local run has been manually checked.
- Remaining uncertainty is documented instead of hidden.

Completion report format:
- Goal completed.
- Files changed.
- Verification performed.
- Known limitations.
- Any unresolved uncertainty.
