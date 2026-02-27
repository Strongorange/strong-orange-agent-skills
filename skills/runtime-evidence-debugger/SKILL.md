---
name: runtime-evidence-debugger
description: Evidence-based debugging for any language or framework. Assumes a local HTTP log server is already running on port 7827. Instruments code with hypothesisId-tagged fetch/file logs including call stack traces, collects runtime evidence, then fixes only what logs confirm. Use when a bug cannot be explained by reading code alone, when previous fix attempts failed without runtime data, or when the bug involves async, event, or timing sequences.
---

# Runtime Evidence Debugger

## When to Use

- 코드 읽기만으로 원인 추측이 어려울 때
- 이전 수정 시도가 런타임 데이터 없이 실패했을 때
- 비동기·이벤트·타이밍 버그일 때

## 서버 전제조건

`POST http://127.0.0.1:7827` 서버가 실행 중이어야 한다.
body JSON의 `logFile` 절대경로에 NDJSON 한 줄 append + CORS 허용.
서버 구현 방식(Docker 등)은 무관하며, skill 내에서 서버를 시작하지 않는다.
서버 실행 방법은 이 스킬의 `server/README.md` 참조.

---

## Step 0: 서버 확인 (실패 시 즉시 중단)

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:7827 --max-time 2
```

200이 아니면 사용자에게 서버 미실행 안내 후 **즉시 중단**.

세션 상태 확정 (이후 모든 단계에서 고정):
- **SESSION_ID**: `Date.now().toString(36).slice(-6)` (예: `a3f9c1`)
- **LOG_FILE**: `{projectRoot}/.cursor/debug-{SESSION_ID}.log`

---

## Step 1: 가설 수립

코드를 먼저 읽는다. 3–5개 가설, 각각 `hypothesisId` 부여 (A, B, C…).
단 한 번의 재현으로 모든 가설을 동시에 검증할 수 있도록 로그 배치 설계.

---

## Step 2: 계측 삽입

**로그 개수:** 최소 1개 필수 · 최대 10개 · 일반 2–6개
각 로그는 반드시 하나 이상의 `hypothesisId`에 매핑.

**배치 우선순위:**
1. 의심 함수 진입 (파라미터 포함)
2. 의심 함수 종료 (반환값 포함)
3. 핵심 연산 전후 값
4. 분기 실행 경로
5. 예상치 못한 이벤트 핸들러
6. 상태 변경 전후

모든 로그를 `#region agent log` / `#endregion`으로 감싼다.

**JS/TS — 브라우저·Node.js (fetch):**

```ts
// #region agent log
fetch('http://127.0.0.1:7827',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({logFile:'LOG_FILE',sessionId:'SESSION_ID',runId:'debug',hypothesisId:'A',location:'file.ts:LINE',message:'설명',data:{key:val,stack:new Error().stack?.split('\n').slice(1,5)},timestamp:Date.now()})}).catch(()=>{});
// #endregion
```

**Python·Go 등 서버사이드 (직접 파일 append, 서버 불필요):**

```python
# #region agent log
import json,time,traceback
with open('LOG_FILE','a') as f: f.write(json.dumps({'logFile':'LOG_FILE','sessionId':'SESSION_ID','runId':'debug','hypothesisId':'A','location':'file.py:LINE','message':'설명','data':{'key':val,'stack':traceback.format_stack()[-3:]},'timestamp':int(time.time()*1000)})+'\n')
# #endregion
```

**페이로드 필수 필드:**

| 필드 | 값 |
|---|---|
| `logFile` | LOG_FILE 절대경로 |
| `sessionId` | SESSION_ID |
| `runId` | `"debug"` (초기) / `"post-fix"` (검증) |
| `hypothesisId` | `"A"` ~ `"E"` |
| `location` | `"파일명:줄번호"` |
| `stack` | 콜 스택 슬라이스 |
| `timestamp` | ms |

---

## Step 3: 로그 파일 삭제 → 재현 요청

1. `delete_file` 도구로 LOG_FILE 삭제 — **shell rm/touch 금지**
2. 다른 세션의 로그 파일은 건드리지 않는다
3. 응답 마지막에 `<reproduction_steps>` 블록 필수:

```
<reproduction_steps>
1. [인터페이스 무관한 재현 지침]
...
N. Press Proceed/Mark as fixed when done.
</reproduction_steps>
```

규칙: "click" 금지 · "done이라고 답해주세요" 금지 · 인터페이스 분기 금지 · 앱 재시작 필요 시 명시

---

## Step 4: 로그 분석

LOG_FILE 읽기. 각 가설 판정:

| 가설 | 판정 | 근거 (로그 라인 인용) |
|---|---|---|
| A | CONFIRMED | … |
| B | REJECTED | … |

타임스탬프로 인과 관계 타임라인 재구성.

**LOG_FILE이 비어있거나 없으면:** 재현 실패 가능성 안내 후 재시도 요청.

**모든 가설이 REJECTED이면:** 수정 금지. 다른 서브시스템에서 새 가설 생성 + 추가 계측.

---

## Step 5: 수정

- CONFIRMED 가설에 대해서만, 최소 범위로 수정
- 계측 코드 유지 (검증 전 제거 금지)
- REJECTED 가설 코드 변경 즉시 되돌림

---

## Step 6: 수정 검증

1. `delete_file`로 LOG_FILE 삭제
2. 모든 계측 `runId` → `"post-fix"`
3. `<reproduction_steps>` 블록과 함께 재현 요청
4. LOG_FILE 읽기 — **특정 로그 라인 인용으로 성공 근거 제시** (인용 없는 성공 선언 금지)

실패 시: 해당 가설 코드 변경 되돌림 → 다른 서브시스템에서 새 가설 생성.

---

## Step 7: 정리

사용자 확인 후에만:
1. 모든 `#region agent log` / `#endregion` 블록 제거
2. `delete_file`로 LOG_FILE 삭제

---

## Critical Constraints

- 런타임 증거 없이 수정 금지
- REJECTED 가설 코드 변경 즉시 되돌림 (방어적 가드 누적 금지)
- 계측은 검증 완료 전까지 절대 제거 금지
- `setTimeout` / `sleep`을 픽스로 사용 금지
- shell rm/touch 금지 — 로그 파일 조작은 `delete_file` 도구만
- 성공 선언 시 특정 로그 라인 인용 필수
