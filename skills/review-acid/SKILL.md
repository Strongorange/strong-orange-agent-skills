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
- **Lost Update**: read-modify-write로 갱신(조회 → 계산 → 저장)인데 원자적 조건부 UPDATE·락·버전이 없음. **작업 선점**(PENDING 조회 → `markProcessing`)도 같은 패턴 — 워커 여럿이 같은 작업을 집는다 → `FOR UPDATE SKIP LOCKED`·조건부 갱신
- **외부 호출이 트랜잭션 안**: 결제·메일·HTTP 등을 DB 트랜잭션 내부에서 호출(롤백 불가 + 락 장기화)
- **DB 커밋과 이벤트/메시지 발행 분리**: `db.create` 후 `bus.publish`를 트랜잭션·Outbox 없이 순차(유실 또는 유령 이벤트)
- **멱등성 부재**: 재시도 가능한 외부 호출/생성에 idempotency key·고유 제약이 없음. **소비자 쪽도 포함** — 브로커는 at-least-once 라 중복 전달되는데 핸들러에 `messageId` 처리 이력이 없음
- **트랜잭션 안 예외 삼킴**: `$transaction` 콜백에서 catch 후 rethrow 안 함 → 부분 커밋
- **앱 검증만으로 불변 보장**: "조회 후 없으면 생성"만으로 고유성(동시성 취약), DB 고유 제약 부재. **집합 조건도 포함**(§Phantom) — `count`·`findMany` 로 "활성 구독 N개 이하"를 검사한 뒤 생성하면 동시 요청에 뚫린다
- **트랜잭션 안 장시간 작업**: 파일 업로드·리포트 생성·외부 IO·거대 루프가 트랜잭션 내부
- **거대 배치 단일 트랜잭션**: 수만 건을 청크 없이 한 트랜잭션으로
- **무분별 재시도**: 재시도 불가 오류(검증·권한·제약위반)까지 무한/무조건 재시도
- **락 획득 순서 비일관**: 같은 자원 쌍을 트랜잭션마다 다른 순서로 잠금(데드락)
- **커밋 전 성공 응답**: DB 커밋 완료 전에 2xx 성공 반환
- **트랜잭션 안 `Promise.all`** (§안티패턴7): `tx` 핸들 쿼리를 `Promise.all` 로 묶음 — 트랜잭션은 연결 하나에 묶여 병렬이 아니고, 드라이버에 따라 순서·동작이 예측 불가
- **`try-catch` 를 롤백 수단으로 착각** (§200): 여러 DB 쓰기를 `try-catch` 로 감싸고 로그만 남김 — 이미 반영된 변경은 되돌아가지 않는다(출금만 되고 입금은 안 된 상태). 실패를 호출자에게 숨기는 것도 함께 지적
- **이미 붙어 있는 불필요한 트랜잭션** (§안티패턴1·3): 단순 조회 메서드나 **컨트롤러·핸들러 계층 전체**에 `@Transactional` — 연결 점유·HTTP 파싱까지 트랜잭션 포함. ※ 지적 금지의 "감싸라 요구 금지"는 리뷰어 제안을 막는 것이고, **이미 그렇게 된 코드는 지적 대상**이다
- **분산 락으로 유일성 보장** (§안티패턴8): Redis 락으로 중복 생성을 막고 DB 고유 제약이 없음 — 락 만료·네트워크 분할·프로세스 중단에 뚫린다. ※ 위와 같은 이유로 **기존 코드는 지적 대상**
- **외부 호출과 DB 저장의 순서** (§1748·1765): 트랜잭션 밖이어도 ① 외부 승인 성공 후 DB 저장 실패 → 기록 없는 고아 부수효과 ② 외부 호출 전에 최종 상태(`APPROVED`)를 먼저 기록 → 외부 실패 시 거짓 성공. 중간 상태(`PENDING`→`APPROVING`→`APPROVED`/`FAILED`)와 조건부 전이가 답
- **복제본에서 쓰기 직후 읽기** (§1490): 쓰기 후 곧바로 read replica 로 조회 — read-your-writes 가 깨진다. ※ 지적 금지의 "복제 지연을 커밋 유실로 오판 금지"와 다른 사안(그건 오진단 금지, 이건 실제 코드 패턴)
- **금액을 부동소수점으로** (§801): 금액을 `number` 로 계산·저장하고 최소 화폐 단위·반올림 시점이 없음. 스키마를 못 봤으면 그 사실을 issue 에 적고 severity 를 낮춘다
- **중첩 트랜잭션 가정** (§안티패턴6): 트랜잭션 안에서 또 트랜잭션을 여는 함수를 호출 — 재사용·별도 생성·savepoint 중 무엇인지 프레임워크마다 달라 내부만 커밋될 수 있다. `tx` 컨텍스트를 명시적으로 전달할 것. 호출부·피호출부 둘 다 봐야 판정되므로 한쪽만 주어졌으면 컨텍스트-갭으로 낮춰 적을 것

