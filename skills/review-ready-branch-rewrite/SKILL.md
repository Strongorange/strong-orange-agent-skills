---
name: review-ready-branch-rewrite
description: Rewrite a completed feature branch into a clean, review-friendly commit stack on a new branch using soft reset + re-commit. Use when a feature branch has too many commits, overlapping refactors obscure intent, or the commit history makes PR review impractical. Works with any project.
---

# Review-Ready Branch Rewrite

## Overview

Takes a completed feature branch with messy, overlapping, or too-many commits and produces a **new branch** with a clean logical commit stack — without changing any final code behavior.

The core technique: soft-reset everything to the merge-base, then re-stage and re-commit by logical group. The resulting branch is a faithful slice of the original; only the commit history differs.

**When to use this skill:**
- Feature branch has 30+ commits that are impractical to review commit-by-commit
- Early commits were rewritten by later refactors (old structure visible in early commits, new structure in late ones)
- Reviewer would need to read the whole branch as a flat diff anyway
- You want to produce a clean PR without rebasing onto the target branch

**Do NOT use this skill when:**
- You want to keep individual commits intact (use a commit-splitting workflow instead)
- The branch is already merged to the target
- You need to preserve commit authorship/dates for legal or audit reasons

## Non-Negotiable Rules

1. Never modify the original branch — create a new branch from it.
2. The final code of the review branch must be byte-for-byte identical to the original branch (verified by `git diff`).
3. Do not change any implementation logic to make commits cleaner.
4. Each commit must build (pass type check / lint) individually. Do not produce a commit that breaks the build mid-stack.
5. Detect and follow the project's commit convention before writing any commit message.
6. Do not use `--no-verify` for commits or pushes.
7. **Unit test placement (hybrid rule):**
   - Unit test that covers **exactly one source file** → include in the **same commit** as that file.
   - Unit test that spans multiple commits (integration-level) → place in the earliest commit whose code it verifies, or a dedicated `[test]` commit before E2E.
   - **E2E tests always go in a separate commit** — their CI lifecycle, flakiness risk, and infra dependency differ from unit tests.
8. Docs that explain a specific code change belong in that code commit, not a separate docs commit.

## Step 0: Detect Commit Convention

Before writing any commit message, detect the project's convention:

```bash
# 1. Check commitlint config
ls commitlint.config.* 2>/dev/null

# 2. Check husky hook
cat .husky/commit-msg 2>/dev/null | head -30

# 3. Check recent history pattern
git log --oneline -10
```

**Resolution order:**
1. `commitlint.config.*` → read and follow exactly
2. `.husky/commit-msg` → read the regex/pattern it enforces
3. Recent `git log` pattern → match the existing style
4. None found → use the **default convention** below

**Default convention (use when nothing is detected):**

```text
[type] 메시지

- 설명 (optional, multiple allowed)
```

Allowed types (default): `feat`, `fix`, `design`, `style`, `refactor`, `comment`, `docs`, `test`, `chore`, `rename`, `remove`, `ci`, `build`, `revert`

Rules:
- Header in Korean (or match the language used in recent commits)
- No trailing period on the subject line
- Body lines are flat bullets (`- 설명`), no nested bullets
- No mixed-language headers

## Workflow

### Step 1: Analyze the Branch

```bash
# Find the merge-base with the target branch (usually dev or main)
BASE=$(git merge-base <target-branch> HEAD)
echo "Merge base: $BASE"

# Count commits and summarize files
git log --oneline $BASE..HEAD --no-merges | wc -l
git log --oneline $BASE..HEAD --merges | wc -l
git diff --name-only $BASE..HEAD | sort

# Categorize: which files are new vs modified?
git diff --name-status $BASE..HEAD | sort

# Identify cross-feature changes (commits from merged PRs not part of main feature)
git log --oneline --merges $BASE..HEAD
```

**Cross-feature change detection:**
Merge commits from `origin/<other-branch>` are typically infrastructure or hotfix changes that happened to land in the branch. Identify their files:

```bash
# For each merge commit, see what files it brought in
git show --name-only <merge-commit-sha> | head -20

# Verify if those files also exist in the target branch
git show <target-branch>:<path/to/file> 2>/dev/null && echo "exists in target"
```

These can be included in their natural logical group or put in a `[chore]` commit at the end — do not exclude them unless they are already in the target branch.

