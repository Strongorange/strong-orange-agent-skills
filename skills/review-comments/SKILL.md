---
name: review-comments
description: Review code comments for redundancy, staleness, and missing rationale. Use when the user asks to review comments, check comment quality, or as part of a code review — flags comments that merely restate code, change-history blocks, commented-out code, untrackable TODOs, silently-swallowed exceptions, and missing WHY on non-obvious code, while deliberately leaving legitimate rationale/constraint/ticket comments alone. Triggers include "주석 리뷰", "주석 점검", "review comments", "check comments".
---

# 주석 렌즈 (review-comments)

주석 **품질만** 평가하는 단일 렌즈 리뷰. 맨몸 리뷰어가 자연히 건너뛰는 관심사라, 이 렌즈의 가치는 "누락된 주석 렌즈를 강제"하는 것이다.

## 실행

1. **대상 결정**
   - 인자로 파일/경로가 주어지면 그 파일들.
   - 없으면 `git diff`(uncommitted + 현재 브랜치 vs main)의 변경 파일. `git diff --name-only main...HEAD` + `git diff --name-only`로 목록을 잡고, 변경 hunk 위주로 본다.
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
- `overallLevel`: 주석 품질 기준 high/medium/low
- 지적할 게 없으면 빈 배열. 없는 게 정상이다.

## 검증됨
comment-good 픽스처(정당한 WHY·티켓·eslint 주석)에서 오탐 0, comment-medium(맨몸 리뷰어가 0/2로 놓친 중복·매직 주석)에서 3/3 회복. 회귀 재검증은 review-all 동봉 `regression/`(fixtures + ANSWER-KEY) 참조.
