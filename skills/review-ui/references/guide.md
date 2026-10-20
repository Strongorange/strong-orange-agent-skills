# UI 컴포넌트가 가지는 것과 받는 것

review-ui 렌즈의 원문. React 공식 문서와 vercel-labs 의 `react-best-practices` · `composition-patterns` 중 상태 위치를 다루는 규칙만 추렸습니다. 성능 규칙은 다루지 않습니다.

## 1. 도메인 규칙은 컴포넌트 밖에 둡니다

크레딧이 충분한지, 이 사용자가 이 기능을 쓸 수 있는지, 이 파일을 올릴 수 있는지는 화면이 바뀌어도 같아야 하는 규칙입니다. 컴포넌트 안에 쓰면 같은 규칙이 다른 화면에 복사되고, 테스트하려면 컴포넌트를 렌더해야 합니다.

```tsx
// 컴포넌트가 규칙을 직접 계산
<Button disabled={file.size > 20 * 1024 * 1024 || !['png', 'jpg'].includes(ext)}>올리기</Button>

// 뷰모델 훅이 계산하고 컴포넌트는 결과만 씀
const upload = useUploadTool()
<Button disabled={!upload.canUpload}>올리기</Button>
```

규칙을 받는 방법은 셋입니다. props, 커스텀 훅(뷰모델 훅), Context. 화면 컴포넌트가 뷰모델 훅을 부르는 것은 받는 방법의 하나이고 문제가 아닙니다. container/presentational 로 컴포넌트를 두 종류로 나누던 방식(Dan Abramov, 2015)은 본인이 나중에 "훅이 그 역할을 하니 이제 이렇게 나누길 권하지 않는다"고 고쳐 썼습니다. 지금은 컴포넌트와 훅 사이에 경계를 둡니다.

### 표시 로직은 컴포넌트 몫입니다

숫자 · 날짜 포맷, 상태값을 문구 · 색 · 아이콘으로 바꾸는 것, 뷰모델이 준 `canSubmit` 으로 버튼을 끄는 것은 화면마다 달라도 되는 일이라 컴포넌트에 둡니다. 구분 기준: 다른 화면(모바일 앱, 관리자 화면)에서도 같은 답이 나와야 하면 도메인 규칙, 이 화면에서만 의미가 있으면 표시 로직.

## 2. 상태마다 둘 곳이 다릅니다

| 상태 | 둘 곳 | 근거 |
|---|---|---|
| 열림/닫힘, hover, 포커스, 입력 중 초안 | 컴포넌트 `useState` | 그 컴포넌트만 쓰고 새로고침하면 사라져도 됨 |
| 형제 컴포넌트도 읽거나 바꾸는 값 | 공통 부모나 provider | composition-patterns `state-lift-state` |
| 다른 값에서 계산되는 값 | state 에 두지 않고 렌더 중 계산 | react-best-practices `rerender-derived-state-no-effect`, React 문서 "You Might Not Need an Effect" |
| 검색어 · 필터 · 탭 · 페이지 번호 | URL(`searchParams`) | 공유 · 새로고침 · 뒤로 가기 뒤에도 남아야 함 |
| 서버 데이터 | TanStack Query · SWR 캐시나 RSC | 캐시가 관리. 컴포넌트 state 로 복사하면 두 벌이 생김 |

### 계산 가능한 값

```tsx
// 두 벌을 effect 로 맞춤. 렌더가 한 번 더 돌고, 맞추는 사이에 어긋난 값이 보임
const [total, setTotal] = useState(0)
useEffect(() => setTotal(items.reduce((sum, item) => sum + item.price, 0)), [items])

// 렌더 중 계산
const total = items.reduce((sum, item) => sum + item.price, 0)
```

### 위로 올려 보내기

자식이 자기 state 를 effect 로 부모에 복사하거나, 부모가 ref 로 자식 state 를 꺼내 읽으면 같은 값이 두 곳에 생깁니다. 그 state 를 부모나 provider 로 올리고 자식은 받아 쓰게 합니다(`state-lift-state` 의 잘못된 예 두 개가 바로 이 모양입니다).

## 3. 말단 컴포넌트는 그리기만 합니다

말단 컴포넌트가 `fetch` 를 부르고 응답 상태 코드로 분기하면, 같은 컴포넌트를 다른 화면에서 쓸 때 그 호출까지 따라옵니다. 호출과 응답 해석은 화면 컴포넌트나 뷰모델 훅에 둡니다.

store selector 로 값을 읽는 것은 다릅니다. Zustand 같은 store 는 값이 필요한 컴포넌트에서 구독하라고 권하고, 그래야 리렌더 범위도 좁습니다. 읽기는 받는 방법의 하나입니다.

composition-patterns `state-decouple-implementation` · `state-context-interface` 는 한 단계 더 가서 말단이 구체 훅 이름도 모르게 `state · actions · meta` interface 를 Context 로 내려 주라고 합니다. 같은 UI 를 여러 상태 구현(로컬 폼, 서버 동기화)에 붙일 때 쓰는 방법이라, 쓰는 곳이 하나인 컴포넌트에 요구하면 과설계입니다.

## 4. Next 에서 예외처럼 보이는 것

Server Component(page · layout)는 데이터 접근 함수를 직접 부릅니다(next-best-practices `data-patterns`). page 는 화면 · 조립 자리라 1절과 충돌하지 않습니다. 권한 · 입력 검증은 Server Action 이나 데이터 접근 계층 안에 둡니다(react-best-practices `server-auth-actions`, Next 공식 Data Security 가이드).

## 5. 과설계 방향

- 쓰는 곳이 하나인데 provider · Context interface · 뷰모델 훅을 새로 만들면 파일만 늘고 읽는 사람은 세 곳을 오가야 합니다. props 로 충분하면 props 로 둡니다.
- 상호작용 상태(모달 열림 등)를 store 로 올리면 화면을 떠나도 값이 남아 다음 진입 때 모달이 열린 채 나옵니다.
- 표시 로직까지 뷰모델로 옮기면 뷰모델이 화면 문구에 묶여 재사용이 오히려 어려워집니다.
