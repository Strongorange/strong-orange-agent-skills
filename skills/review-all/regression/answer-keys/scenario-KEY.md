# 골든 시나리오 정답지 (3층) — 에이전트 노출 금지

`scenario/` 5파일에 `/review-all`을 **전 경로로 1회** 돌려 배정→fan-out→병합 연결을 확인한다.
채점 대상은 **버킷 배치·중복 제거·승격·프리필터 발화**다. 개별 지적의 정확도는 이미 렌즈 회귀(`fixtures/`)가 커버하므로 여기서 또 재지 않는다.

배정 정답은 `scenario-assignment.txt` (1층 `check-assignment.sh --check`가 자동 채점).

## 심어둔 것

| 파일 | 심은 것 | 이 파일이 고정하는 동작 |
|---|---|---|
| `cart.test.ts` | ① `not.toThrow`만 쓴 무의미 검증 ② `// 장바구니를 만든다` 중복 주석 | 테스트 파일에 **test + comment 둘 다** 붙나 (예전엔 comment가 배제됐음) |
| `orderService.ts` | order.create + product.update가 트랜잭션 밖 + read-modify-write 재고 차감 | acid 프리필터 발화 → 트랜잭션 버킷에 blocker/major |
| `payment.ts` | `res.ok` 미검증 (도메인 밖 결함) | 3렌즈가 각자 `other`에 올림 → **dedup 1건** + 승격 |
| `slugify.ts` | 결함 0, DB/외부호출 없음 | **acid 에이전트가 뜨면 안 됨** + "이상 없음" |
| `label.ts` | 닫힌 union `switch` (함정) | "전략패턴 써라" 나오면 오탐 |

## 합격 조건

- [ ] **프리필터**: 에이전트 라벨 목록에 `acid:slugify.ts`·`acid:label.ts`·`acid:cart.test.ts`가 **없다**. 이게 프리필터가 실제로 먹었다는 유일한 증거 — 보고서만 봐선 확인 불가
- [ ] **배정**: `comment:cart.test.ts`가 **있다**
- [ ] **버킷**: 트랜잭션 버킷에 orderService 지적, 테스트 버킷에 cart.test 지적, 주석 버킷에 cart.test 중복 주석. 서로 뒤섞이지 않는다
- [ ] **dedup**: payment.ts의 `res.ok` 사안이 기타 버킷에 1건만
- [ ] **승격**: 그 사안이 major 이상으로 매겨졌다면 맨 앞 요약 줄에도 등장
- [ ] **clean 표기**: slugify.ts·label.ts에 대한 지적이 0건이고, 억지로 채우지 않았다
- [ ] **함정**: label.ts에 "전략 패턴/enum 분기 제거" 지적이 없다 (있으면 오탐 + 문서역행)

## 채점 시 무시할 것 (FP 아님)

- orderService.ts를 설계 버킷에서 "SRP 섞임"으로 짚는 것 — 정당한 관찰
- cart.test.ts의 `checkout()` 자체가 미구현이라는 `other` 지적
- payment.ts 응답 타입이 `any`·응답 필드 미검증이라는 지적
- orderService.ts의 "검증 전 order.create → 고아 주문", "재고 음수 가능" — 심어둔 결함의 이웃 관찰이라 정당
- payment.ts의 멱등성 키 부재를 acid **primary**로 올리는 것 — 실제로 그렇다(심을 때 의도한 건 아니었으나 정당)

## 초회 실측 (2026-07-23)

7/7 PASS. 12 job(스크립트 산출 배정 그대로), 렌즈별 sonnet 1명.

여기서 드러난 것:
- **cross-bucket 중복 규칙 부재** — acid가 primary로 잡은 lost update를 comment·solid가 각자 `other`에 또 올려 기타 버킷이 트랜잭션 버킷의 복사본이 됐다. severity도 갈렸다(acid=major, solid=blocker). → §3에 dedup ②와 "담당 렌즈 severity 우선" 추가.
- **`slugify.ts` 픽스처에 진짜 결함이 있었다** — `'foo -- bar'` → `foo----bar`, 앞뒤 하이픈 미정리. 두 렌즈가 독립적으로 정당하게 잡았다. 오탐 측정용 픽스처는 깨끗해야 판정이 흐려지지 않으므로 `.replace(/[\s-]+/g,'-').replace(/^-|-$/g,'')`로 수정함. **다음 실행부터 slugify의 `other`도 0이어야 한다** — 여전히 나오면 그건 새 결함이거나 오탐이다.
