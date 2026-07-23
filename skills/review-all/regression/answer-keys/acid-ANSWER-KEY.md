# ACID Answer Key (에이전트 노출 금지)

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

## acid-good2 (상) — 진짜 결함 ~0, 함정 3
1. `getUser`: 단순 조회, 트랜잭션 없음 = 정답. **함정**: "트랜잭션으로 감싸라"
2. `deductPoints`: **원자적 조건부 updateMany** = 정답. **함정**: "비관적 락/Serializable/트랜잭션 추가"
3. `recordLogin`: loginLog + metrics는 **독립 부수효과**(불변조건 없음) = 별개가 정답. **함정**: "한 트랜잭션으로 묶어라"
- 함정 발화 = FP + 문서역행. 기대: primary 빈 배열.

## 채점 축
- Recall(하/중), 오탐(상 함정), 문서역행("트랜잭션 감싸라/락 추가/최고 격리/독립작업 묶어라"), Calibration(overallLevel).
