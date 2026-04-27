---
name: hitl-eval-dashboard
description: |
  사람의 주관 판단이 필요한 A/B·before-after·model·prompt·UX·design 품질 비교 평가에서 가벼운 HITL 평가 루프를 설계하고 구현하도록 안내한다.
  다음 상황에서 먼저 호출하세요:
    - "직접 봐야 판단 가능", "A/B 비교", "before/after", "품질 평가", "점수 남기기", "평가 대시보드", "HITL", "리포트 만들기"를 언급
    - 자동화 테스트만으로는 품질 판단이 부족하고 사람의 주관이 필요한 경우
    - AI 출력, 디자인 생성물, 프롬프트 변경, 파이프라인 변경, UX 후보를 비교할 때
    - 평가 결과를 나중에 집계하거나 재개할 수 있어야 하는 경우
  구현 스캐폴드가 아니라 가이드형이다. 코드를 바로 만들지 말고 먼저 설계를 확인한다.
---

# HITL 평가 대시보드

평가를 구조화해서 "직접 봐야 아는 것"을 재현 가능한 판단 기록으로 남기는 패턴이다.

핵심은 단순함이다: 브라우저에서 빠르게 볼 수 있는 UI, 사람의 점수·코멘트 입력, 로컬 파일 저장, 재실행 가능한 집계 리포트.

---

## Step 1: Discovery — 먼저 읽어라

SKILL을 읽은 직후 바로 코드를 만들지 않는다.

1. 프로젝트의 기존 실행·빌드·스크립트 관례를 읽는다 (`package.json`, `Makefile`, `pyproject.toml` 등).
2. 비교할 산출물 형태를 파악한다.

| 산출물 타입 | 예시 |
|---|---|
| 시각적 | screenshot, HTML, 캔버스 결과, UI 화면 |
| 텍스트/구조 | LLM 출력, JSON diff, 로그, API 응답 |
| 복합 | screenshot + meta JSON + interview transcript |

3. 기존 프로젝트에 평가 schema, QA checklist, benchmark format이 이미 있으면 **그것을 우선**한다. 이 SKILL의 컨벤션이 기존 규칙을 대체하지 않는다.

---

## Step 2: 평가 단위 정의

다음 5개를 짧게 확정하고 사용자에게 보여준 뒤 구현으로 진입한다.

```
평가 대상:     (예: "gemini A/B 생성 결과물 HTML")
비교 단위:     (예: seed × run index, scenario ID, variant ID)
평가 축:       (예: 의도 반영도 / 구체성 / 편집 불필요도, 3~5개)
저장 위치:     (예: runs/<candidateId>/scores.json)
집계 기준:     (예: B - A >= 0.5 across all axes → PASS)
```

기준이 없으면 제안한다. 사용자가 승인한 뒤 구현한다.

---

## Step 3: 평가 모델

기본 A/B pair evaluation. 대안은 아래 중 선택한다.

| 모드 | 사용 시점 |
|---|---|
| A/B pair | baseline vs candidate 비교 |
| Single-shot | 절대 품질 판단 (pass/fail, severity) |
| Ranking | 3개 이상 후보 순위 |
| Checklist | 체크리스트 항목 충족 여부 |

축 점수는 1~5 시작. 필요하면 winner selection, binary, severity, confidence로 교체 가능.

---

## Step 4: Score Schema — minimal envelope

저장 포맷은 `envelope + project payload` 구조를 따른다.

**envelope** (모든 프로젝트에서 고정):

```ts
interface HitlEnvelope {
  schemaVersion: "1";        // schema 버전
  evaluationId: string;      // 평가 단위 식별자 (프로젝트가 정의)
  variantIds: string[];      // 비교 대상 목록 (예: ["tsA", "tsB"])
  status: "draft" | "scored" | "skipped";
  evidenceRefs: string[];    // 근거 파일 경로 목록 (screenshot, html 등)
  reviewerNote?: string;
  savedAt: string;           // ISO8601
  payload: unknown;          // 프로젝트별 점수·코멘트
}
```

**payload** (프로젝트가 정의):

