# AI Casebook

Use this guide when analyzing AI feature architecture.

## Typical Signals in AI Feature Work

1. Multiple modes share lifecycle:
select target -> validate -> execute request -> apply result -> cleanup.
2. Mode-specific request payloads diverge.
3. Exit/cancel policy and UX guard flow may be common.
4. Focus overlays and session state behavior often overlap.

## Pattern Recommendations

1. Choose Strategy when:
runtime mode switch is core and mode behavior differs at request/apply algorithm level.

2. Choose Template Method when:
execution lifecycle is stable and only hooks/payload builders vary.

3. Choose Hybrid when:
mode selection is dynamic, but each mode family still has a stable internal pipeline.

4. Choose No-change when:
current pain is low, near-term variant growth is unclear, and migration cost is non-trivial.

## Concrete AI-Oriented Checks

1. Is there a single place that maps mode -> handler?
2. Are request construction and result application duplicated across handlers?
3. Are guard flows (abort/confirm/exit) modeled as policy objects or ad-hoc branches?
4. Do UI components branch by mode for business logic that should live in model layer?

## Common Anti-Patterns

1. "Mega hook" that directly branches on all AI modes.
2. Repeating credit/status/error lifecycle in every handler.
3. Forcing all AI modes into one Template when some require fundamentally different protocol/steps.
4. Strategy classes that still rely on scattered external `if (mode === ...)`.
5. Refactoring to a pattern without measurable quality or delivery gain.

## Recommended Artifact in Reviews

Include:
1. Mode map (mode -> concrete strategy).
2. Shared lifecycle ownership (base template or shared core function).
3. Exit/abort policy ownership and test scope.
4. Risk list for adding the next AI mode.
