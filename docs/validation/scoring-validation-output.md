# Scoring Validation Output

Score configuration: two-axis-v1
Deterministic artifact — regenerate with `npm run data:validate-scoring`. No timestamps by design.

## Outcome proxy correlation

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| Scored counties | 254 / 254 | — | — |
| Spearman ρ (structural need vs outage burden) | 0.000 | ≥ 0.4 | No |
| Worst-case ±20% hazard-weight rank stability | 66.5% | ≥ 80% | No |

## Weight sweeps (rank stability vs base within ±5 positions)

| Component | Δ weight | Stable share |
|---|---|---|
| hazardExposure | -20% | 66.5% |
| hazardExposure | -10% | 89.4% |
| hazardExposure | +10% | 90.6% |
| hazardExposure | +20% | 74.8% |
| socialVulnerability | -20% | 72.8% |
| socialVulnerability | -10% | 87.8% |
| socialVulnerability | +10% | 91.7% |
| socialVulnerability | +20% | 70.9% |
| outageBurden | -20% | 100.0% |
| outageBurden | -10% | 100.0% |
| outageBurden | +10% | 100.0% |
| outageBurden | +20% | 100.0% |

## Leave-one-component-out

| Removed component | Scored counties | Rank stability |
|---|---|---|
| hazardExposure | 0 | 100.0% |
| socialVulnerability | 0 | 100.0% |
| outageBurden | 254 | 100.0% |

## Input-value perturbation (uniform shift of all available components)

| Shift | Rank stability |
|---|---|
| -10 points | 94.1% |
| +10 points | 72.0% |

## Urban/rural bias check

| Metric | Value |
|--------|-------|
| Spearman ρ (structural need vs population) | 0.801 |

High population correlation is a known property of the current synthetic bundle: the social-vulnerability proxy is the population percentile itself (see docs/audit/2026-08-21-adversarial-audit.md). Re-evaluate with authoritative SVI/NRI/EAGLE-I data.

## Composite publish decision

**WITHHOLD** cross-horizon composite based on current bundled estimates.