```ts
// 예시 — A/B axes score payload
interface AbScorePayload {
  axesA: Record<string, number>;
  axesB: Record<string, number>;
  comment: string;
}
```

규칙:
- 원본 산출물(screenshot, html, log 등)은 **score와 분리**해 별도 디렉터리에 보존한다.
- 같은 평가 단위를 다시 저장하면 **idempotent upsert** (중복 제거 후 append).
- raw score를 잃지 않는다. 나중에 다른 집계 기준을 적용할 수 있어야 한다.

---

## Step 5: 평가 UI 설계

UI는 최대한 단순하게 유지한다.

**필수 요소:**
- 현재 pair 정보 (어떤 seed/scenario, 몇 번째 run)
- 비교 뷰 (좌우 나란히, 또는 탭)
- 상세 원본 보기 (새 탭으로 열기)
- 평가 축 입력 (라디오 또는 select)
- 코멘트 (선택)
- Save & Next 버튼
- 진행도 표시 (n/total)
- Prev/Next 이동 (이전 점수 prefill)

**기술 선택:**
- 독립 PoC: Node 내장 `http` 정적 서버 + vanilla HTML/CSS/JS (빌드 없음)
- 기존 React/Next.js 프로젝트: 기존 라우팅·컴포넌트 관례를 따른다
- 로컬 전용이므로 인증 불필요

**API 최소 설계:**
```
GET  /api/manifests       → 사용 가능한 run set 목록
GET  /api/pair?...        → 현재 pair의 artifact·meta·interview 등
GET  /api/screenshot?...  → 이미지 바이너리
GET  /api/scores?...      → 기존 점수 목록 (prefill용)
POST /api/score           → 점수 저장 (upsert)
```

---

## Step 6: Aggregate & Report

집계는 **재실행 가능한 명령** 하나로 닫는다.

```bash
# 예시
npm run aggregate
pnpm aggregate
python scripts/aggregate.py
```

리포트는 Markdown 기본:
- 메타: 생성 시각, A set/B set ID, 평가 건수, pass 기준
- 총 평균 테이블: 축 × A/B/Δ
- 판정: PASS / FAIL
- seed 또는 scenario 별 breakdown
- 코멘트 목록

---

## Step 7: 구현

**구현 전 체크리스트:**
- [ ] Step 2의 5개 항목이 사용자 승인을 받았는가?
- [ ] 기존 프로젝트에 평가 schema/포맷이 있는지 확인했는가?
- [ ] 기존 package manager와 파일 구조를 확인했는가?

**독립 PoC 디렉터리 예시:**
```
eval-dashboard/
├── src/
│   ├── server.ts          # Node http 서버
│   └── aggregate.ts       # 집계 스크립트
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── runs/
│   └── <candidateId>/
│       ├── scores.json    # envelope array
│       └── <seed>/<variant>/<runIdx>/
│           ├── screenshot.png
│           ├── html.html
│           └── meta.json
└── package.json
```

레퍼런스 구현: `agent-workflow-test/poc/interview/` (이 머신 내 실제 동작 확인된 패턴)

---

## Anti-Patterns

- 모든 평가를 하나의 strict global schema로 강제하기
- screenshot, UX 메모, LLM 출력을 억지로 숫자 점수로만 환원하기
- 공통 SKILL에 특정 프로젝트의 rubric·파일명·디렉터리 구조를 하드코딩하기
- score >= N이면 pass 같은 기계적 threshold만으로 HITL을 닫기
- evidence reference 없이 점수만 저장하기 (나중에 왜 그 점수인지 추적 불가)
- 평가 중간에 원본 산출물을 덮어쓰거나 삭제하기

---

## References

- 동작 확인된 PoC: `/home/ubuntu/github/tooldi/tws-editor-api/agent-workflow-test/poc/interview/`
- 서버 구현 예시: `poc/interview/src/dashboard/server.ts`
- UI 구현 예시: `poc/interview/public/app.js`
- 집계 구현 예시: `poc/interview/src/aggregate.ts`
- 리포트 예시: `poc/interview/runs/2026-04-23T06-33-32-673Z/REPORT.md`
