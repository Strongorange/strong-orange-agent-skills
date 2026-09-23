---
name: review-solid
description: Review design for SOLID and clean-code signals using an evidence-gated, anti-mechanical lens. Use when the user asks to review design/architecture, check SOLID/clean code, or as part of a code review — flags SRP mixing, duplicated OCP branching, LSP contract breaks, boolean/primitive param lists, cross-site DRY violations, ORM/SDK leaking into core policy, deep control-flow nesting and nested ternaries, boolean-pair returns whose combinations include impossible states, invariants scattered across callers, and errors that lose their cause, while REFUSING to demand interfaces for single implementations, strategy patterns for closed enums, splitting well-factored orchestrators, or flattening two-level nesting on depth alone. Triggers include "SOLID 리뷰", "설계 리뷰", "클린코드 점검", "중첩 점검", "복잡도 리뷰", "review design", "review SOLID".
---

# SOLID·클린코드 렌즈 (review-solid)

책임 경계·이름·의존성·추상화를 본다. **evidence-gated** — 관찰된 신호 없이는 침묵한다. 원문 자체가 "기계적으로 쫓지 말라"고 반복하므로, 이 렌즈의 핵심은 지적 못지않게 **지적을 참는 것**이다. (실측: 상 수준 코드에 "인터페이스 뽑아라/전략패턴/쪼개라" 오탐 0.)

> **원문**: 이 스킬 디렉토리의 `references/guide.md` (동봉 — 외부 경로 의존 없음)
> 아래 목록은 그 문서의 압축본이다. 원칙별 절(SRP·OCP·LSP·ISP·DIP)과 클린코드 절이 있고, "조건문이 항상 나쁜 것은 아니다"·"과도하게 분리한 예" 같은 **반대 방향 절**이 지적 금지의 근거다. **판단이 애매하면 해당 절을 직접 읽고 결정한다.**
>
> ⚠ **아래 신호 목록이 곧 게이트다.** 원문에 있어도 여기 없는 항목은 리뷰에서 존재하지 않는 것과 같다 — "애매하면 원문을 읽어라"는 목록에 있는 항목을 판정할 때만 발동하기 때문이다. 그러므로 **신호를 늘리는 유일한 방법은 이 목록에 줄을 추가하는 것**이고, 추가할 때는 반드시 good·good2 픽스처로 오탐 회귀를 확인한다. 원문에 대응 절이 없는 항목(상태 조합 모순·중첩 임계)은 이 파일이 정본이다.

## 실행

1. **대상 결정**: 인자 파일, 없으면 `git diff` 변경 파일. **기본 브랜치를 `main`으로 하드코딩하지 말 것** — 레포마다 다르다(`dev`·`master`·`trunk` 등).
   ```bash
   git diff --name-only --diff-filter=d HEAD             # staged + unstaged (--diff-filter=d: 삭제 파일 제외)
   BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD || echo origin/main)
   git diff --name-only --diff-filter=d "$BASE...HEAD"   # 브랜치 변경분
   ```
2. 각 파일에 **3단 게이트** 적용.
3. `primary`(설계) / `other`(정확성·안정성) 분리 보고. 각 finding에 관찰한 `signal`을 명시.

## 게이트 (evidence-gated, 3단)

> 모든 지적은 아래 신호 중 **코드에서 실제 관찰되는 것**을 인용해야 한다. "더 예뻐질 수 있다"만으로는 금지.
> - **강한 신호** → major/blocker
> - **약한 신호** → 침묵하지 말고 **nit로** 올린다 (관찰 신호 명시)
> - **신호 0** → 침묵
> 보조 질문: "이 추상화를 **제거**하면 실제로 어떤 문제가 생기나?" 답 못 하면 신호 0.

## 강한 신호 (major+)
- **SRP**: DB·비즈니스정책·IO가 한 메서드에 직접 섞여 변경 이유가 복수 (조율 자체는 아님 — 정책/IO를 인라인으로 직접 수행하는 것이 신호)
- **OCP**: 같은 유형 분기(if/switch)가 **여러 위치에 중복**되어 신설 시 다중 수정 필요
- **DRY**: 같은 규칙(권한·금액·정책)이 3곳 이상 복붙 or 복붙이 위험한 규칙
- 외부 SDK·ORM이 핵심 정책 **여러 곳**에 침투
- 조회 함수가 몰래 상태 변경 / 이름과 부수효과 불일치
- **LSP·ISP**: 구현체가 상위 타입 계약을 깸 — 미지원 기능을 예외로 처리(`throw new Error('not supported')`), 반환값 의미·입력 허용 범위·호출 순서 요구를 임의로 바꿈. 호출자가 구현체 종류를 알아야 하면 치환 불가 (원문 §LSP 계약 7항목)
- **불변 조건이 호출부에 흩어짐**: 함께 만족해야 할 여러 필드를 호출부가 직접 세팅(상태+시각+식별자 등)하고 그 조합을 검증하는 곳이 없음 — 규칙을 호출자 기억에 맡김
- **상태 조합 모순**: boolean 2개 이상을 반환·필드로 들고 호출부가 조합으로 분기하는데 조합 중 **발생 불가·모순인 것**이 있음 → 판별 유니온·단일 상태값. 발생 불가 조합을 `signal`에 열거할 것
- **중첩 4단 이상**(if/for/삼항 혼재) **또는 중첩 삼항** — 가드절·조기 반환·이름 붙인 중간 변수로 평탄화 가능한데 안 함. 관찰한 최대 깊이를 `signal`에 적을 것

