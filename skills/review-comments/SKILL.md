---
name: review-comments
description: Review code comments for redundancy, staleness, and missing rationale. Use when the user asks to review comments, check comment quality, or as part of a code review — flags comments that merely restate code, change-history blocks, commented-out code, untrackable TODOs, silently-swallowed exceptions, and missing WHY on non-obvious code, while deliberately leaving legitimate rationale/constraint/ticket comments alone. Triggers include "주석 리뷰", "주석 점검", "review comments", "check comments".
---

# 주석 렌즈 (review-comments)

주석 **품질만** 평가하는 단일 렌즈 리뷰. 맨몸 리뷰어가 자연히 건너뛰는 관심사라, 이 렌즈의 가치는 "누락된 주석 렌즈를 강제"하는 것이다.

> **원문**: 이 스킬 디렉토리의 `references/guide.md` (동봉 — 외부 경로 의존 없음)
> 아래 목록은 그 문서의 압축본이고, `§N`은 원문의 절 번호(§1 동작 서술, §10 TODO, §11 예외 무시, §12 타입단언·린트, §13 변경이력, §14 죽은 코드)다. **판단이 애매하면 해당 절을 직접 읽고 결정한다.**

## 실행

1. **대상 결정**
   - 인자로 파일/경로가 주어지면 그 파일들.
   - 없으면 `git diff` 변경 파일. **기본 브랜치를 `main`으로 하드코딩하지 말 것** — 레포마다 다르다(`dev`·`master`·`trunk` 등). 변경 hunk 위주로 본다.
     ```bash
     git diff --name-only --diff-filter=d HEAD             # staged + unstaged (--diff-filter=d: 삭제 파일 제외)
     BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD || echo origin/main)
     git diff --name-only --diff-filter=d "$BASE...HEAD"   # 브랜치 변경분
     ```
2. 각 대상 파일에 아래 **게이트**와 **지적/금지 목록**을 그대로 적용한다.
3. 결과를 `primary`(주석 findings)와 `other`(주석 외 정당한 지적, 낮은 우선순위)로 분리해 보고한다.

## 게이트 (지적 여부의 단일 기준)

> 이 주석을 지웠을 때, 코드만 봐서는 알 수 없는 정보가 사라지는가?
> - 사라지는 게 없다 → **중복 주석. 지적(제거 대상)**
> - 사라지는 게 있다(이유·제약·근거·티켓) → **가치 있는 주석. 지적하지 말 것**

## 지적 대상 (primary)
- 코드를 그대로 서술하는 주석: 동작·조건문·자료구조를 자연어로 반복
- 변경 이력 주석(날짜·작성자·"기존엔 X였는데")
- 주석 처리된 죽은 코드
- 추적 불가 TODO: 이슈·이유·완료조건 중 아무것도 없음
- 이유 없이 예외를 삼키는 `catch` 주석("무시")
- 숫자·정규식·매직값의 **의미만 반복**하고 WHY(정책·근거·티켓)가 없는 주석
- 비직관적 코드(순서 제약·외부 시스템 제약·성능 트릭)인데 WHY 주석이 **없음** (누락도 지적)

## 지적 금지 (원문이 명시적으로 정당하다고 한 것)
- WHY·제약·근거·티켓(예: SEC-142, API-381)을 설명하는 주석 — 장황해 보여도 유지. "빼라" 금지
- 정당한 근거가 붙은 `eslint-disable`·타입 단언
- 비즈니스 정책을 드러내는 주석
- 매직값에 "왜 그 값인지"가 이미 붙어 있으면 지적 금지

## 출력 계약
각 finding: `{ location, issue(무엇이 왜), severity(blocker|major|minor|nit), suggestion }`
- `primary`: 위 지적 대상만
- `other`: 주석 외 눈에 띈 정당한 지적(로직·설계). 낮은 우선순위, 억지로 채우지 말 것
- `overallLevel`: 주석 **품질**(high=좋음 … low=나쁨). 심각도가 아니다.
- 지적할 게 없으면 빈 배열. 없는 게 정상이다.

**severity 기준 (4렌즈 공통 — 병합 시 이 값으로 정렬하므로 벗어나지 말 것)**
`blocker` 데이터 손상·보안·머지 불가 / `major` 릴리스 전 고쳐야 함 / `minor` 고치면 좋음 / `nit` 취향·비강제

## 검증됨
comment-good 픽스처(정당한 WHY·티켓·eslint 주석)에서 오탐 0, comment-medium(맨몸 리뷰어가 0/2로 놓친 중복·매직 주석)에서 3/3 회복. 회귀 재검증 절차는 review-all 동봉 `regression/README.md` 참조.
