# Commit Splitting Playbook

Use this reference to make commit stacks easy to review, easy to revert, and predictable for collaborators.

## 0. Preflight Gate

Run this first before any split plan:

```bash
npm run check
```

If check fails, fix lint/type errors first. Most pre-commit failures come from unresolved check errors.

## 1. Split Order Heuristic

Prefer this order when possible:

1. `refactor` foundations (type/model/store cleanup)
2. entrypoint wiring (`hooks`, handlers, route-in paths)
3. UI behavior blocks (overlay, interaction guard, view-layer constraints)
4. execution/runtime flow changes
5. tests
6. docs coupled with related code changes

If tests/docs are tightly coupled to one code commit, keep them together.
Avoid docs-only commits when docs explain behavior introduced in the same stack.

## 2. Scope Quality Checklist

Each commit should satisfy all:

- One primary intent
- Files are causally related
- Commit message matches actual diff
- Reverting this commit alone does not partially break unrelated flows

Red flags:

- Same commit contains refactor + feature + docs + test without clear coupling
- "misc", "정리", "수정" style subjects with unclear domain
- Massive commit with no staged-file preview
- docs-only commit even though docs map directly to an adjacent code commit

## 3. Command Sequence (Safe Default)

```bash
git status --short --branch
git diff --name-only
git log --oneline --decorate -n 20

# for each commit group
git add <explicit files...>
git diff --cached --name-only
git diff --cached
git commit

# periodic check
git status --short
git log --oneline --decorate -n 10
```

Never default to `git add -A` for split commits.

## 3.1 Delivery Guardrails

- Do not use `git push --no-verify`.
- Prefer fixing root-cause lint/type errors over bypassing hooks.

## 4. Korean Message Templates

### Minimal

```text
[refactor] 스타일 변환 툴 모드 의존 제거
```

### With body

```text
[feat] 스타일 변환 결과 확인 서브드로워 추가

- 생성 결과를 적용 취소 게이트로 분리
- 취소 시 원본 복원 경로를 명시적으로 유지
```

### Docs

```text
[docs] 스타일 변환 포커스 모드 변경점 문서화

- 의사결정 로그에 배경과 영향 경로 기록
- README의 UX 흐름과 API 섹션 갱신
```

## 5. Lint-Staged Side Effects

If pre-commit tools rewrite files:

1. Check rewritten files immediately: `git status --short`
2. Keep rewrite in current commit only when logically same scope
3. Otherwise unstage and re-stage in the proper next commit

Do not hide formatter-driven file drift between unrelated commits.
