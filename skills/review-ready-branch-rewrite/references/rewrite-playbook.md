# Branch Rewrite Playbook

Detailed reference for turning a completed messy branch into a clean, reviewable commit stack.

## Core Principle

> The original branch is the source of truth for **code**. The review branch is the source of truth for **story**.

Never sacrifice code correctness to tell a cleaner story. If a file logically belongs in two commits, put it in the earlier one (the one it unblocks).

## Preflight Checklist

Before creating the review branch:

```bash
# 1. Confirm you're on the original branch
git branch --show-current

# 2. Check the build is green on the original
npm run check        # or project equivalent

# 3. Count scope
git log --oneline $(git merge-base <target> HEAD)..HEAD --no-merges | wc -l
git diff --name-only $(git merge-base <target> HEAD)..HEAD | wc -l

# 4. Read commit convention
cat commitlint.config.* 2>/dev/null | head -30
cat .husky/commit-msg 2>/dev/null | head -30
git log --oneline -5
```

If the build fails on the original branch, fix it there first. Do not start the rewrite with a broken original.

## Grouping Heuristics

### Use Causal Coupling, Not Layering

**Wrong mental model:** "all types in one commit, all hooks in another, all UI in another"
**Right mental model:** "all the things that must exist together to make feature X work at commit N"

A commit should be independently comprehensible. Ask: "If someone checked out only this commit, would the code make sense?"

### The Initial-Commit Problem

When early commits in the original branch were rewritten by later refactors, **use the final state** for all files. Do not reconstruct the original structure — it no longer exists. The review branch shows the final architecture built incrementally, not the historical path taken.

Example: if `code/` was renamed to `qrBarcode/` in commit 30, the review branch commits use `qrBarcode/` from the start — commit 1 never mentions `code/`.

### Unit Test Placement (Hybrid Rule)

Do **not** create a single "unit tests" commit at the end. Instead:

| Test type | Where to place |
|-----------|----------------|
| Tests a single source file directly | Same commit as that source file |
| Integration-level (spans multiple modules) | Earliest commit whose code it verifies; or a `[test]` commit before E2E |
| E2E / browser-level tests | **Always a separate commit** |

**Why E2E tests stay separate:**
- CI pipelines typically run unit tests and E2E tests on different schedules/infra
- E2E tests have higher flakiness risk — isolating them makes git bisect easier
- Reverting an E2E test should never accidentally revert feature code

**Example (from QR/barcode rewrite):**
- `barcodeFormatSpec.test.ts` → committed in Commit 1 (types) alongside `barcodeFormatSpec.ts`
- `qrBarcodeRenderer.test.ts` → committed in Commit 2 (renderer) alongside `qrBarcodeRenderer.ts`
- `pasteObjects.test.ts` → committed in Commit 8 (editor integration) alongside `pasteObjects.ts`
- `barcode-happy-path.spec.ts` → committed in Commit 11 (E2E) — separate

### Cross-Feature Changes

Merges from other PRs (`Merge pull request #NNN`) that happened to land in the feature branch during development should be handled as follows:

1. Check if the files they modified are already in the target branch:
   ```bash
   git show <target-branch>:<path> 2>/dev/null && echo "already in target"
   ```

2. **If already in target:** Include the files in whatever logical group they fit. The diff will be zero for those files anyway.

3. **If NOT in target (rare):** Include them in a `[chore]` or `[fix]` commit at the end with a clear description of what they are.

Do not silently skip files — they must appear somewhere in the review branch.

## Command Reference

### Safe Staging Pattern

```bash
# Always stage explicitly — no wildcards, no git add -A
git add src/features/foo/model/types.ts
git add src/features/foo/model/contracts.ts
git add src/types/element/FooType.ts

# Review before committing
git diff --cached --name-only   # list staged files
git diff --cached --stat        # line counts per file

# Commit
git commit -m "[feat] Foo 타입 정의 및 도메인 모델"
```

### Mid-Stack Type Check

```bash
# Quick type-only check (fast)
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -5

# If errors: check which file is missing
npx tsc --noEmit 2>&1 | grep "Cannot find module" | head -5
# Add the missing file to the previous commit:
git add <missing-file>
git commit --amend --no-edit
```

Only use `--amend` while the branch is local and not yet pushed to remote.

### Verifying Identical Code

```bash
# Must produce no output
git diff <original-branch> HEAD

# If there is output, find missing files:
git diff <original-branch> HEAD --name-only

# Find which commit the file should have been in:
git log --oneline --all -- <path/to/file>
```

