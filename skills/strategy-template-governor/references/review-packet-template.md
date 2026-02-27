# Design Review Packet Template

Use this template for every final recommendation.

## 1) Verdict
- Selected pattern: `Strategy` | `Template Method` | `Hybrid` | `No-change`
- Confidence: `High` | `Medium` | `Low`
- One-line rationale:

## 2) Evidence (Code-Grounded)
1. Evidence point #1 (file/function/flow reference)
2. Evidence point #2 (file/function/flow reference)
3. Evidence point #3 (file/function/flow reference)

## 3) Decision Matrix
- D1 Runtime interchangeability:
- D2 Skeleton stability:
- D3 Variation granularity:
- D4 Variant growth:
- D5 Shared lifecycle ratio:
- D6 External branching leakage:
- D7 Protocol heterogeneity:
- D8 Change urgency:
- D9 Refactor cost/risk:
- Computed `S`, `T`, `L`, `U`, `R`:

## 4) Why-Not Analysis
1. Why rejected option A is weaker:
2. Why rejected option B is weaker:

## 4.1) Disconfirming Evidence
1. Evidence that challenges the selected verdict:
2. Why the selected verdict still stands (or downgrade to `No-change`):

## 5) Boundary Design
- Composition boundary (where selection happens):
- Shared lifecycle owner:
- Variant-specific owner:
- Public interfaces/types affected:

## 6) Failure Modes and Rollback
1. Failure mode:
   - Detection:
   - Mitigation:
2. Failure mode:
   - Detection:
   - Mitigation:

## 7) Test Strategy
- Unit tests:
- Integration tests:
- Regression tests:
- Contract tests (if Strategy-dominant):

## 8) Migration and Compatibility
- Migration steps:
- Backward compatibility risks:
- Rollout plan:
- Cost-of-change summary:

## 9) Acceptance Criteria
1. Criterion:
2. Criterion:
3. Criterion:

## 10) Gate Result
- PASS / FAIL
- If FAIL: missing evidence and required next inspection targets.
- If FAIL and urgency is not high: set provisional verdict to `No-change`.