## 지적 금지 (원문이 명시적으로 반대)
- **단순 조회를 트랜잭션으로 감싸라 금지**
- **항상 최고 격리수준(Serializable) 요구 금지** — 격리는 성능이 아니라 필요한 이상현상만 막는 선택
- **충돌하지 않는 독립 작업을 억지로 한 트랜잭션에 묶으라 금지**
- **분산 락으로 DB 제약을 대체하라 금지** (반대로 DB 고유/CHECK 제약을 권할 것)
- 이미 **원자적 SQL**(조건부 `updateMany`·`decrement`)로 해결된 것을 락/트랜잭션으로 바꾸라 금지
- **외부 시스템까지 하나의 트랜잭션(2PC)으로 묶으라 금지** — Outbox·멱등성·보상이 정답
- 복제 지연/Read-your-writes를 "커밋 유실"로 오판 금지
- **비즈니스 규칙까지 DB 제약으로 옮기라 금지** (§749) — 취소 가능 여부·등급별 할인·상태 전이는 앱의 몫이다. 앱과 DB 양쪽에 검증이 있는 것을 **중복이라고 지적하지 말 것**(의도된 다층 방어)
- **긴 계산을 무조건 트랜잭션 밖으로 빼라 금지** (§2112) — 기준 시점 고정이 필요한 계산인지 먼저 따진다. 필요하면 스냅샷 격리·기준 시각·집계 테이블이 답
- **스키마·인프라를 못 본 상태에서 제약 부재를 단정 금지** — NOT NULL·FK·CHECK·격리 수준·복제 구성은 코드 파일에 없다. 추정해서 지적하지 말고, 필요하면 "스키마 확인 필요"로 낮춰 적을 것

## 제안 규칙 (suggestion 작성 시)
- **보호 수단 사다리** (§2686): 단일 원자적 SQL → DB 제약 → 조건부 갱신 → 낙관적 락 → 비관적 락 → 상위 격리 → 재시도 → 분산 조정. **낮은 칸으로 해결되면 높은 칸을 제안하지 말 것**
- **severity 는 ACID 우선순위를 따른다** (§2842): 비즈니스 불변 조건 > 데이터 손실·중복 > DB 제약 > 트랜잭션 경계 > 동시성 이상현상 > 실패·재시도 > 외부 상태 일치 > 운영 복구 > 처리량 > 우아함

## 약한 신호 (nit)
- 트랜잭션 범위가 정합성에 불필요한 작업까지 포함(과대)
- 멱등성 키는 있으나 **코드에 동일요청 확인 경로가 아예 없음**(조회·`upsert`·고유 위반 처리 중 아무것도 없음). ※ 스키마를 못 봐서 고유 제약 유무를 모르는 것만으로는 **지적하지 말 것** — 그건 발췌 리뷰에서 항상 참이라 상시 발동한다(위 "추정 단정 금지"와 같은 취지)

## 출력 계약
각 finding: `{ location, issue, severity, signal, suggestion }`
- `primary`: 위 지적 대상만 / `other`: 순수 로직·설계 / `overallLevel`: **트랜잭션 안전성**(high=안전 … low=위험, 심각도 아님)
- 없으면 빈 배열.

**severity 기준 (4렌즈 공통 — 병합 시 이 값으로 정렬하므로 벗어나지 말 것)**
`blocker` 데이터 손상·보안·머지 불가 / `major` 릴리스 전 고쳐야 함 / `minor` 고치면 좋음 / `nit` 취향·비강제. 스키마·불변조건을 못 본 컨텍스트-갭 지적은 blocker 금지(minor 이하).

## 검증됨
acid-bad 4/4·acid-medium 2/2(lost update·앱검증-only), acid-good/good2 하드 함정("트랜잭션 감싸/락 추가/독립작업 묶어") 오탐 0. baseline이 overallLevel을 역전(bad=high)한 걸 렌즈가 교정(bad=low). 회귀는 review-all 동봉 `regression/` 참조.

## v1.2 (2026-08-14) — 원문 전수 점검
원문 93개 절을 압축본과 대조해 갭 46건을 뽑고, **파일 하나로 판정 가능한 것만** 선별해 지적 대상 8줄·지적 금지 3줄·제안 규칙 2줄을 추가했다.

핵심은 **지적 금지에만 있어 기존 코드를 지적할 수 없던 3건**이다 — 단순 조회 `@Transactional`, 분산 락 유일성, 복제본 즉시 읽기. "리뷰어가 그렇게 요구하지 말라"만 적혀 있었고 "이미 그렇게 된 코드를 지적하라"가 없었다. 닫힌 게이트에서는 금지 문구가 지적 대상을 대신하지 못한다.

- 제외(46건 중 대부분): NOT NULL·FK·CHECK·부분 고유 인덱스 부재, 격리 수준·복제 구성, Dirty/Non-repeatable Read, Write Skew, 백업·가용성 — **스키마·인프라 파일 없이는 판정 불가**. 대신 "추정해서 단정 금지"를 지적 금지에 넣었다.
- **실측**: `acid-gaps.ts`(결함 8 + 함정 4) 1패스 — **8/8 검출, 함정 3종 침묵**. 스키마를 못 본 2건은 "이 파일에서 확인 불가"를 issue 에 적고 severity 를 낮췄다(컨텍스트-갭 규칙 준수).
