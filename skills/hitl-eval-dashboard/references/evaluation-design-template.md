# Evaluation Design Template

Use this before building a HITL dashboard. Keep the answers short and concrete.

## Decision Packet

```markdown
## HITL Evaluation Design

- Evaluation goal:
- Compared artifacts:
- Evaluation unit:
- Variants:
- Evidence files:
- Reviewer:
- Storage location:
- Resume behavior:
- Aggregate command:
- Pass criteria:

## Rubric

| Axis | Scale | Meaning of 1 | Meaning of 5 |
|---|---:|---|---|
| intent | 1-5 | Misses user intent | Fully reflects intent |
| specificity | 1-5 | Generic or vague | Specific and actionable |
| consistency | 1-5 | Internally inconsistent | Coherent across artifact |

## Implementation Choice

- UI shape:
- Data schema:
- Existing project conventions to reuse:
- Out of scope:
```

## Defaults

- Use 3-5 axes.
- Prefer 1-5 scoring for first pass.
- Include free-text reviewer notes.
- Store raw artifacts separately from reviewer scores.
- Make re-evaluation idempotent: same evaluation unit updates the previous score.

