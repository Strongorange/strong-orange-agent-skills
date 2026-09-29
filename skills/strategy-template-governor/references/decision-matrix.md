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

## Reading the Scores

The scores describe the situation; they do not compute the verdict.

- Strategy fits when runtime swap (D1), algorithm-level divergence (D3), growth (D4), and protocol heterogeneity (D7) are high while the shared skeleton (D2, D5) is thin.
- Template fits when D2 and D5 are high and differences stay at step level.
- Hybrid fits when both hold.
- High leakage (D6) means the boundary needs redesign whatever the verdict.
- No-change when urgency (D8) is low and cost (D9) is not trivial, when fewer than three concrete code evidence points exist, or when migration risk is high and expected gains are not clearly high.

## Output Requirements

Always include:
1. Raw scores for each dimension.
2. Final verdict.
3. One-paragraph justification for why each non-selected option is weaker.
4. One-paragraph disconfirming evidence for the selected verdict.
5. Cost-of-change summary.

## Red Flags

1. Choosing Template while runtime swap remains uncontrolled in UI/service layers.
2. Choosing Strategy when 80% of lifecycle code is duplicated in each variant.
3. Declaring Hybrid without defining exact boundary ownership.
4. Forcing any pattern change when urgency is low and migration risk is non-trivial.