## 약한 신호 (nit — 침묵 금지, 과장 금지)
- 불리언·원시값 인자가 시그니처에 나열됨(인접 동형 타입이면 오호출 위험)
- 함수·유스케이스가 ORM/SDK 구체 타입을 **인자로 직접** 받음(경계 1곳이라도 기록)
- `Manager`·`Helper`·`process`·`common`·`data` 류 포괄 이름
- 선택적 옵션·플래그가 늘어나기 시작함
- 값 객체 후보가 원시 타입인데 **같은 검증이 2곳 이상 반복**될 때만 (단일 원시값은 금지 — 아래)
- 중첩 3단 (4단 이상은 강한 신호)
- 한 함수가 서로 다른 추상화 수준을 섞음 — 도메인 정책 옆에 파싱·포매팅·인덱스 계산 같은 저수준 디테일
- 오류가 실패 이유를 못 담음 — `throw new Error('실패')` 류 뭉뚱그린 메시지, 도메인 오류를 전부 하나의 HTTP 예외로 즉시 변환(오류 종류·코드·문제 입력 소실)

## 지적 금지 (신호 0 — 원문이 명시적으로 반대)
- 구현체 1개뿐인데 인터페이스 없음 → **인터페이스 강요 금지** (nit로도 금지)
- 닫힌 enum·소수 고정 분기 `switch`/삼항 → **전략패턴 강요 금지**
- 유스케이스가 협력객체 여럿 호출 → "너무 많은 일/쪼개라" **오판 금지** (조율은 하나의 책임)
- 아직 반복되지 않은 중복 → **성급한 공통화 금지** (Rule of Three 미발동)
- 안정적 순수 유틸·언어 기본기능 래핑 요구 금지
- 함수가 짧지 않다는 이유만으로 추출 요구 금지
- **단일 원시값(이메일·URL·금액 하나)을 값 객체로 감싸라 요구 금지** ("모든 문자열을 클래스로 감싸는 것은 과도"). 같은 검증이 여러 곳에 흩어질 때만 신호
- **중첩 2단·단일 삼항을 깊이만 이유로 지적 금지** — 조건이 서로 독립이거나 평탄화가 오히려 길어지면 침묵. 깊이는 세는 것이지 재는 것이 아니다
- **파일 하나만 보고 "주변 코드와 스타일이 다르다" 지적 금지** — 렌즈는 파일 단위로 배정되므로 일관성을 판정할 근거가 없다
- **상속이 쓰였다는 이유만으로 조합 전환 요구 금지** — 계약이 실제로 깨질 때만 LSP 신호로 다룬다

## 출력 계약
각 finding: `{ location, issue, severity, signal, suggestion }`
- `primary`: 신호 인용되는 지적만(강=major+, 약=nit) / `other`: 정확성·안정성 / `overallLevel`: 설계 **품질**(high=좋음 … low=나쁨, 심각도 아님)
- 없으면 빈 배열.

**severity 기준 (4렌즈 공통 — 병합 시 이 값으로 정렬하므로 벗어나지 말 것)**
`blocker` 데이터 손상·보안·머지 불가 / `major` 릴리스 전 고쳐야 함 / `minor` 고치면 좋음 / `nit` 취향·비강제. 강신호=major+, 약신호=nit 매핑이 이 기준보다 우선한다.

## 검증됨 (v1.1)
solid-bad 강신호 3/3, solid-medium 약신호 2/2(불리언·ORM누수 nit), solid-good/good2 하드 함정 오탐 0·값객체 노이즈 0. review-all 동봉 `regression/` 참조.

## v1.2 (2026-08-14) — 신호 7개 추가, 부분 검증
원문에 있으나 압축본에 한 번도 안 올라왔던 절을 반영: LSP·ISP 계약 위반, 불변 조건이 호출부에 흩어짐(§clean-4), 오류 구체성(§clean-6), 추상화 수준 혼재(§clean-2), 제어흐름 중첩(§KISS). 상태 조합 모순은 원문에 없는 신규.

- **양성 5/5**: `solid-complexity.ts`(파일명을 바꿔 정답 힌트 제거) 서브에이전트 실측 — 중첩 5단·중첩 삼항·조합 모순·LSP·불변조건 흩어짐 전부 major 로 검출. 조합 모순 신호는 정답지에 없던 **도달 불가 분기**(`applyCoupon` 마지막 `return`)까지 끌어냈다.
- **오탐 0**: 함정 4종(단일 삼항·독립 2단 중첩·도메인 오류 모범 2곳·유스케이스 조율) 전부 침묵. 실제 프로덕션 코드 2파일(`ai-credit` 의 `daily-limit.ts`·`deduction.ts`)로도 확인 — 전자는 primary 빈 배열, 후자는 nit 2건인데 둘 다 **기존** 약한 신호(선택적 의존·인접 동형 원시값)라 새 신호의 오탐이 아니다.
- 실측 절차: 채점 기준을 결과 보기 **전에** 파일로 적어두고 대조했다(사후 합리화 방지). 그런데도 EXPECTED 가 `deduction.ts` 의 정당한 nit 1건을 예측 못 했다 — 기준을 미리 적는 것과 기준이 완전한 것은 다르다.
- 반영하지 않은 절과 이유: "동일 버그가 여러 위치에서 반복"(diff 하나로는 관찰 불가), "상속보다 조합"(오탐 위험 대비 빈도 낮음), "일관성 > 개인적 우아함"(**렌즈가 파일 단위로 배정돼 주변 코드를 못 본다 — 구조적 한계**).