### Step 2: Build the Commit Split Map

Before touching git, write down the full commit plan. Each entry:

```
Commit N: [type] 설명
  Files:
    - path/to/file1
    - path/to/file2
  Rationale: why these files belong together
```

**Grouping order (prefer this sequence):**

1. Types, domain model, contracts (`[feat]`)
2. Core logic: renderers, pure utilities, non-UI libs (`[feat]`)
3. API clients, event logging, upload utilities (`[feat]`)
4. Core hooks (internal, non-public) (`[feat]`)
5. Public hooks and feature barrel exports (`[feat]`)
6. UI components — drawer panels, forms, shared components (`[feat]`)
7. Widgets / entry-point shells (`[feat]`)
8. Editor/app integration — wiring into sidebars, menus, subheaders (`[feat]`)
9. Shared/common component extensions touched for this feature (`[feat]` or `[refactor]`)
10. E2E tests and CI config (`[test]` + `[ci]`)
11. Infrastructure: package.json, Docker, lint config (`[chore]`)

> **Unit tests are inline:** add each unit test file to the same commit as its source file. Only E2E tests and integration-level tests that span multiple commits get their own commit (see Rule 7).

**Adjust freely** — the order above is a heuristic, not a rule. Group by causal relationship, not by file extension or layer.

**Commit count guidance:**
- < 50 files changed → aim for 5–8 commits
- 50–120 files changed → aim for 10–15 commits
- 120+ files changed → consider splitting into multiple PRs first

### Step 3: Create the Review Branch

```bash
# Start from the tip of the original branch
git checkout -b <branch-name>-review <original-branch-name>

# Soft-reset to merge-base: all changes become unstaged
git reset --soft $BASE
git reset HEAD .     # move everything from index back to working tree

# Verify: all files should now be untracked/modified, no staged files
git status --short | head -20
git diff --cached --name-only  # should be empty
```

### Step 4: Commit by Group

For each group in your split map:

```bash
# Stage explicit files only — never use git add -A or git add .
git add src/features/myFeature/model/types.ts \
        src/features/myFeature/model/contracts.ts \
        src/types/element/MyType.ts

# Preview what's staged
git diff --cached --name-only
git diff --cached --stat

# Commit
git commit -m "[feat] 기능명 타입 정의 및 도메인 모델"

# Verify
git log --oneline -5
git status --short | wc -l   # remaining files count
```

**After every 2–3 commits, run a type check:**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

If the check fails mid-stack, add the missing dependency file to the current group or the previous commit using `git commit --amend` (only safe while the branch is local and not pushed).

### Step 5: Final Verification

```bash
# 1. All files committed — nothing left unstaged
git status --short   # should be empty or only untracked non-source files

# 2. Code is identical to original branch
git diff <original-branch-name> HEAD   # should be empty

# 3. Full project check
npm run check   # or project-equivalent: npx tsc --noEmit && npm test

# 4. Review the stack
git log --oneline $BASE..HEAD
```

If `git diff <original-branch-name> HEAD` is non-empty, a file was missed or incorrectly staged. Find the discrepancy:

```bash
git diff <original-branch-name> HEAD --name-only
```

Fix by amending the relevant commit or adding a fixup commit, then re-verify.

## Commit Message Contract

Use the project-detected convention (Step 0). When the default applies:

```text
[type] 메시지

- 설명 (optional)
```

**Examples:**

```text
[feat] QR/바코드 타입 정의 및 도메인 모델
```

```text
[feat] QR/바코드 코어 훅 - 생성, 적용, 미리보기

- useQrBarcodeGenerate: SVG 생성 및 S3 업로드 트리거
- useQrBarcodeApply: draft를 캔버스 오브젝트에 적용
- useQrBarcodePreview: 미리보기 이미지 디바운스 생성
```

```text
[test] QR/바코드 E2E 테스트 및 CI 설정
```

```text
[chore] oxlint 설정, Docker, 패키지 업데이트
```

Avoid:
- Subject ending with `.`
- Nested bullets in body
- English subjects when the project uses Korean (or vice versa)
- Vague messages like `[refactor] 코드 정리` without specifying what

## Reference Files

- `references/rewrite-playbook.md`

Read the playbook for detailed heuristics, the QR/barcode worked example, and edge-case handling.
