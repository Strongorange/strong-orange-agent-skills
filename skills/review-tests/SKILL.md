---
name: review-tests
description: Review test code for weak assertions, over-mocking, and implementation-detail coupling. Use when the user asks to review tests or check test quality, or as part of a code review of test files. Triggers include "테스트 리뷰", "테스트 점검", "review tests", "check test quality".
---

# 테스트 렌즈 (review-tests)

테스트의 **검증 품질만** 평가한다. 테스트 대상 코드(SUT)의 로직 버그는 `other` 버킷.

> **원문**: 이 스킬 디렉토리의 `references/guide.md` (동봉 — 외부 경로 의존 없음)
> 아래 목록은 그 문서의 압축본이고, `§N`은 원문의 절 번호(§1 미검증 테스트, §2 구현 디테일, §3 과잉 모킹, §4 호출여부 검증, §5 약한 검증, §7 비동기 미대기, §8 기대값 자기복제, §10 거대 스냅샷)다. **이 목록에 없는 항목은 지적하지 않는다.** 특히 원문의 15번(한 테스트에 너무 많은 기능) · 16번(과분할) · 18번(계층 선택) · 20번(무의미 기본값) 절은 쓰지 않는다. 애매하면 목록에 있는 항목을 판정할 때만 해당 절을 읽는다.

## 실행

1. **대상 결정**: 인자로 주어진 테스트 파일, 없으면 `git diff` 변경 파일 중 테스트(`*.test.ts`, `*.spec.ts`, `__tests__/` 등). **기본 브랜치를 `main`으로 하드코딩하지 말 것** — 레포마다 다르다(`dev`·`master`·`trunk` 등).
   ```bash
   git diff --name-only --diff-filter=d HEAD             # staged + unstaged (--diff-filter=d: 삭제 파일 제외)
   BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD)  # 비어 있으면 PR base 나 사용자가 알려 준 브랜치
   git diff --name-only --diff-filter=d "$BASE...HEAD"   # 브랜치 변경분
   ```
2. 각 파일에 아래 **게이트**·목록 적용.
3. `primary`(테스트 품질) / `other`(SUT 로직 등) 분리 보고.

## 게이트 (두 질문)

> 1) 구현을 완전히 다르게 바꿔도 같은 입력→같은 결과라면, 이 테스트는 통과해야 한다. 그런데 깨지는가? → **구현 디테일 결합. 지적**
> 2) 프로덕션에 실제 결함을 심으면 이 테스트가 실패하는가? → **아니오면 무의미한 테스트. 지적**

## 지적 대상 (primary)
- 결과가 아니라 호출 여부·횟수만 검증 (단 아래 금지 항목 참조)
- 과잉 mock: 순수 계산·도메인 객체·값 객체까지 대체해 실로직 미검증
- `await` 빠진 `rejects`/비동기 미대기, 완료 신호 누락
- 약한 검증: `not.toThrow`·`toBeDefined`만, 커버리지용 무-assert
- 기대값을 프로덕션과 **같은 로직**으로 계산(자기복제/동어반복)
- 사람이 검토 불가능한 거대 스냅샷
- 내부 보조함수 호출·순서 같은 구현 디테일 검증
- 테스트 간 공유 상태, 시간·난수 등 비결정성 의존
- `toThrow()`만 쓰고 에러 종류(코드/타입) 미검증
- **고정 `sleep`으로 비동기 완료 대기** (§13) — `await sleep(1000)`·`setTimeout` 으로 기다림. 느리고 간헐 실패한다 → 완료 조건 폴링·이벤트 대기·가짜 타이머
- **실행 시간을 밀리초로 고정하는 단언** — `elapsed < 100` 류. 환경 따라 깨진다 (쿼리 **횟수** 검증은 정당 — 아래 금지 참조)
- **비본질 동적 값을 통째로 고정** (§6) — 생성 UUID·`createdAt` 을 `toEqual` 로 박아 기능이 멀쩡해도 깨짐 → `toMatchObject` + `expect.any`. 단 그 값이 비즈니스 규칙이거나 `FixedClock`·`FixedIdGenerator` 를 주입했으면 정당
- **과잉 mock 확장** (3번 절 "모킹의 현실적인 기준") — 기존 3종(순수 계산·도메인 객체·값 객체) 외에 **유효성 규칙·데이터 변환 로직·쉽게 대체 가능한 저장소**를 mock 으로 대체한 것도 포함
- **프로덕션에 테스트 전용 분기** (§17) — `process.env.NODE_ENV === 'test'` 로 갈라져 실제 경로가 검증되지 않음. SUT 파일이 함께 주어졌을 때만 판정

## 지적 금지 (원문이 정당하다고 명시)
- 실제 도메인 객체·InMemory 저장소·순수 계산기 사용 → "mock 써라" 강요 금지
- 외부 경계(결제 승인·메일 발송 등)에 전달되는 명령의 1회 호출·인자 검증 → 정당한 interaction, 지적 금지
- 사용자 시나리오 블랙박스 테스트가 **크다는 이유만으로** 쪼개라 금지
- 함께 보장돼야 할 결과를 한 테스트에서 검증하는 것
- **순서가 정합성 계약인 경우의 순서 검증** — 저장 성공 후 이벤트 발행처럼 순서 자체가 계약이면 `toHaveBeenCalledBefore` 는 정당하다. 위 "내부 보조함수 호출·순서" 항목을 여기까지 넓히지 말 것
- **직렬화 형식이 외부 계약인 경우의 엄격 `toEqual`** — 큐 이벤트·파일 포맷·서명 문자열은 필드명·구조 고정이 정당. "거대 스냅샷" 지적을 여기 적용 금지
- **성능이 요구사항일 때의 쿼리·조회 횟수 검증** — 호출 횟수 검증이라는 이유만으로 지적 금지 (불안정한 건 시간 단언 쪽이다)

## 출력 계약
각 finding: `{ location, issue, severity, suggestion }`
- `primary`: 위 지적 대상만 / `other`: SUT 로직 등 / `overallLevel`: 테스트 **품질**(high=좋음 … low=나쁨, 심각도 아님)
- 없으면 빈 배열.

**severity 기준 (4렌즈 공통 — 병합 시 이 값으로 정렬하므로 벗어나지 말 것)**
`blocker` 데이터 손상·보안·머지 불가 / `major` 릴리스 전 고쳐야 함 / `minor` 고치면 좋음 / `nit` 취향·비강제
