---
name: resume-driven-development-coach
description: Use when extracting honest resume bullets, 1-minute interview stories, or likely interviewer questions from a defined work period (a project, week, sprint, or custom date range). Collects evidence from git, GitHub, and an Obsidian vault, filters strictly to verified self-attribution, refuses to invent impact metrics, and marks AI-assist where material. Triggers on "이력서 bullet", "주간 회고 이력서", "프로젝트 X 회고 이력서 톤", "포트폴리오 자료 뽑아줘".
---

# Resume-Driven Development Coach

## Overview

Turn a real work period into defensible career assets. Three rules are non-negotiable:

1. **Evidence first** — every claim ties to a commit, PR, review, or vault note.
2. **Self-attribution only** — entries the user did not author are dropped silently.
3. **Honest framing** — no invented metrics, no sole-authorship claims, AI-assist marked when material.

The skill collects evidence, filters by identity, then emits: resume bullets (Safe + Stronger), one 1-minute STAR story, and likely interviewer questions.

## When to use

Use when:
- User asks for resume bullets, weekly recap for resume, project retrospective in resume tone, portfolio one-pager, or STAR drafts from real evidence.
- Input is a *period* (project / week / sprint / custom range), not a single hand-curated fact list.

Do NOT use for:
- Phrasing-only polish of an already-curated fact list — use `resume-asset-coach`.
- Team-wide activity reports.
- Speculative bullets without evidence.

## Configuration

On first run, read `~/.agents/skills/resume-driven-development-coach/config.local.yml`. If missing, ask the user once and persist:

```yaml
identities:
  git_emails: [chanhwi.lee7@gmail.com, potato@taratps.com]
  github_users: [ChanHwi-Lee, chanhwilee]
  obsidian_authors: [chanhwilee, ChanHwi-Lee, 이찬휘]
watched_repos:
  - /home/ubuntu/github/tooldi/toolditor
  - /home/ubuntu/github/tooldi/sandbox/embedding-test
  # add more as needed
obsidian_vault: /mnt/c/Users/USER/Documents/llm-store
```

Override per-call via prompt args: `--repos`, `--vault`, `--since`, `--until`, `--project`, `--save <path>`.

## Workflow (rigid — do not reorder)

### 1. Resolve scope

- `--since / --until`: explicit window.
- `--project "<name>"`: open `프로젝트/<name>/<name>.md` in vault. Use frontmatter `started`/`ended`, else earliest/latest work-log under the project subtree. Confirm window with user before step 2.
- Default: today (KST).

### 2. Collect evidence (parallel where possible)

Repos (each in `watched_repos`):
- `git log --author=<email> --since=... --until=... --stat --format=fuller` per identity email → commits + bodies + diff stats.
- `git status -s` + `git worktree list` → in-flight work-in-progress (label as "not yet shipped").

GitHub (`gh` CLI, must be authenticated):
- `gh search prs --author=@me --created=YYYY-MM-DD..YYYY-MM-DD --json url,title,repository,state,createdAt,closedAt,mergedAt`
- Same with `--updated=` for review activity.
- `gh search issues --author=@me --updated=...`
- For each notable PR: `gh pr view <num> --repo <r> --json body,reviews,comments,files,additions,deletions`.
- `gh api "/users/<github_user>/events?per_page=100"` filtered to window for push/branch events.

Obsidian vault:
- `find <vault> -name "*.md" -newermt "<since>" ! -newermt "<until+1>" -type f` (escape Korean paths).
- For each match, parse frontmatter. **Keep only if `author` (or any in `authors`) matches `obsidian_authors`.** Files without an author field → drop silently and count.
- Prioritize `작업기록/work-logs/`, `작업기록/troubleshooting/`, `작업기록/lesson/`, `프로젝트/<project>/`.

### 3. Build evidence table (internal)

| Area | What | Evidence | Attribution proof | Verified outcome | AI-assist |
|------|------|----------|-------------------|------------------|-----------|

Attribution proof must be one of: `git author=<email>`, `gh PR author=@me`, `obsidian frontmatter author=<name>`. If a row has none, drop the row. Do not aggregate other people's work under "we".

### 4. Generate deliverables

**(a) Resume bullets** — two versions per entry.

- **Safe**: only what the evidence row proves. No metric unless it appears explicitly in evidence (row counts, dim sizes, PR review comments resolved, file counts).
- **Stronger**: sharper phrasing of the *same* fact. Allowed amplifications: scope ("across 7 modules"), mechanism ("via ThreadPoolExecutor with thread-safe buffer flush"), verifiable outcome ("merged + production-deployed").

Format: `action verb + scope + technical mechanism + outcome`. Allowed verbs (only with evidence): `Implemented, Designed, Debugged, Standardized, Shipped, Operated, Improved, Refactored, Migrated, Contributed to`. Forbidden without explicit proof: `Led, Owned end-to-end, Reduced X by Y%, Saved $N, Increased N×`.

If AI materially co-authored (skill/agent/model wrote >30% of the code or the core design), append `(AI-assisted)` — don't hide, don't over-claim.

**(b) 1-minute STAR story** — Situation, Task, Action (your specific part, not "we"), Result (verifiable artifacts: merged PR, prod deploy, accepted review). Target 150-180 words spoken.

**(c) Likely interviewer questions** — per story, 3 categories:
- *Depth probes* ("Why ThreadPoolExecutor over asyncio?")
- *Weak-point probes* ("How does the dual-write handle partial run failure?")
- *Follow-up questions you can ask the interviewer* (signals seniority)

### 5. Output

Markdown to chat. Save to file only on `--save <path>`. Section order: scope confirmation (window + repos + vault + dropped count) → evidence table (compact) → bullets (Safe + Stronger) → STAR → interviewer questions.

## Red flags — STOP and revise

- Adding a metric not in any evidence row → drop the metric.
- Including a vault note with non-matching `author` → drop the note.
- Writing "we" without naming the user's part → rewrite or drop.
- Claiming `Led` / `Owned end-to-end` without ownership evidence → downgrade to `Implemented` / `Contributed to`.
- Hiding AI assistance on materially AI-driven work → add `(AI-assisted)`.
- Padding a thin period with hypothetical impact → shorten the output instead.

## Rationalization table

| Excuse | Reality |
|--------|---------|
| "Team did it so I can say 'we'" | Reviewers ask "what did *you* do". Name your part. |
| "Impact is implied" | No number in evidence = no number in bullet. |
| "Vault note has no author field" | Unknown → drop. Don't assume self. |
| "AI-assist not worth mentioning" | Hidden AI on core work = credibility risk in interview. Mark it. |
| "Polish phrasing first, attribution later" | Attribution is step 1. Phrasing is step 4. Don't reorder. |
| "Single commit, no need to prove ownership" | Same rule. One commit = one evidence row. |
| "Stronger version sounds better with a fake metric" | Stronger ≠ inflated. Stronger = sharper phrasing of the same fact. |

## Cross-reference

- For deeper phrasing tuning (e.g., role-targeted rewrites), pipe this skill's output into `resume-asset-coach`. They are complementary: this skill is the evidence-driven front half; `resume-asset-coach` is independent fine-grained phrasing.
