# Scoring Validation Output

Score configuration: two-axis-v1
Deterministic artifact — regenerate with `npm run data:validate-scoring`. No timestamps by design.

## Outcome proxy correlation

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| Scored counties | 254 / 254 | — | — |
| Spearman ρ (structural need vs outage burden) | 0.603 | ≥ 0.4 | Yes |
| Worst-case ±20% hazard-weight rank stability | 54.7% | ≥ 80% | No |

## Weight sweeps (rank stability vs base within ±5 positions)

| Component | Δ weight | Stable share |
|---|---|---|
| hazardExposure | -20% | 57.1% |
| hazardExposure | -10% | 74.8% |
| hazardExposure | +10% | 81.5% |
| hazardExposure | +20% | 54.7% |
| socialVulnerability | -20% | 76.0% |
| socialVulnerability | -10% | 86.6% |
| socialVulnerability | +10% | 88.6% |
| socialVulnerability | +20% | 76.4% |
| outageBurden | -20% | 57.9% |
| outageBurden | -10% | 83.1% |
| outageBurden | +10% | 76.4% |
| outageBurden | +20% | 61.4% |

## Leave-one-component-out

| Removed component | Scored counties | Rank stability |
|---|---|---|
| hazardExposure | 254 | 16.9% |
| socialVulnerability | 254 | 22.0% |
| outageBurden | 254 | 14.6% |

## Input-value perturbation (uniform shift of all available components)

| Shift | Rank stability |
|---|---|
| -10 points | 87.8% |
| +10 points | 97.2% |

## Urban/rural bias check

| Metric | Value |
|--------|-------|
| Spearman ρ (structural need vs population) | 0.887 |

High population correlation is a known property of the current synthetic bundle: the social-vulnerability proxy is the population percentile itself (see docs/audit/2026-08-21-adversarial-audit.md). Re-evaluate with authoritative SVI/NRI/EAGLE-I data.

## Composite publish decision

**WITHHOLD** cross-horizon composite based on current bundled estimates.
