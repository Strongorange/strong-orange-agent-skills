# Payment Casebook

Use this guide when evaluating payment method/provider architecture.

## Typical Signals in Payment Systems

1. Runtime method selection is mandatory (card, wallet, provider).
2. Provider protocols can vary significantly:
SDK call, redirect flow, form POST, webhook pending flow.
3. Validation and error policy are often shared, but request execution is heterogeneous.

## Pattern Recommendations

1. Choose Strategy-dominant when:
methods/providers require different execution protocols.

2. Add Template Method when:
there is a stable sequence inside each strategy family:
validate common -> validate method-specific -> execute -> map error/result.

3. Choose Hybrid when:
you need runtime provider swap plus a shared lifecycle skeleton.

4. Choose No-change when:
provider diversity is currently small, pain is low, and migration risk is larger than expected gain.

## Concrete Payment-Oriented Checks

1. Is provider selection centralized (factory/map) or spread across UI/services?
2. Are provider-specific rules (currency, pending URL, encoding, callback rules) isolated in provider classes?
3. Is there duplicate common validation/error-mapping across provider implementations?
4. Does UI still contain provider-heavy branching after strategy introduction?

## Common Anti-Patterns

1. Single `executePayment()` with large provider branches.
2. Strategy names exist, but actual protocol logic remains in UI/controller.
3. Template skeleton is attempted while provider protocols are too divergent.
4. Shared validation copied into every provider class with drift.
5. Pattern refactor is proposed without cost-of-change and rollback analysis.

## Review Output Expectations

Include:
1. Provider/method runtime selection boundary.
2. Shared lifecycle ownership.
3. Async completion model (sync redirect vs webhook/pending).
4. Failure handling and retry policy by provider.
5. Test matrix: common contract tests + provider-specific integration tests.
