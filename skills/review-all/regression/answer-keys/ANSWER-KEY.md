# Answer Key (에이전트에게 절대 노출 X)

> 픽스처는 `~/.agents/skills/review-all/regression/fixtures/`, 정답지만 여기(스킬 트리 밖)에 둔다 — 리뷰어 서브에이전트가 디렉토리를 훑다가 답을 보면 측정이 무의미해지기 때문. 절차는 `regression/README.md`.
> acid 도메인은 `acid-ANSWER-KEY.md` 참조.

채점 축:
- **Recall**: 심은 진짜 결함을 잡았나
- **FP(오탐)**: 상 수준 코드의 "괜찮은 것"을 지적했나 (기계적 적용 지표)
- **문서역행**: 문서가 명시적으로 금지한 지적을 했나 (핵심)
- **Calibration**: overallLevel이 실제 수준(하/중/상)과 맞나

---

## comment-bad (하) — 진짜 결함 5, 함정 없음
1. 코드 그대로 읽는 주석: `// 알림을 보낸다` `// 사용자 ID로...` `// 사용자가 없으면 리턴` `// 3번 반복` `// 성공하면 루프 빠져나간다` (§1,2)
2. 변경 이력 주석 블록 (2024~2025 3줄) (§13)
3. 삼켜진 예외 `catch (e) { // 무시 }` — 로그/재처리 없음 (§11)
4. 주석 처리된 legacy 코드 3줄 (§14)
5. 저질 TODO `// TODO: 나중에 수정` (§10)
- 기대: Recall 높아야 정상. 잡기 쉬움.

## comment-medium (중) — 진짜 2 + 미묘한 누락 1
1. `// 총액을 계산한다` 코드 반복 (§1, minor)
2. `// 30일을 초로 계산한다` 숫자 의미 반복, WHY(왜 30일) 없음 (§3)
3. **[미묘/누락]** `fetchExchangeRate`의 `await sleep(500)` — 두 API 호출 사이 원인 설명 없는 대기. 외부 제약 주석이 있어야 하는데 없음 (§5). 도메인 맥락 없이 잡기 어려움 → **판별력 높은 항목**
- 기대: 1,2는 대체로 잡음. 3을 잡으면 "누락된 주석"까지 보는 우수 리뷰어.

## comment-good (상) — 진짜 결함 ~0, 함정 3
- 모든 주석이 WHY/제약/티켓(SEC-142, API-381)/eslint 근거. 전부 정당.
- **함정**: "주석이 장황하다/불필요/제거", "eslint-disable 나쁨", "매직넘버 1000/5 설명 필요" → 하면 **FP + 문서역행**
- 허용 catch(FP 아님): `useEditor`에서 미사용 흐름 등 순수 코드 지적, overallLevel=high
- 기대: findings 거의 비어야 정상.

## test-bad (하) — 진짜 결함 4, 함정 없음
1. `주문을 생성한다`: 과잉 mock + `toHaveBeenCalled`만, 결과 검증 0 (§1,3)
2. `없는 주문 조회`: `await` 빠진 `rejects` (§7) + `toThrow()` 구체 에러 없음 (§19)
3. `상품 상세`: `toMatchSnapshot` 남용 (§10)
4. `할인 분기 실행`: `not.toThrow`만, 실질 검증 0 (§11)
- 기대: Recall 높아야 정상.

## test-medium (중) — 진짜 2 (하나는 미묘)
1. `장바구니 총액`: **기대값을 프로덕션과 같은 reduce로 계산** (§8) — 미묘, 판별력 높음
2. `할인 적용`: 결과 대신 `toHaveBeenCalledTimes` 호출횟수 검증 (§4)
- 기대: 2는 흔히 잡음. 1(자기복제 기대값)을 잡으면 우수.

## test-good (상) — 진짜 결함 ~0, 함정 3
- 실제 도메인 객체(InMemoryRepo, PriceCalculator) 사용, 경계(payment/email)만 mock, 행위 검증, 메일 1회 발송은 **정당한 interaction 검증**(§호출검증 필요), 구체 에러 타입(§19).
- **함정**: "priceCalculator를 mock해라", "InMemoryRepository 대신 mock 써라", "메일 호출 검증은 구현 디테일이니 빼라" → 하면 **FP + 문서역행**
- 기대: findings 거의 비어야 정상.

## comment-gaps (하) — 진짜 결함 4, 함정 3 · **2026-08-14 신설**

2026-08-14 에 추가한 comments 신호 5개의 양성 확인용.

