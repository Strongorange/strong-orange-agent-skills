# Minimal Dashboard Pattern

This is a portable summary of the proven HITL dashboard pattern. It intentionally avoids machine-specific absolute paths.

## Directory Shape

```text
eval-dashboard/
├── src/
│   ├── server.ts
│   └── aggregate.ts
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── runs/
│   └── <candidateId>/
│       ├── scores.json
│       └── <scenarioId>/<variantId>/<runId>/
│           ├── screenshot.png
│           ├── html.html
│           └── meta.json
└── package.json
```

## Server Responsibilities

- Serve static HTML/CSS/JS.
- List available run manifests.
- Return the current pair or artifact metadata.
- Serve evidence files such as screenshots or raw HTML.
- Read existing scores for prefill.
- Upsert one score entry by stable evaluation unit.

## UI Responsibilities

- Show the compared artifacts side by side or in tabs.
- Show metadata and raw artifact links.
- Render rubric controls.
- Preserve and prefill existing scores.
- Support Prev, Next, Save & Next.
- Show progress as `completed / total`.

## Aggregate Responsibilities

- Read raw `scores.json`.
- Group by scenario, seed, or evaluation unit.
- Compute totals and deltas.
- Preserve reviewer comments.
- Emit a Markdown report.

## Keep Project-Specific

- Exact rubric axes.
- Pass threshold.
- Variant labels.
- Artifact storage layout.
- Framework choice.

