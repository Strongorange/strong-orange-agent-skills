# Score Envelope Examples

Use a stable envelope and let each project define `payload`.

## Base Envelope

```ts
interface HitlEnvelope<TPayload = unknown> {
  schemaVersion: "1";
  evaluationId: string;
  variantIds: string[];
  status: "draft" | "scored" | "skipped";
  evidenceRefs: string[];
  reviewerNote?: string;
  savedAt: string;
  payload: TPayload;
}
```

## A/B Axis Score

```ts
interface AbAxisScorePayload {
  axesA: Record<string, number>;
  axesB: Record<string, number>;
  comment: string;
}
```

Use when comparing baseline and candidate artifacts.

## Single Artifact Review

```ts
interface SingleArtifactPayload {
  scores: Record<string, number>;
  verdict: "accept" | "revise" | "reject";
  comment: string;
}
```

Use when the evaluator reviews one candidate against an absolute quality bar.

## Checklist Review

```ts
interface ChecklistPayload {
  items: Array<{
    id: string;
    passed: boolean;
    note?: string;
  }>;
  verdict: "pass" | "fail";
}
```

Use when criteria are concrete and binary.

## Rules

- Keep `evaluationId` stable for idempotent updates.
- Keep `evidenceRefs` as relative paths inside the run directory when possible.
- Do not put large artifact contents directly into score JSON.
- Do not collapse reviewer rationale into numbers only.