1. `buildSearchQuery` 주석: 코드 재진술 + **실제 코드와 어긋남**(주석은 "20 단위", 코드는 `* 50`). 낡은 주석의 가장 흔한 형태
2. `pickRenderer` "성능을 위해 Map 을 사용한다": 재진술이면서 근거를 참칭 — 무엇이 느렸는지·어떤 규모인지 없음
3. `pickRenderer` 의 `eslint-disable-next-line`(근거 없음) + `as any`
4. `flushMetrics`: catch 에 이유 주석은 있으나 **로그·재처리가 전혀 없음** — "이유 없이 삼킴"보다 한 겹 위

**함정** (지적하면 FP):
- `syncLegacyOrder`: 외부 제약·제거 조건·티켓(TICKET-4412) 3요소 완비 → 정당
- `resolveTimeout`: 매직값에 근거와 티켓(SUP-902) → 정당. "매직값 상수로 빼라"도 주석 렌즈 밖
- `normalizePhone`: `eslint-disable` 에 `--` 로 근거 명시 → 정당

## test-gaps (하) — 진짜 결함 4, 함정 4 · **2026-08-14 신설**

2026-08-14 에 추가한 tests 신호 5개 + **넓은 신호 교정 3개**의 확인용. 함정 4개가 핵심이다 — 그중 순서 검증은 교정 전 압축본이 **오탐으로 잡던** 것이다.

1. `'주문을 생성하면 결과가 저장된다'`: `toHaveBeenCalled` 호출 여부만 검증 + `validator`·`priceRule`(유효성 규칙·계산 로직) 과잉 mock
2. `sleep(1000)` 고정 대기로 비동기 완료 기다림
3. `'생성된 주문의 스냅샷'`: 생성 UUID·`createdAt` 을 `toEqual` 로 통째 고정 (주입 없음)
4. `Date.now() - started` 를 `toBeLessThan(100)` — 환경 의존 시간 단언

**함정** (지적하면 FP):
- `toHaveBeenCalledBefore(saveSpy)`: 승인→저장 순서가 정합성 계약(테스트 이름이 계약을 명시) → 정당. **교정 전이면 "순서는 구현 디테일"로 잘못 잡힌다**
- 큐 이벤트 `toEqual({version, eventType, ...})`: 직렬화가 외부 계약 → 정당
- `querySpy toHaveBeenCalledTimes(1)`: N+1 방지, 성능이 요구사항 → 정당(호출 횟수 검증이라는 이유만으로 지적 금지)
- `FixedClock` 주입 후 `createdAt` 고정: 시계를 주입했으므로 3번과 달리 정당

## solid-bad (하) — 진짜 결함 4, 함정 없음
1. `OrderService.createOrder`: 검증+ORM+할인정책+메일+템플릿 혼재 = SRP 위반
2. `PaymentService`: 결제수단 if-체인이 pay/cancel 두 곳에 중복 = OCP (신설 시 여러 곳 수정)
3. `createUser(email, boolean, boolean, number)`: 불리언·원시값 인자 나열 (§clean-5)
4. `throw new Error('Invalid quantity')`·`'Product not found'`·`'unsupported payment method'`: 오류 종류·코드·문제 입력이 없는 뭉뚱그린 메시지 (§clean-6). **2026-08-14 신호 추가분** — 그 전 baseline에는 없던 항목이라 과거 실측치와 직접 비교 금지
- 기대: Recall 높아야 정상.

## solid-medium (중) — 애매, 경미 2
1. `calculate(order, includeShipping: boolean)`: 불리언 파라미터 (§clean-5, 경미)
2. `getUserProfile(id, prisma)`: 함수가 ORM 직접 받음 (§DIP 경미/논쟁적)
- 강한 SRP/OCP 위반 없음, 반복 없음(Rule of Three 미발동).
- **판별력**: 여기서 "Repository 추상화 강제", "인터페이스 뽑아라"로 과열되면 과설계 성향. 경미하게만 짚으면 좋은 캘리브레이션.

## solid-good (상) — 진짜 결함 ~0, 함정 3
1. `CreateOrderUseCase`: 협력객체 여러 개 호출 = 유스케이스 조율, 올바른 SRP.
   **함정**: "한 클래스가 너무 많은 일을 한다/쪼개라"
2. `orderStatusLabel` switch(닫힌 enum): 문서가 명시적으로 OK 한 케이스 (§OCP "조건문이 항상 나쁜 것은 아니다").
   **함정**: "전략 패턴 써라/OCP 위반"
3. `SlackNotifier` 단일 구현, 인터페이스 없음: 문서 "구현체 1개뿐이면 인터페이스 만들지 마라"(§DIP 래핑 경고).
   **함정**: "DIP 위해 인터페이스 뽑아라"(강제 시 문서역행)
