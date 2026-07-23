---
name: review-all
description: Run all four clean-lens reviews (comments, tests, SOLID/clean-code, ACID/transactions) over a diff or files and merge results into per-domain buckets plus a shared "other" bucket. Use when the user wants a full clean-code review, a comprehensive review across comment/test/design/transaction lenses, or invokes the combined review — size-adaptive (inline for small diffs, fan-out subagents for large ones). Triggers include "전체 리뷰", "클린 리뷰 전부", "코드 정리 리뷰", "review all lenses", "full clean review".
---

# 통합 리뷰 오케스트레이터 (review-all)

네 렌즈(주석·테스트·SOLID·ACID)를 한 번에 돌려 도메인별 버킷 + 공통 `other`로 병합한다. 각 렌즈의 게이트·지적금지는 해당 서브스킬(`review-comments`/`review-tests`/`review-solid`/`review-acid`)의 SKILL.md가 정본이다 — **그 규칙을 그대로 적용**한다. 네 렌즈의 원문 가이드 위치는 각 서브스킬 상단 "원문" 줄에 적혀 있다.

## 실행

### 1. 대상 결정
- 인자 파일/경로가 있으면 그것. 없으면 `git diff`. **기본 브랜치를 `main`으로 하드코딩하지 말 것** — 레포마다 다르다(`dev`·`master`·`trunk` 등):
  ```bash
  git diff --name-only --diff-filter=d HEAD             # staged + unstaged (--diff-filter=d: 삭제 파일 제외)
  BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD || echo origin/main)
  git diff --name-only --diff-filter=d "$BASE...HEAD"   # 브랜치 변경분
  ```

### 1-1. 파일 → 렌즈 배정 (단일 기준 — §2 코드와 이 표가 어긋나면 표가 정본)

| 파일 | 배정 렌즈 |
|---|---|
| 테스트(`*.test.*`·`*.spec.*`·`__tests__/`) | test + comment |
| 그 외 | comment + solid, **그리고 DB/트랜잭션/외부 연동 신호가 있을 때만** acid |

acid 신호 프리필터(없으면 acid 렌즈를 붙이지 않는다 — 확정적으로 빈 결과인 에이전트를 띄우지 말 것):
```bash
grep -lE '\$transaction|beginTransaction|prisma\.|knex|typeorm|\.save\(|\.create\(|\.update\(|\.updateMany\(|\.delete\(|INSERT |UPDATE |DELETE |fetch\(|axios|publish\(' <files>
```
> 이 정규식은 `regression/check-assignment.sh`와 **같은 문자열이어야 한다.** 한쪽만 고치면 문서와 실행이 갈라진다 — 고칠 땐 양쪽 다, 그리고 `./check-assignment.sh --check`로 확인.
> 여는 괄호를 붙이는 이유: `\.update`만 쓰면 `updatedAt` 필드에도 걸려 관계없는 파일까지 acid 대상이 된다.

### 2. 규모 적응
- **변경 파일 ≤ 3개**: 메인 컨텍스트에서 인라인으로 §1-1 배정대로 순차 적용. fan-out 불필요.
- **> 3개**: `Workflow`로 파일×렌즈 fan-out. 렌즈당 1패스면 충분(실측: 리뷰어 편차 ~0). 아래 패턴 사용 — `jobs`는 §1-1 배정 결과, `acidFiles`는 프리필터 통과 목록이다:

```js
const LENS_SKILL = { comment: 'review-comments', test: 'review-tests', solid: 'review-solid', acid: 'review-acid' }
const isTest = f => /(\.test\.|\.spec\.|__tests__\/)/.test(f)
const jobs = []
for (const f of files) {
  const lenses = isTest(f) ? ['test', 'comment'] : ['comment', 'solid']
  if (!isTest(f) && acidFiles.includes(f)) lenses.push('acid')   // §1-1 프리필터 통과분만
  for (const L of lenses) jobs.push({ f, L })
}
const FINDING = { type:'object', properties:{
  location:{type:'string'}, issue:{type:'string'},
  severity:{type:'string',enum:['blocker','major','minor','nit']},
  signal:{type:'string'}, suggestion:{type:'string'},
}, required:['location','issue','severity','suggestion'] }
const SCHEMA = { type:'object', properties:{
  overallLevel:{type:'string',enum:['high','medium','low']},
  primary:{type:'array',items:FINDING}, other:{type:'array',items:FINDING},
}, required:['overallLevel','primary','other'] }
const results = await parallel(jobs.map(j => () =>
  agent(`Skill 도구로 '${LENS_SKILL[j.L]}' 스킬을 로드해 그 렌즈 규칙(게이트·지적 금지)을 그대로 적용하라. `
      + `대상 파일 ${j.f} 를 Read해 리뷰하고, primary/other로 분리하라. 없으면 빈 배열.`,
    { label:`${j.L}:${j.f}`, schema:SCHEMA, agentType:'general-purpose' })
    .then(r => ({ ...j, ...(r||{primary:[],other:[]}) }))))
```

