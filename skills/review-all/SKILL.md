---
name: review-all
description: Run all three clean-lens reviews (comments, tests, SOLID/clean-code) over a diff or files and merge results into per-domain buckets plus a shared "other" bucket. Use when the user wants a full clean-code review, a comprehensive review across comment/test/design lenses, or invokes the combined review — size-adaptive (inline for small diffs, fan-out subagents for large ones). Triggers include "전체 리뷰", "클린 리뷰 전부", "코드 정리 리뷰", "review all lenses", "full clean review".
---

# 통합 리뷰 오케스트레이터 (review-all)

세 렌즈(주석·테스트·SOLID)를 한 번에 돌려 도메인별 버킷 + 공통 `other`로 병합한다. 각 렌즈의 게이트·지적금지는 해당 서브스킬(`review-comments`/`review-tests`/`review-solid`)의 SKILL.md가 정본이다 — **그 규칙을 그대로 적용**한다.

## 실행

### 1. 대상 결정
- 인자 파일/경로가 있으면 그것. 없으면 `git diff`:
  ```
  git diff --name-only            # uncommitted
  git diff --name-only main...HEAD # 브랜치 변경
  ```
- 테스트 파일은 test 렌즈, 그 외는 comment + solid 렌즈. (테스트 파일도 주석 렌즈는 적용 가능 — 파일 성격으로 판단.)

### 2. 규모 적응
- **변경 파일 ≤ 6개**: 메인 컨텍스트에서 인라인으로 파일별 3렌즈 순차 적용. fan-out 불필요.
- **> 6개**: `Workflow`로 파일×렌즈 fan-out. 렌즈당 1패스면 충분(실측: 리뷰어 편차 ~0). 아래 패턴 사용:

```js
const LENS_SKILL = { comment: 'review-comments', test: 'review-tests', solid: 'review-solid' }
const jobs = []
for (const f of files) {
  const lenses = isTest(f) ? ['test'] : ['comment', 'solid']
  for (const L of lenses) jobs.push({ f, L })
}
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
- 도메인별 `primary` 3버킷 + 전 렌즈 `other`를 합친 공통 버킷.
- 같은 (파일, 줄) 중복 finding은 dedup.
- 심각도순 정렬(blocker→major→minor→nit). `other`는 항상 primary 아래.
- 파일별로 clean(빈 배열)이면 그대로 "이상 없음"으로 표기 — 억지 지적 금지.

## 출력 형식(예)
```
## 주석 (review-comments)
- [major] path:line — ...
## 테스트 (review-tests)
- 이상 없음
## 설계 (review-solid)
- [nit] path:line — (signal: 불리언 인자 나열) ...
## 기타 (도메인 밖 정당한 지적)
- [major] path:line — !res.ok 미검증 ...
```

## 핵심 원칙
세 렌즈 다 **명확한 것만 잡고 과설계·노이즈는 침묵**하도록 실측 튜닝됨. 이 오케스트레이터도 같은 정신: 커버리지를 위해 억지로 채우지 말 것.

## 회귀 하네스
동봉 `regression/` (fixtures 10 + ANSWER-KEY + README). 어느 렌즈의 게이트·목록을 고칠 때마다 이 A/B로 오탐/커버리지 회귀를 재검증한다. 절차는 `regression/README.md`.
