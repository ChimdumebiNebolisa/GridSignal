# GridSignal Texas Design Specification

## Experience

The primary experience helps county planners inspect two distinct questions: where structural resilience need is elevated, and where backup feasibility may be stronger. Current weather and statewide grid conditions appear as context, not rank inputs.

The default layer is Structural Resilience Need. Available layers are Structural Resilience Need, Backup Feasibility, Need vs Feasibility, and Current Weather Stress.

## County panel

A selected county shows:

- Structural need score, planning label, component breakdown, missing components, and no-score reason.
- Backup feasibility score, planning label, solar-resource component, and quality.
- Current weather and statewide grid context with timestamps and limitations.
- Deterministic recommendation, utility context, source notes, data-quality badges, and text export.

Scores are shown as unavailable or withheld when appropriate. Null values are never shown as zero or a neutral planning label.

## Accessibility

Map interaction is supplemented by a keyboard-accessible county list. Layer controls use native radio inputs with visible selected state. Headings, labels, focus order, text alternatives, contrast, and responsive layout are required.

## Language guardrails

Use structural resilience need, backup feasibility, current conditions, estimated, cached, stale, fallback, unavailable, and withheld. Do not use Backup Priority Score, Critical, outage probability, exact utility reliability, or population-as-electricity-demand claims.

## Export

The text report includes both canonical axes, operational context, quality, no-score reasons, source notes, limitations, utility context, manifest version, and timestamps.