> 렌즈를 이름으로 로드하는 게 핵심. 만약 서브에이전트 환경에서 이름 로드가 안 되면, 형제 스킬 SKILL.md를 **이 스킬과 같은 디렉토리(상대 경로)** 에서 Read할 것 — 어느 경우에도 머신 절대경로를 하드코딩하지 않는다.

### 3. 병합·보고
- 도메인별 `primary` **4버킷**(주석·테스트·설계·트랜잭션) + 전 렌즈 `other`를 합친 공통 버킷.
- dedup ①(`other` 안에서): 같은 (파일, 줄) 중복 제거. **`other`는 한 파일에 렌즈 2~3개가 각자 채우므로 같은 내용이 여러 번 올라온다** — 줄이 어긋나도 같은 사안이면 하나로 합치고, 가장 구체적인 서술을 남긴다.
- dedup ②(버킷을 가로질러): **어떤 사안이 도메인 버킷의 `primary`에 이미 있으면 `other`에서는 지운다.** 실측에서 acid가 primary로 잡은 lost update를 comment·solid가 각자 `other`에 또 올려 기타 버킷이 트랜잭션 버킷의 복사본이 됐다. 남기는 쪽은 **그 사안을 담당하는 렌즈**(트랜잭션 사안이면 acid).
- severity가 렌즈마다 다르면(같은 사안을 acid=major, solid=blocker) **담당 렌즈의 값을 쓴다.** 최댓값이 아니다 — 담당 렌즈가 그 도메인의 정본이다.
- 심각도순 정렬(blocker→major→minor→nit). `other`는 항상 primary 아래. **단 `other`에 blocker/major가 있으면 보고 맨 앞에 한 줄 요약으로 끌어올린다** — 도메인 밖이라는 이유로 진짜 버그가 묻히면 안 된다.
- 파일별로 clean(빈 배열)이면 그대로 "이상 없음"으로 표기 — 억지 지적 금지.
- 각 렌즈의 `overallLevel`은 버킷 헤더에 표기(예: `## 설계 (review-solid) — medium`). 파일이 여럿이면 최저값.
- **그 렌즈가 아예 안 돌았으면 버킷을 생략한다.** "이상 없음"은 렌즈가 돌았는데 findings가 0일 때만 쓴다 — 안 돈 것과 돌아서 깨끗한 것은 다르다. 헤더 레벨도 붙이지 않는다(매길 근거가 없다).

## 출력 형식(예)
```
⚠ 도메인 밖 major 1건 — orderApi.ts:42 !res.ok 미검증 (아래 "기타" 참조)

## 주석 (review-comments) — medium
- [major] path:line — ...
## 테스트 (review-tests) — high
- 이상 없음
## 설계 (review-solid) — medium
- [nit] path:line — (signal: 불리언 인자 나열) ...
## 트랜잭션 (review-acid) — low
- [blocker] path:line — (signal: order.create/product.update가 트랜잭션 밖) ...
## 기타 (도메인 밖 정당한 지적)
- [major] path:line — !res.ok 미검증 ...
```
> 위 코드펜스는 **예시 표기일 뿐**이다. 실제 보고서는 펜스로 감싸지 말고 markdown 그대로 출력한다.

## 핵심 원칙
네 렌즈 다 **명확한 것만 잡고 과설계·노이즈는 침묵**하도록 실측 튜닝됨. 이 오케스트레이터도 같은 정신: 커버리지를 위해 억지로 채우지 말 것.

## 회귀 하네스
동봉 `regression/`. **렌즈 회귀**(`fixtures/` 14개 — 지적 품질)와 **오케스트레이터 회귀**(병합 품질)가 별개다:

| 층 | 대상 | 비용 |
|---|---|---|
| 1 `check-assignment.sh --check` | §1-1 배정·acid 프리필터 | LLM 0개, 1초 |
| 2 `merge-cases/*.json` | §3 병합·dedup·승격·정렬 (녹화된 렌즈 출력 → 리뷰 재실행 없음) | 에이전트 1개 × 5 |
| 3 `scenario/` 5파일 | 배정→fan-out→병합 전 경로 | 전 경로 1회 |

§1-1이나 §3을 고쳤으면 **최소 1층+2층**을 돌린다. 절차·합격조건은 `regression/README.md`.
**픽스처는 scratch로 복사해서 그 경로만 리뷰어에게 준다** — 하네스 경로를 주면 정답지를 보게 되고 측정이 무의미해진다.

실측 상태(2026-07-23): 1층 PASS(음성 케이스 확인) · **2층 5/5 PASS** · 3층 미실측.
