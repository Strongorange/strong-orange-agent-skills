---
name: review-acid
description: Review transaction, concurrency, and data-integrity design (ACID) using an evidence-gated, anti-mechanical lens. Use when the user asks to review transactions, concurrency, data consistency, or as part of a code review of DB write paths — flags split atomicity, read-modify-write lost updates, external calls inside DB transactions, DB-commit-plus-event dual writes without an outbox, missing idempotency keys, swallowed exceptions in transactions, app-only uniqueness checks, and over-long transactions, while REFUSING to demand wrapping simple reads in transactions, always-serializable isolation, merging independent writes, or replacing DB constraints with distributed locks. Triggers include "트랜잭션 리뷰", "동시성 점검", "ACID 리뷰", "정합성 리뷰", "review transactions", "review concurrency".
---

# ACID·트랜잭션 렌즈 (review-acid)

트랜잭션 경계·동시성·멱등성·DB와 외부 시스템 정합성을 본다. **evidence-gated** — 관찰된 위험 패턴 없이는 침묵. 원문이 "모든 메서드에 트랜잭션 / 항상 최고 격리 / 분산 락 남용"을 경고하므로, 지적만큼 **참는 것**이 중요하다.

> **원문**: 이 스킬 디렉토리의 `references/guide.md` (동봉 — 외부 경로 의존 없음)
> 아래 목록은 그 문서의 압축본이다. ACID 각 축(Atomicity·Consistency·Isolation·Durability) 절과 "트랜잭션 범위가 너무 작은/큰 경우", "비즈니스 작업과 DB 트랜잭션은 다르다" 절이 지적·지적금지의 근거다. **판단이 애매하면 해당 절을 직접 읽고 결정한다.**

## 실행

1. **대상 결정**: 인자 파일, 없으면 `git diff` 변경 파일 중 **DB 쓰기·트랜잭션·외부 연동이 있는 것만**(없는 파일은 아예 대상에서 뺀다). **기본 브랜치를 `main`으로 하드코딩하지 말 것** — 레포마다 다르다(`dev`·`master`·`trunk` 등).
   ```bash
   git diff --name-only --diff-filter=d HEAD             # staged + unstaged (--diff-filter=d: 삭제 파일 제외)
   BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD || echo origin/main)
   git diff --name-only --diff-filter=d "$BASE...HEAD"   # 브랜치 변경분
   ```
2. 각 파일에 **게이트** 적용. 스키마·불변조건이 발췌에 없으면 단정 대신 그 사실을 issue에 명시(컨텍스트-갭은 blocker가 아니라 낮은 severity로).
3. `primary`(트랜잭션 findings) / `other`(순수 로직) 분리, 각 finding에 관찰한 `signal` 명시.

## 게이트 (evidence-gated)

> 지적하려면 코드에 **관찰되는 위험 패턴**을 인용해야 한다. "트랜잭션 쓰면 더 안전"만으로는 금지.
> 보조 질문: "이 패턴이 동시 요청/중간 장애 시 어떤 불변 조건을 깨나?" 답 못 하면 침묵.

## 지적 대상 (primary)
- **원자성 분리**: 함께 성패해야 할 DB 쓰기(주문+재고, 출금+입금)가 한 트랜잭션 밖에서 따로 실행됨
- **Lost Update**: read-modify-write로 갱신(조회 → 계산 → 저장)인데 원자적 조건부 UPDATE·락·버전이 없음
- **외부 호출이 트랜잭션 안**: 결제·메일·HTTP 등을 DB 트랜잭션 내부에서 호출(롤백 불가 + 락 장기화)
- **DB 커밋과 이벤트/메시지 발행 분리**: `db.create` 후 `bus.publish`를 트랜잭션·Outbox 없이 순차(유실 또는 유령 이벤트)
- **멱등성 부재**: 재시도 가능한 외부 호출/생성에 idempotency key·고유 제약이 없음
- **트랜잭션 안 예외 삼킴**: `$transaction` 콜백에서 catch 후 rethrow 안 함 → 부분 커밋
- **앱 검증만으로 불변 보장**: "조회 후 없으면 생성"만으로 고유성(동시성 취약), DB 고유 제약 부재
- **트랜잭션 안 장시간 작업**: 파일 업로드·리포트 생성·외부 IO·거대 루프가 트랜잭션 내부
- **거대 배치 단일 트랜잭션**: 수만 건을 청크 없이 한 트랜잭션으로
- **무분별 재시도**: 재시도 불가 오류(검증·권한·제약위반)까지 무한/무조건 재시도
- **락 획득 순서 비일관**: 같은 자원 쌍을 트랜잭션마다 다른 순서로 잠금(데드락)
- **커밋 전 성공 응답**: DB 커밋 완료 전에 2xx 성공 반환

## 지적 금지 (원문이 명시적으로 반대)
- **단순 조회를 트랜잭션으로 감싸라 금지**
- **항상 최고 격리수준(Serializable) 요구 금지** — 격리는 성능이 아니라 필요한 이상현상만 막는 선택
- **충돌하지 않는 독립 작업을 억지로 한 트랜잭션에 묶으라 금지**
- **분산 락으로 DB 제약을 대체하라 금지** (반대로 DB 고유/CHECK 제약을 권할 것)
- 이미 **원자적 SQL**(조건부 `updateMany`·`decrement`)로 해결된 것을 락/트랜잭션으로 바꾸라 금지
- **외부 시스템까지 하나의 트랜잭션(2PC)으로 묶으라 금지** — Outbox·멱등성·보상이 정답
- 복제 지연/Read-your-writes를 "커밋 유실"로 오판 금지

## 약한 신호 (nit)
- 트랜잭션 범위가 정합성에 불필요한 작업까지 포함(과대)
- 멱등성 키는 있으나 유효기간·동일요청 검증·처리중 응답 정책·고유 제약이 확인 안 됨(컨텍스트-갭 포함)

## 출력 계약
각 finding: `{ location, issue, severity, signal, suggestion }`
- `primary`: 위 지적 대상만 / `other`: 순수 로직·설계 / `overallLevel`: **트랜잭션 안전성**(high=안전 … low=위험, 심각도 아님)
- 없으면 빈 배열.

**severity 기준 (4렌즈 공통 — 병합 시 이 값으로 정렬하므로 벗어나지 말 것)**
`blocker` 데이터 손상·보안·머지 불가 / `major` 릴리스 전 고쳐야 함 / `minor` 고치면 좋음 / `nit` 취향·비강제. 스키마·불변조건을 못 본 컨텍스트-갭 지적은 blocker 금지(minor 이하).

## 검증됨
acid-bad 4/4·acid-medium 2/2(lost update·앱검증-only), acid-good/good2 하드 함정("트랜잭션 감싸/락 추가/독립작업 묶어") 오탐 0. baseline이 overallLevel을 역전(bad=high)한 걸 렌즈가 교정(bad=low). 회귀는 review-all 동봉 `regression/` 참조.