## Worked Example: QR/Barcode Feature (121 files, 65 commits → 12 commits)

This example documents the QR/barcode feature rewrite performed in April 2026.

**Original state:** `feature/qr-barcode` — 65 non-merge commits, 121 files, +7,154/-235 lines vs dev

**Resulting review branch:** `feature/qr-barcode-review` — 12 commits (unit tests inlined per-commit)

### Commit Map Used

```
Commit  1: [feat] QR/바코드 타입 정의 및 도메인 모델
  Code:
    - src/types/element/BarcodeType.ts
    - src/types/element/QrCodeType.ts
    - src/types/element/AllTypes.ts (QR type union addition)
    - src/types/element/RatioLockTypes.ts (QR type addition)
    - src/features/qrBarcode/model/qrBarcodeObject.ts
    - src/features/qrBarcode/model/qrBarcodeContracts.ts
    - src/features/qrBarcode/lib/barcodeFormatSpec.ts
    - src/features/qrBarcode/lib/qrBarcodeWarnings.ts
    - src/features/qrBarcode/lib/qrBarcodeColorTarget.ts
    - src/features/qrBarcode/lib/texts.ts
    - src/static/elements/prefix.ts
  Unit tests (inline):
    - src/features/qrBarcode/lib/barcodeFormatSpec.test.ts
    - src/features/qrBarcode/lib/qrBarcodeColorTarget.test.ts
    - src/features/qrBarcode/lib/qrBarcodeWarnings.test.ts
    - src/features/qrBarcode/model/qrBarcodeContracts.test.ts
    - src/features/qrBarcode/model/qrBarcodeObject.test.ts
    - src/types/element/RatioLockTypes.test.ts

Commit  2: [feat] QR/바코드 렌더러 및 SVG 에셋
  Code:
    - src/features/qrBarcode/lib/qrBarcodeRenderer.ts
    - public/icons/qrbrcode/ (14 SVG files)
    - src/features/qrBarcode/ui/qrBarcodeDrawer/qrShapeOptions.ts
  Unit tests (inline):
    - src/features/qrBarcode/lib/qrBarcodeRenderer.test.ts

Commit  3: [feat] QR/바코드 S3 업로드, 이벤트 API 및 로깅
  Code:
    - src/features/qrBarcode/lib/uploadQrBarcodeImageToS3.ts
    - src/apis/qrBarcodeEvent.ts
    - src/features/qrBarcode/logging/qrBarcodeLogging.ts
    - src/util/getS3UploadPath.ts
  Unit tests (inline):
    - src/features/qrBarcode/lib/uploadQrBarcodeImageToS3.test.ts
    - src/apis/qrBarcodeEvent.test.ts
    - src/features/qrBarcode/logging/qrBarcodeLogging.test.ts

Commit  4: [feat] QR/바코드 코어 훅 - 생성, 적용, 미리보기
  Code:
    - src/features/qrBarcode/hooks/internal/ (all source files)
  Unit tests (inline):
    - src/features/qrBarcode/hooks/internal/qrBarcodeDrawerKindAdapter.test.ts
    - src/features/qrBarcode/hooks/internal/useEditQrBarcodeDraftState.test.ts

Commit  5: [feat] QR/바코드 공개 훅 및 feature barrel
  Code:
    - src/features/qrBarcode/hooks/useQrBarcodeDrawer.ts
    - src/features/qrBarcode/hooks/useEditQrBarcodeDrawer.ts
    - src/features/qrBarcode/hooks/useSingleSelectedQrBarcodeTarget.ts
    - src/features/qrBarcode/index.ts
  Unit tests (inline):
    - src/features/qrBarcode/hooks/useQrBarcodeDrawer.test.ts
    - src/features/qrBarcode/hooks/useSingleSelectedQrBarcodeTarget.test.ts

Commit  6: [feat] QR/바코드 드로워 UI 컴포넌트
  Code:
    - src/features/qrBarcode/ui/ (all panel/form/card components)
  Unit tests: none (UI components tested via E2E)

Commit  7: [feat] QR/바코드 위젯 - 생성 및 편집 진입점
  Code:
    - src/widgets/qrbarcode-create-entry/ (all)
    - src/widgets/qrbarcode-edit-entry/ (all)
  Unit tests: none

Commit  8: [feat] QR/바코드 에디터 통합 - 사이드바, 서브헤더, 컨텍스트메뉴
  Code:
    - src/widgets/side-bar/config/sideBar.tsx
    - src/widgets/side-bar/ui/SideBar.tsx
    - src/static/subHeader/qrBarcode.ts + includeTarget.ts + index.tsx
    - src/features/contextMenu/ui/desktop/item/index.tsx + qrBarcode.tsx
    - src/features/contextMenu/ui/mobile/item/index.tsx + qrBarcode.tsx
    - src/shared/config/menu/menuItems.ts
    - src/util/loadElement.tsx + getObjectData.ts
    - src/functions/elements/common/pasteObjects.ts
  Unit tests (inline):
    - src/static/subHeader/qrBarcode.test.ts
    - src/features/contextMenu/ui/desktop/item/qrBarcode.test.ts
    - src/features/contextMenu/ui/mobile/item/qrBarcode.test.ts
    - src/util/getObjectData.qrBarcode.test.ts
    - src/functions/elements/common/pasteObjects.test.ts

Commit  9: [feat] 컬러 드로워 QR/바코드 연동 및 공용 컴포넌트 확장
  Code:
    - src/hooks/color/useColorDrawerActions.helpers.ts + useColorDrawerActions.ts
    - src/hooks/color/useColorDrawerEffects.helpers.ts + useColorDrawerEffects.ts
    - src/components/selection/shared/SegmentControl.tsx
    - src/components/common/shared/InfoCircleFilledIcon.tsx
    - src/components/subHeader/shared/button/Colors.tsx
  Unit tests (inline):
    - src/hooks/color/useColorDrawerActions.helpers.test.ts
    - src/hooks/color/useColorDrawerEffects.helpers.test.ts
    - src/components/selection/shared/SegmentControl.test.tsx

Commit 10: [feat] 사용자 파일 페이지네이션 API 및 공용 훅
  Code:
    - src/hooks/queries/useInfiniteUserUploadFileList.tsx
    - src/shared/lib/useDeferredFlag.ts
    - src/apis/content.ts
    - src/features/removeImageBackground/utils/removeImageBackgroundUtils.ts
  Unit tests: none

Commit 11: [test] QR/바코드 E2E 테스트 및 CI 설정
  - tests/e2e/editor/qrbarcode/qr-happy-path.spec.ts
  - tests/e2e/editor/qrbarcode/barcode-happy-path.spec.ts
  - .github/workflows/e2e-basic.yml

Commit 12: [chore] oxlint 설정, Docker, 패키지 업데이트
  - lint-staged.config.mjs
  - Dockerfile.localdev
  - .vscode/settings.json
  - docs/decisions/2026-03-26-lint-staged-oxlint-memory-guard.md
  - package.json
  - package-lock.json
```

