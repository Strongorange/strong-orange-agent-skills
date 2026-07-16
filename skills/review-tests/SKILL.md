---
name: review-tests
description: Review test code for weak/meaningless assertions, over-mocking, and implementation-detail coupling. Use when the user asks to review tests, check test quality, or as part of a code review of test files — flags call-only assertions, over-mocked domain logic, missing await on async assertions, coverage-only no-assert tests, self-mirroring expected values, giant snapshots, and shared state, while leaving real-domain-object tests and legitimate boundary interaction checks alone. Triggers include "테스트 리뷰", "테스트 점검", "review tests", "check test quality".
---

# 테스트 렌즈 (review-tests)

테스트의 **검증 품질만** 평가한다. 테스트 대상 코드(SUT)의 로직 버그는 `other` 버킷.

## 실행

1. **대상 결정**: 인자로 주어진 테스트 파일, 없으면 `git diff` 변경 파일 중 테스트(`*.test.ts`, `*.spec.ts`, `__tests__/` 등).
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

## 지적 금지 (원문이 정당하다고 명시)
- 실제 도메인 객체·InMemory 저장소·순수 계산기 사용 → "mock 써라" 강요 금지
- 외부 경계(결제 승인·메일 발송 등)에 전달되는 명령의 1회 호출·인자 검증 → 정당한 interaction, 지적 금지
- 사용자 시나리오 블랙박스 테스트가 **크다는 이유만으로** 쪼개라 금지
- 함께 보장돼야 할 결과를 한 테스트에서 검증하는 것

## 출력 계약
각 finding: `{ location, issue, severity, suggestion }`
- `primary`: 위 지적 대상만 / `other`: SUT 로직 등 / `overallLevel`: 테스트 품질 high|medium|low
- 없으면 빈 배열.

## 검증됨
test-good(실 도메인객체·정당한 메일 발송 검증)에서 오탐 0, test-bad 4/4·test-medium 2/2 잡음. review-all 동봉 `regression/` 참조.
