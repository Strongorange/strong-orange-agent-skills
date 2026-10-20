---
name: review-ui
description: Review React/Next UI components for what a component should own versus receive (domain rules in components, derived state stored in state, state synced upward through effects, leaf components doing IO) without demanding speculative Context or view-model layers. Use when the user asks to review UI component boundaries or view models, or as part of a code review of .tsx/.jsx files. Triggers include "UI 리뷰", "컴포넌트 경계 리뷰", "뷰모델 점검", "상태 위치 점검", "review UI components", "review component state".
---

# UI 컴포넌트 경계 렌즈 (review-ui)

컴포넌트가 직접 가지는 것과 바깥에서 받는 것의 경계를 봄. 기준은 두 줄.

- UI 컴포넌트는 도메인 규칙을 본문에 쓰지 않음. 데이터와 동작은 props · 뷰모델 훅 · Context 로 받음
- 컴포넌트 `useState` 에는 그 컴포넌트만 쓰고 새로고침하면 사라져도 되는 상호작용 상태만 둠

관찰된 신호가 없으면 침묵. 이 렌즈가 가장 자주 틀리는 방향은 과설계 요구(쓸 곳 하나인데 Context · 뷰모델 · 계층을 더 만들라는 지적)라서, 지적 금지 목록을 신호 목록만큼 지킬 것.

> **원문**: 이 스킬 디렉토리의 `references/guide.md` (동봉, 외부 경로 의존 없음)
> 아래 목록은 그 문서의 압축본. 판단이 애매하면 해당 절을 직접 읽고 결정할 것.
> 아래 신호 목록에 없는 항목은 원문에 있어도 지적하지 않음. 신호를 늘릴 땐 이 목록에 줄을 추가하고 good 픽스처로 오탐 회귀를 확인할 것.
> 성능 규칙(memo · 리렌더 · 번들 · 워터폴)은 이 렌즈 범위 밖.

## 실행

1. **대상 결정**: 인자 파일, 없으면 `git diff` 변경 파일 중 `.tsx` · `.jsx` (테스트 파일 제외). 기본 브랜치를 `main` 으로 하드코딩하지 말 것.
   ```bash
   git diff --name-only --diff-filter=d HEAD             # staged + unstaged (--diff-filter=d: 삭제 파일 제외)
   BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD)  # 비어 있으면 PR base 나 사용자가 알려 준 브랜치
   git diff --name-only --diff-filter=d "$BASE...HEAD"   # 브랜치 변경분
   ```
2. 컴포넌트마다 먼저 **역할**을 정할 것. 판정이 신호 해석을 바꿈.
   - **화면 · 조립 컴포넌트**: page · route 진입점, provider, 기능 루트(`*Screen` · `*Page` · `*Panel` 처럼 화면 단위). 뷰모델 훅 · store · Context 를 불러 하위에 내려 줌
   - **말단 컴포넌트**: 화면 안에서 일부를 그리는 하위 컴포넌트(`*Row` · `*Item` · `*Card` · `*Button` 류, 같은 파일 안 보조 컴포넌트). props 나 Context 로 받아 그리기만 함
3. 신호를 찾아 `primary`(UI 경계) / `other`(정확성 · 접근성 · 그 밖) 로 나누고 각 finding 에 관찰한 `signal` 을 적을 것.

## 통과 기준 (근거 필수)

> 모든 지적은 아래 신호 중 코드에서 실제 보이는 것을 인용해야 함. "분리하면 더 깔끔"만으로는 금지.
> - 강한 신호 → major
> - 약한 신호 → nit (침묵도 과장도 금지)
> - 신호 0 → 침묵
> 보조 질문: "이 규칙 · 상태를 컴포넌트 밖으로 옮기면 무엇이 실제로 좋아지나(재사용처 · 테스트 · 다른 화면과의 일치)?" 답이 없으면 신호 0.

## 강한 신호 (major)

