# Decision Matrix

Use this matrix to choose Strategy, Template Method, Hybrid, or No-change.

## Scoring Dimensions

Score each item `0`, `1`, or `2`:

1. Runtime interchangeability requirement
`0`: No runtime swap.
`1`: Rare runtime swap.
`2`: Frequent runtime swap by method/provider/mode.

2. Skeleton stability
`0`: No stable common flow.
`1`: Partially stable flow.
`2`: Strong fixed lifecycle across variants.

3. Variation granularity
`0`: Small step-level differences.
`1`: Mixed.
`2`: Algorithm/protocol-level differences.

4. Variant growth pressure
`0`: Stable and small.
`1`: Moderate growth.
`2`: High growth expected.

5. Shared lifecycle ratio (validation/setup/error/finalize)
`0`: Low shared ratio.
`1`: Medium.
`2`: High shared ratio.

6. External branching leakage
`0`: Branching mostly isolated.
`1`: Some leakage.
`2`: Significant branching outside abstraction.

7. Integration/protocol heterogeneity
`0`: One SDK/protocol.
`1`: Same SDK, config differences.
`2`: Different SDKs/protocols/transport rules.

8. Change urgency (current architectural pain)
`0`: Low pain, mostly acceptable.
`1`: Noticeable pain, manageable.
`2`: High pain, blocks delivery or quality.

9. Refactor cost/risk
`0`: Low migration cost and low risk.
`1`: Moderate migration cost/risk.
`2`: High migration cost/risk.

## Decision Heuristic

Compute:
- `S = D1 + D3 + D4 + D7`
- `T = D2 + D5`
- `L = D6`
- `U = D8`
- `R = D9`

Base verdict:
1. `S >= 6` and `T <= 2` -> Strategy-dominant.
2. `T >= 3` and `S <= 4` -> Template-dominant.
3. Otherwise -> Hybrid.

Adjustment for leakage:
1. If `L >= 2`, force boundary redesign.
2. If `L >= 2` and base verdict is Template-dominant, reconsider Hybrid.

Anti-forcing override:
1. If `U == 0` and `R >= 1` -> No-change.
2. If evidence quality is low (fewer than 3 concrete code evidence points) -> No-change with follow-up inspection plan.
3. If estimated migration risk is high and expected gains are not explicitly high -> No-change.

## Output Requirements

Always include:
1. Raw scores for each dimension.
2. Computed `S`, `T`, `L`, `U`, `R`.
3. Final verdict.
4. One-paragraph justification for why each non-selected option is weaker.
5. One-paragraph disconfirming evidence for the selected verdict.
6. Cost-of-change summary.

## Red Flags

1. Choosing Template while runtime swap remains uncontrolled in UI/service layers.
2. Choosing Strategy when 80% of lifecycle code is duplicated in each variant.
3. Declaring Hybrid without defining exact boundary ownership.
4. Forcing any pattern change when urgency is low and migration risk is non-trivial.
