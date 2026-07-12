# GridSignal Texas Scoring Validation Report

Generated from `scripts/validate-scoring.ts` using score configuration `two-axis-v1`.

## Current decision

**WITHHOLD** any cross-horizon composite. Publish separate structural-need and backup-feasibility axes only.

## Validation results

| Metric | Result | Gate | Status |
|---|---:|---:|---|
| Structural component coverage | 254/254 | ≥ 90% | Pass |
| Spearman rho: structural need vs outage burden | 0.603 | ≥ 0.4 | Pass |
| Rank stability under ±20% hazard-weight perturbation | 54.7% | ≥ 80% | Fail |
| Spearman rho: structural need vs population | 0.887 | Monitor | Warning |
| Expert label calibration | Pending | Complete | Fail |

## Method

Structural need uses FEMA NRI hazard exposure, CDC/ATSDR SVI, and DOE EAGLE-I historical outage burden with the canonical equal-weight configuration. Feasibility uses NREL PVWatts solar-resource values. Weather and statewide grid load remain operational context and are excluded from county ranking.

Missing structural components are explicit. A structural score is withheld when more than one required component is missing. No score weights were changed to satisfy a validation gate.

High population correlation is a bias signal requiring review; it is not evidence that population is electricity demand. The scores are planning heuristics, not outage predictions.
