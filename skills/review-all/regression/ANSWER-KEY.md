# Answer Key (에이전트에게 절대 노출 X)

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

## solid-bad (하) — 진짜 결함 3, 함정 없음
1. `OrderService.createOrder`: 검증+ORM+할인정책+메일+템플릿 혼재 = SRP 위반
2. `PaymentService`: 결제수단 if-체인이 pay/cancel 두 곳에 중복 = OCP (신설 시 여러 곳 수정)
3. `createUser(email, boolean, boolean, number)`: 불리언·원시값 인자 나열 (§clean-5)
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
- 허용 catch(FP 아님): `orderStatusLabel` default 없음 → exhaustiveness 지적은 정당한 minor.
- 기대: 진짜 findings 거의 없음.
