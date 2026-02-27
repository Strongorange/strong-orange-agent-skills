---
name: toolditor-readable-commits
description: Split large git changes into readable, review-friendly, revert-safe commit stacks in Toolditor. Use when preparing a PR, reorganizing staged/unstaged changes, enforcing Korean `[type] message` commit convention, or producing commit history that is easy to review and selectively revert.
---

# Toolditor Readable Commits

## Overview

Build a clean commit stack without changing implementation behavior.
Favor explicit file-by-file staging, coherent scope boundaries, and Korean commit messages that pass `.husky/commit-msg`.

## Non-Negotiable Rules

1. Do not change code logic just to reorganize commits.
2. Do not use destructive git commands (`reset --hard`, `checkout --`, stash manipulation) unless explicitly requested.
3. Respect commit convention:
- header: `[type] message` (Korean message)
- body: optional flat bullet list (`- 설명`)
4. Keep commit scopes independent so each commit is reviewable and revertable.
5. Verify commit list after every 1-2 commits, not only at the end.
6. Run `npm run check` before starting split work; if it fails, fix lint/type errors first.
7. Do not bypass verification for delivery: never use `--no-verify` for pushes.
8. Do not isolate docs into docs-only commits when they explain code changes in the same stack; attach docs to the related commit.

## Workflow

0. Run preflight checks first.
- `npm run check`
- If errors exist, fix them before commit splitting.

1. Inspect current state.
- `git status --short --branch`
- `git diff --name-only`
- `git diff --cached --name-only`
- `git log --oneline --decorate -n 20`
- `sed -n '1,220p' .husky/commit-msg`
- `sed -n '1,240p' commitlint.config.ts`

2. Create a commit split map before committing.
- Group by behavior boundary, not by file extension.
- Separate refactor/feature/fix/test/docs where possible.
- Put shared foundations first.
- If docs explain a specific code change, place docs in that same commit instead of a standalone docs commit.

3. Commit per group using explicit staging.
- `git add <file1> <file2> ...`
- `git diff --cached --name-only`
- `git diff --cached`
- `git commit` with Korean `[type] message`

4. Re-check stack quality continuously.
- `git status --short`
- `git log --oneline --decorate -n 10`
- Ensure no unrelated file leaked into commit.

5. Run verification once stack is complete.
- For TypeScript/code changes: run project-required checks (typically `npx tsc --noEmit`, `npm test`).
- If pre-commit tools rewrite files, include only logical rewrites in the same commit scope.
- Do not rely on `--no-verify` as a delivery path.

## Commit Message Contract

Use this exact structure:

```text
[type] 메시지

- 설명 (optional, multiple allowed)
```

Allowed `type` values in this repo:
- `feat`, `fix`, `design`, `style`, `refactor`, `comment`, `docs`, `test`, `chore`, `rename`, `remove`, `ci`, `build`, `revert`

Avoid:
- subject ending with `.`
- nested bullets in body
- mixed language headers that violate team convention

## Reference Files

- `references/commit-splitting-playbook.md`

Read the playbook when deciding split order, handling lint-staged side effects, or drafting message templates for large refactors.
