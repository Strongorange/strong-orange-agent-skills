---
name: strategy-template-governor
description: Decide between Strategy, Template Method, or Hybrid for architecture and refactor tasks across frontend/backend systems. Use when evaluating branching logic, adding new variants/providers/modes, introducing shared execution pipelines, or debating runtime algorithm switching versus fixed skeleton workflows. Trigger especially for AI feature flows and payment/provider integrations where pattern choice affects extensibility, testability, and change risk.
---

# Strategy Template Governor

Produce a gate-style design review packet that selects Strategy, Template Method, Hybrid, or No-change using code-grounded evidence.

## Workflow

1. Ground in code reality before deciding.
2. Score the decision matrix from `references/decision-matrix.md`.
3. Validate the score using domain casebooks:
Use `references/ai-casebook.md` for AI flow patterns.
Use `references/payment-casebook.md` for provider/payment patterns.
4. Produce a design review packet from `references/review-packet-template.md`.
5. Apply anti-forcing gate checks. Block implementation advice if evidence is insufficient.

## Gather Evidence First

Collect all items before scoring:
1. Runtime selection points (factory, map, conditional dispatch).
2. Variant count and growth direction (stable or expanding).
3. Shared lifecycle steps (validation, setup, execute, finalize, error map).
4. Algorithm heterogeneity (same pipeline vs protocol-level divergence).
5. UI/service leakage (how much variant branching remains outside the chosen abstraction).
6. Test surface (unit seams and integration boundaries).

## Apply Matrix and Decide

Score each dimension in `references/decision-matrix.md`.

Verdict rules:
1. Choose Strategy-dominant when runtime interchangeability and algorithm-level divergence are both high.
2. Choose Template-dominant when the skeleton is stable and variability is concentrated in step overrides/hooks.
3. Choose Hybrid when both are materially true and neither pattern alone keeps branching local.
4. Choose No-change when benefits are weak, confidence is low, or migration cost outweighs expected gains.

## Design Boundaries by Verdict

For Strategy-dominant:
1. Keep one interface contract for interchangeable executors.
2. Move per-variant protocols/providers into concrete strategies.
3. Keep selection/composition at one boundary (factory/map/composer).

For Template-dominant:
1. Implement a fixed `final`/non-overridden flow entrypoint.
2. Expose only required operations and optional hooks.
3. Keep shared lifecycle in base and forbid external reordering.

For Hybrid:
1. Use Strategy for outer runtime variant swap.
2. Use Template inside each strategy family for stable internal lifecycle.
3. Keep one source of truth for cross-cutting validation and error policy.

For No-change:
1. Keep the current architecture and state explicit reasons.
2. List guardrails that prevent further drift.
3. Define objective re-evaluation triggers for revisiting pattern changes.

## Required Output Format

Always output a complete design review packet using `references/review-packet-template.md`.

Minimum required sections:
1. Verdict and confidence.
2. Why-not analysis for rejected alternatives.
3. Boundary and interface proposal.
4. Failure modes and rollback plan.
5. Test strategy and acceptance criteria.
6. Migration/compatibility considerations.
7. Disconfirming evidence that argues against the chosen verdict.

## Anti-Forcing Gate Checks (Mandatory)

Do not issue implementation-ready advice unless all checks pass:
1. At least three code-grounded evidence points are present.
2. At least one rejected pattern has explicit rationale.
3. Variant growth expectation is stated.
4. Testability impact is addressed.
5. Failure handling path is defined.
6. Cost-of-change is explicitly estimated (migration scope, regression risk, rollout cost).
7. Disconfirming evidence is explicitly documented.
8. Confidence is not `Low`.

If a check fails, return:
1. Missing evidence list.
2. Required next inspection targets.
3. Temporary recommendation with explicit uncertainty.
4. No-change as the default safe interim verdict unless urgency is high.

## Reference Navigation

Use only what you need:
1. `references/decision-matrix.md`: scoring model and thresholds.
2. `references/ai-casebook.md`: AI-focused cues and anti-patterns.
3. `references/payment-casebook.md`: payment/provider-focused cues and anti-patterns.
4. `references/review-packet-template.md`: final response contract.