- 허용 catch(FP 아님): `orderStatusLabel` default 없음 → exhaustiveness 지적은 정당한 minor. `SlackNotifier.notify` 의 `!res.ok` 미검증(other/minor)도 진짜 결함이라 정당.
- 허용 catch(FP 아님, **2026-08-14 추가**): "유스케이스·상태 라벨·Slack 어댑터가 **한 파일에** 있다"는 모듈 응집도 nit. 세 조각을 한 파일에 넣은 건 픽스처 편의이고, 리뷰어 입장에선 정당한 지적이다. **함정 3종과는 다른 사안**이므로 감점하지 않는다 — 다만 이게 major 이상이거나 "유스케이스를 쪼개라"로 번지면 함정에 걸린 것.
- 기대: 진짜 findings 거의 없음.

## solid-good2 (상) — 진짜 결함 ~0, 함정 3
1. `slugify`·`shippingFee`: 안정적 순수 유틸. 문서 "안정적 순수 유틸·언어 기본기능 래핑 요구 금지".
   **함정**: "유틸을 인터페이스/서비스로 감싸라", "shippingFee 금액을 값 객체로"
2. `shippingFee`의 `'STANDARD'|'EXPRESS'` 삼항: 닫힌 유니온 소수 분기 = 문서가 명시적으로 OK 한 케이스.
   **함정**: "전략 패턴 써라/OCP 위반"
3. `CheckoutUseCase.execute`: 협력객체 5개(cart·inventory·payment·orders·receipts) 생성자 주입 + 순차 호출 = 유스케이스 조율, 올바른 SRP. 포트 인터페이스로 이미 DIP 충족.
   **함정**: "생성자 인자가 많다/쪼개라", "너무 많은 일을 한다"
- 기대: primary 빈 배열. (solid-good보다 "인자 수" 함정이 강해 과열 리뷰어를 거른다)

## solid-complexity (하) — 진짜 결함 5, 함정 2 · **2026-08-14 신설**

2026-08-14 에 추가한 신호 5개(LSP·불변조건 흩어짐·상태 조합 모순·중첩 임계·오류 구체성)의 **양성 확인용**. 기존 픽스처엔 이 신호들의 사례가 없어 "아무것도 안 잡는 신호"도 오탐 0으로 통과했다.

1. `collectUsableCoupons`: `if > for > if > for > if` = 중첩 5단. 가드절·`filter`/`flatMap` 로 평탄화 가능 (강한 신호)
2. `couponLabel`: 3단 중첩 삼항 (강한 신호). 조건이 순차 우선순위라 조기 반환 또는 조회 테이블로 풀린다
3. `validateCoupon` → `applyCoupon`: `{isValid, isExpired}` boolean 2개 반환을 호출부가 조합 분기. **4조합 중 `isValid && isExpired` 는 발생 불가**(만료면 유효할 수 없음)인데 마지막 `return amount` 가 그 죽은 경로를 조용히 삼킨다 → 판별 유니온(`'VALID'|'EXPIRED'|'REVOKED'`) 하나로 (강한 신호)
4. `ReadOnlyArchiveStorage`: `write`·`delete` 가 `throw new Error('not supported')` — `FileStorage` 계약을 구현체가 깸. 호출자가 구현체 종류를 알아야 함 → 인터페이스 분리 (강한 신호, §LSP)
5. `shipOrder`: `status`·`trackingNumber`·`shippedAt` 세 필드를 호출부가 직접 세팅. 결제 완료 여부·취소 여부 검증이 어디에도 없음 → `Order.startShipping()` 으로 불변 조건을 객체 안에 (강한 신호, §clean-4)

**함정** (지적하면 FP — 2026-08-14 지적 금지에 명시):
- `shippingFeeFor` 의 `method === 'EXPRESS' ? 5000 : 2500` 단일 삼항, 그리고 `if(total>=50000){ if(method==='STANDARD') }` **2단 중첩** — 조건이 서로 독립이고 평탄화해도 짧아지지 않는다. "깊이만 이유로" 지적하면 FP
- `throw new InvalidCouponError(coupon.id, 'EXPIRED')` — 오류 종류·코드·문제 입력이 다 있는 **모범** 사례. 오류 신호가 여기 걸리면 FP

- 기대: 강한 신호 5개 검출, 함정 2종 침묵. **함정에 걸리면 새 신호는 되돌리는 게 맞다** — 오탐 0이 이 렌즈의 값어치였다.
- 배정 주의: `orders.save(order)` 때문에 **acid 프리필터에도 걸린다**. acid 렌즈가 붙는 건 정상이고, 트랜잭션 결함은 없으므로 **acid 는 빈 배열이 정답**이다.
- 허용 catch(FP 아님): `applyCoupon` 마지막 `return amount` 가 **도달 불가 죽은 코드**라는 지적. 3번의 파생이라 별개로 세지 않되, 잡으면 가점.
- **2026-08-14 실측**: solid 렌즈 1패스에서 5/5 검출·함정 2종 침묵. 파일명을 `coupon-shipping.ts` 로 바꿔 정답 힌트를 지우고 실제 프로덕션 코드 2개와 섞어 물렸다.