- **도메인 규칙이 컴포넌트 본문에 있음**: 크레딧 · 권한 · 가격 · 할인 · 한도 · 업로드 허용 조건 같은 정책 판단을 JSX 조건, 이벤트 핸들러, 컴포넌트 함수 본문에서 직접 계산. 숫자 상수(`20 * 1024 * 1024`, `0.8`)나 허용 목록(`['png', 'jpg']`)이 JSX 옆에 있으면 거의 확실. `signal` 에 그 식을 인용할 것
- **말단 컴포넌트가 직접 IO**: 말단 컴포넌트가 `fetch` · API 클라이언트 · mutation 을 직접 부르고 응답까지 해석함(상태 코드 분기, 응답 필드 가공). 화면 · 조립 컴포넌트나 뷰모델 훅이 할 일
- **계산 가능한 값을 state + effect 로 동기화**: props · 다른 state 에서 구할 수 있는 값을 `useState` 에 두고 `useEffect` 로 맞춤. 렌더 중에 계산하면 됨
- **상태를 effect · ref 로 위에 올려 보냄**: 자식이 자기 state 를 `useEffect(() => onChange(x), [x])` 로 부모에 복사하거나, 부모가 ref 로 자식 state 를 꺼내 읽음. 그 state 는 부모나 provider 가 가져야 함

## 약한 신호 (nit)

- 공유 · 새로고침 · 뒤로 가기 뒤에도 남아야 할 값(검색어 · 필터 · 탭 · 페이지 번호)을 `useState` 에 둠. URL 후보
- 서버 응답을 `useEffect` + `useState` 로 복사해 들고 있음. 레포에 이미 있는 서버 상태 도구(TanStack Query · SWR · RSC)로 옮길 후보. 레포에 그런 도구가 안 보이면 침묵

## 지적 금지 (신호 0)

- **화면 · 조립 컴포넌트가 뷰모델 훅 · store · Context 를 부르는 것**: 그 자리가 원래 하는 일
- **말단 컴포넌트가 store selector 로 값을 읽는 것**: 읽기는 받는 방식의 하나. IO 를 직접 할 때만 신호
- **열림/닫힘 · hover · 포커스 · 입력 중 초안 · 펼침 같은 상호작용 상태**를 컴포넌트 `useState` 에 둔 것
- **표시 로직**: 날짜 · 숫자 포맷(`toLocaleString`), 상태값을 문구 · 아이콘 · 색으로 바꾸는 것, 뷰모델이 준 boolean(`canSubmit`)으로 버튼을 켜고 끄는 것. 도메인 규칙과 다름
- **쓰는 곳이 하나인데 Context interface · provider · 뷰모델 계층을 새로 만들라는 요구**. props 로 충분하면 침묵
- **useMemo · useCallback · memo 를 붙이라는 요구**: 성능은 이 렌즈 범위 밖
- **Server Component 가 데이터 접근 함수를 직접 부르는 것**: page · layout 은 화면 · 조립 자리. 권한 · 검증 규칙이 그 함수(Server Action · 데이터 접근 계층) 안에 있는지는 다른 렌즈 몫
- **파일 하나만 보고 "다른 화면과 구조가 다르다" 지적 금지**: 파일 단위 배정이라 비교 근거가 없음

## 출력 계약

각 finding: `{ location, issue, severity, signal, suggestion }`
- `primary`: 신호 인용되는 지적만(강=major, 약=nit) / `other`: 정확성 · 접근성 · 그 밖 / `overallLevel`: UI 경계 **품질**(high=좋음 … low=나쁨, 심각도 아님)
- 없으면 빈 배열.
- suggestion 은 옮길 곳을 구체로: "`canUpload` 를 `useUploadTool` 이 계산해 내려 줌" 처럼 받을 쪽 이름까지. 새 파일 · 새 계층 제안은 그 규칙을 쓰는 곳이 둘 이상이거나 테스트가 필요할 때만.

**severity 기준 (렌즈 공통, 병합 시 이 값으로 정렬하므로 벗어나지 말 것)**
`blocker` 데이터 손상 · 보안 · 머지 불가 / `major` 릴리스 전 고쳐야 함 / `minor` 고치면 좋음 / `nit` 취향 · 비강제. 강신호=major, 약신호=nit 매핑이 이 기준보다 우선.