### Key Decisions Made

**Why unit tests are inlined in each code commit (not a single test commit):**
Each test file covers exactly one source file. Inlining them means each commit is self-contained: the code and its verification land together. If commit 3 is reverted, the upload/API tests are reverted too — the change is atomic.

Tests that cover multiple modules (e.g., integration-level tests) would be placed in the earliest commit whose code they verify. E2E tests always stay separate (see below).

**Why E2E tests are separate (commit 11):**
E2E tests run on different CI infra, have higher flakiness risk, and their lifecycle is independent from unit tests. Reverting E2E tests should never accidentally revert feature code.

**Why chore is last (12):**
package.json and lock file changes are unrelated to the feature logic. Placing them last means reviewers can stop reading before commit 12 if they only care about the feature.

**Why color drawer (9) is after widgets (7):**
The color drawer hook changes extend existing code (not new feature code). Placing them after the new feature's widgets makes clear these are extensions to an existing system, not foundations.

## Edge Cases

### File Appears in Wrong Commit

If you realize a file belongs in an earlier commit after already committing the later group:
1. If the review branch is not yet pushed: use `git rebase -i` or `git commit --amend`
2. If pushed: add a fixup commit at the end, note it in the PR description

### Build Breaks Mid-Stack

If `npx tsc --noEmit` fails after commit N:
- The most common cause: a type is used before it's defined
- Move the type file to the commit before its first usage
- `git add <type-file> && git commit --amend --no-edit` (only while local)

### Very Large File Groups (50+ files in one category)

Split by sub-domain. For example, if there are 50 UI files:
- Commit A: core UI panels (drawer, main form)
- Commit B: sub-components, pickers, preview cards
- Commit C: mobile-specific UI variants

## Commit Count Guidelines

| Files Changed | Target Commits |
|---------------|---------------|
| < 30          | 3–5           |
| 30–80         | 6–10          |
| 80–150        | 10–15         |
| 150+          | Consider splitting into multiple PRs |
