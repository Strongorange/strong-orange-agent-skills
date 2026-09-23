# ACID Answer Key (에이전트 노출 금지)

## acid-gaps (하) — 진짜 결함 8, 함정 4 · **2026-08-14 신설**

2026-08-14 전수 점검으로 추가한 acid 신호 8개의 양성 확인용. 그중 **셋(단순조회 `@Transactional`·분산 락 유일성·복제본 즉시 읽기)은 그동안 "지적 금지"에만 있어 기존 코드를 지적할 수 없던 항목**이다.

1. `findSettlement`: 단순 조회에 `@Transactional` — 연결 점유
2. `closeMonth`: `tx` 핸들 쿼리를 `Promise.all` 로 묶음 — 트랜잭션은 연결 하나라 병렬이 아니고 드라이버에 따라 깨진다
3. `transfer`: 두 `update` 를 `try-catch` 로 감싸고 로그만 — 출금만 되고 입금 안 된 상태가 남고, 실패가 호출자에게 안 알려진다
4. `registerVendor`: Redis 락으로 유일성 보장, DB 고유 제약 없음
5. `approvePayout`: 외부 이체 요청 **전에** `APPROVED` 를 먼저 기록 — 외부 실패 시 거짓 성공
6. `summaryAfterClose`: 쓰기 직후 read replica 조회 — read-your-writes 깨짐
7. `calculateFee`: 금액을 부동소수점으로 곱셈(`* 1.1`), 반올림 시점·최소 화폐 단위 없음
8. `claimNextJob`: PENDING 조회 → `update` 2단계 선점 — 워커 여럿이 같은 작업을 집는다

**함정** (지적하면 FP):
- `consumeCoupon`: 조건부 `updateMany` 로 이미 원자적 — "락 걸어라/트랜잭션으로 감싸라" 금지
- `sendWelcomeMail`·`recordLoginAt`: 단순 조회·단건 갱신 — "트랜잭션으로 감싸라" 금지
- 스키마가 주어지지 않았으므로 **NOT NULL·FK·CHECK 부재를 단정하는 지적** 금지(추정 금지)

허용 catch(FP 아님): `createSubscription` 에 활성 구독 유일 제약이 없다는 지적 — 집합 조건 신호의 경계 사례라 잡아도 감점하지 않는다.

## acid-bad (하) — 진짜 결함 4, 함정 없음
1. `createOrder`: order.create + product.update가 **트랜잭션 밖 별개 쓰기** → 원자성 분리(재고만/주문만 남음)
2. `transferMoney`: withdraw/deposit **트랜잭션 없음 + catch 로깅 후 삼킴** → 돈 증발
3. `pay`: `paymentGateway.approve`(외부)가 **$transaction 안** → 롤백 불가 + 락 장기화
4. `registerUser`: `user.create` 후 `eventBus.publish` **Outbox 없이 순차** → 이벤트 유실/유령 이벤트
- 기대: Recall 높아야 정상.

## acid-medium (중) — 진짜 2 (둘 다 미묘)
1. `decreaseStock`: **read-modify-write**(findUnique→검사→`stock: product.stock - quantity`) → Lost Update. 원자적 조건부 UPDATE/락 부재
2. `registerAccount`: **앱 검증만**(findUnique 후 create)으로 고유성 → 동시성 중복 생성. DB 고유 제약 부재
- 판별력: 둘 다 "겉보기엔 멀쩡"이라 맨몸이 놓치기 쉬움.

## acid-good (상) — 진짜 결함 ~0, 함정 없음(정석)
- 조건부 `updateMany`(원자적 재고 차감) + `order.create`를 한 트랜잭션 → 원자성+Lost Update 방지
- Outbox로 외부 결제 분리, idempotencyKey 보유
- 기대: primary 빈 배열.
- **2026-08-14 — 규칙과 픽스처 양쪽을 고쳤다.** 재판정에서 nit 1건이 나왔고, 두 가지 별개 원인이 겹쳐 있었다:
  1. **규칙 결함**: 약한 신호 문구의 `(컨텍스트-갭 포함)`이 **스키마 없는 발췌에서는 항상 참**이라 정석 코드에도 상시 발동했다. → "코드에 확인 경로가 아예 없을 때만"으로 좁힘.
  2. **픽스처 결함**: 좁힌 뒤 다시 돌렸더니 근거를 바꿔 또 나왔다 — `idempotencyKey` 를 `create` 의 data 로 **저장만** 하고 `where`·`onConflict`·위반 처리 어디에도 안 쓴다. 좁힌 조건에 정확히 부합하는 **정당한 지적**이었다. 즉 "정석" 라벨을 단 픽스처가 실제로는 멱등성을 절반만 구현하고 있었다. → `payment`·`outboxMessage` 를 `upsert`(키를 `where` 에 사용)로 고침.
  - 교훈: **오탐 측정용 clean 픽스처는 진짜로 깨끗해야 한다**(2026-07-23 `slugify` 사례와 같은 처리). 리뷰어가 두 번 독립적으로 짚은 건 대개 리뷰어가 맞다.

## acid-good2 (상) — 진짜 결함 ~0, 함정 3
1. `getUser`: 단순 조회, 트랜잭션 없음 = 정답. **함정**: "트랜잭션으로 감싸라"
2. `deductPoints`: **원자적 조건부 updateMany** = 정답. **함정**: "비관적 락/Serializable/트랜잭션 추가"
3. `recordLogin`: loginLog + metrics는 **독립 부수효과**(불변조건 없음) = 별개가 정답. **함정**: "한 트랜잭션으로 묶어라"
- 함정 발화 = FP + 문서역행. 기대: primary 빈 배열.

## 채점 축
- Recall(하/중), 오탐(상 함정), 문서역행("트랜잭션 감싸라/락 추가/최고 격리/독립작업 묶어라"), Calibration(overallLevel).
