# GridSignal Texas PRD (v2)

## 1. Product summary

GridSignal Texas is a Texas-only interactive energy resilience map for **county planners, emergency managers, and community resilience staff**.

The app displays Texas counties on a map using a **two-axis model**:

1. **Structural Resilience Need** — where long-term planning should prioritize backup capacity and resilience (annual indicators).
2. **Backup Feasibility** — where distributed backup (e.g., solar+battery) may be more productive to evaluate (annual indicators).
3. **Current Conditions** — near-term weather stress and statewide ERCO/EIA load context (informational banner; does not rank counties).

Likely utility/service territory is **context only** and does not affect scores.

The app does not predict outages, determine exact utility reliability, estimate electricity bills, or provide professional legal, engineering, investment, or energy advice.

The legacy **Backup Priority Score** composite is deprecated and hidden from the primary UI unless validation gates pass (see ADR 001).

## 2. Target user (primary)

**County planner / emergency manager / community resilience staff** in Texas.

Secondary audiences (homeowners, researchers) may use the tool but the product optimizes for county-level resilience planning decisions.

## 3. Core problem

Resilience planning signals are scattered across hazard databases, vulnerability indices, outage history, solar feasibility, and statewide grid data. Planners lack a single county-level view with honest provenance and separated time horizons.

## 4. Core question

> Where should we prioritize resilience planning and backup-capacity conversations across Texas counties — and where is backup implementation more feasible?

## 5. Core user flow

1. User opens GridSignal Texas.
2. Map defaults to **Structural Resilience Need** layer (or need-vs-feasibility quadrant view).
3. **Statewide Current Conditions** bar shows weather stress summary and ERCO load context.
4. User switches layers: Structural Need, Backup Feasibility, Current Weather Stress.
5. User clicks a county → detail panel shows separate need and feasibility indicators, provenance, gaps, and recommendations.
6. Search by county, city, or ZIP.
7. Copy/export county report.

## 6. Required features

### Map layers

- Structural Resilience Need (default)
- Backup Feasibility
- Need vs Feasibility quadrant coloring
- Current Weather Stress (operational)
- ~~Backup Priority Score~~ (deprecated; withheld until validation)

### County detail panel

- Structural need score and component breakdown (hazard, vulnerability, outage burden where available)
- Feasibility score and solar component
- Current conditions summary (weather + statewide grid context)
- Data quality per indicator; missing components listed explicitly
- Source provenance and vintages from data manifest
- Utility context (informational)
- Limitation wording

### Labels

Use cautious planning labels: **Lower**, **Moderate**, **Elevated**, **Highest** — not "Critical" until calibration study.

### Non-goals

Unchanged from v1: no outage prediction, no county reliability from statewide demand, no fabricated utility territories, no AI score narratives.

## 7. Data assumptions

- County geography: static GeoJSON + centroids.
- Structural need: FEMA NRI, CDC SVI, EAGLE-I outage burden (bundled annual snapshots).
- Feasibility: NREL PVWatts solar resource (bundled annual cache).
- Current conditions: Open-Meteo (weather), EIA ERCO demand (statewide).
- Missing data: explicit gaps; no silent neutral 50.

## 8. Acceptance criteria (v2)

- Two-axis indicators visible on map and panel.
- Statewide grid strain does not affect county ranking.
- Population not labeled as electricity demand.
- Data manifest version exposed in API responses.
- `npm run test`, `typecheck`, `build`, and data validation pass in CI without live API keys.

## 9. Scope lock

Texas-only county resilience planning map with two-axis indicators, provenance manifest, validation pipeline, and deprecated legacy composite.
