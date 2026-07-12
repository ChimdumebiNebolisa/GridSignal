# Scoring Validation Output

Generated: 2026-07-12T19:16:47.934Z
Score configuration: two-axis-v1

## Outcome proxy correlation

| Metric | Value | Threshold | Pass |
|--------|-------|-----------|------|
| Spearman ρ (structural need vs outage burden) | 0.603 | ≥ 0.4 | Yes |
| Rank stability (±20% hazard weight) | 54.7% | ≥ 80% | No |

## Urban/rural bias check

| Metric | Value |
|--------|-------|
| Spearman ρ (structural need vs population) | 0.887 |

High population correlation may indicate proxy bias — review when using authoritative SVI/NRI data.

## Composite publish decision

**WITHHOLD** cross-horizon composite based on current bundled estimates.
