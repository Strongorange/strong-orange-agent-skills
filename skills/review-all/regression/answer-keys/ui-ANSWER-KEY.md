# UI Answer Key (에이전트 노출 금지)

review-ui 렌즈 회귀용. 2026-10-20 신설.

## ui-bad (하) — 진짜 결함 4, 함정 3

1. `CartPanel`: 도메인 규칙이 본문에 있음 — `user.plan === 'pro' ? Math.floor(total * 0.8)` 할인, `user.credits >= payable` 크레딧 판단, `selected.length <= 10` 한도
2. `CartPanel`: `total` 을 `useState` + `useEffect` 로 동기화 — 렌더 중 계산하면 됨
3. `CartPanel`: `useEffect(() => onSelectionChange(selected))` 로 선택 상태를 부모에 복사 — 선택 상태는 부모가 가져야 함
4. `CartRow`: 말단이 `fetch` DELETE 를 직접 부르고 `res.status === 409` 로 분기

**함정** (지적하면 FP):
- `isConfirmOpen` · `isRemoving` 로컬 state — 상호작용 상태
- `payable.toLocaleString()` — 표시 포맷

허용 catch(FP 아님, `other` 로):
- `remove` 에 try/finally 가 없어 네트워크 오류 시 `isRemoving` 이 안 풀림
- 부모가 인라인 함수로 `onSelectionChange` 를 넘기면 effect 가 매 렌더 도는 문제
- `alert` 사용

## ui-medium (중) — 진짜 2 (하나는 nit)

1. `UploadBox`: 업로드 허용 조건(`20 * 1024 * 1024`, `['png', 'jpg', 'jpeg']`)을 본문에서 계산 — major. 뷰모델 `useUploadTool` 이 이미 있는데 규칙만 컴포넌트에 남은 모양이라 판별력 높음
2. `TemplateSearchScreen`: `keyword` · `category` · `page` 를 `useState` 에 둠 — URL 후보, nit

**함정** (지적하면 FP):
- `TemplateSearchScreen` 이 `useTemplateSearch` 를 부르는 것 — 화면 컴포넌트
- `UploadBox` 가 `useUploadTool` 을 부르는 것 — 신호 목록에 없음
- `isGuideOpen` 로컬 state
- 안내 문구 `PNG · JPG, 20MB 이하` — 표시 문구. 단 1번 지적에서 "규칙과 문구가 따로 놀 위험"으로 함께 언급하는 건 허용

허용 catch: 검색어 · 카테고리가 바뀌어도 `page` 가 1로 안 돌아가는 문제(`other`)

## ui-good (상) — 진짜 결함 0, 함정 6

- `ResizeScreen` 이 `useResizeTool` 을 부름 — 화면 컴포넌트
- `CreditBadge` 가 `useCreditStore` selector 로 잔액을 읽음 — 읽기는 신호 아님
- `isPresetListOpen` · `hoveredId` 로컬 state — 상호작용 상태
- `PresetList` · `CreditBadge` 가 props 로만 받음 — "Context interface 로 바꿔라" 는 과설계
- `ratioLabel` 렌더 중 계산, `toLocaleString` · `isShort` 로 색 바꾸기 — 표시 로직
- `useMemo` · `useCallback` 없음 — "붙여라" 는 범위 밖

기대: primary 비어 있음, overallLevel=high.
