# Runtime Evidence Debugger

Version 1.0.0

Use this guide when a bug cannot be explained by reading code alone, when previous fix attempts failed without runtime data, or when the bug involves async, event, or timing sequences.

## Prerequisites

A local HTTP log server must be running at `POST http://127.0.0.1:7827`.
Server setup: see `server/README.md` in this skill directory

Quick start:
```bash
docker build -t agent-debug-server ~/agent-tools/debug-server/
docker run -d -p 7827:7827 -v $(pwd):$(pwd) --name agent-debug-server agent-debug-server
```

## Step 0: Verify Server

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:7827 --max-time 2
```

If not 200, inform the user and stop.

Set session constants:
- **SESSION_ID**: `Date.now().toString(36).slice(-6)`
- **LOG_FILE**: `{projectRoot}/.cursor/debug-{SESSION_ID}.log`

## Step 1: Form Hypotheses

Read code first. Define 3–5 hypotheses, each with a `hypothesisId` (A, B, C…).
Design log placement to validate all hypotheses in a single reproduction.

## Step 2: Instrument

Log count: min 1, max 10, typical 2–6. Each log maps to at least one hypothesisId.
Wrap all logs in `#region agent log` / `#endregion`.

**JS/TS (fetch to server):**
```ts
// #region agent log
fetch('http://127.0.0.1:7827',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({logFile:'LOG_FILE',sessionId:'SESSION_ID',runId:'debug',hypothesisId:'A',location:'file.ts:LINE',message:'description',data:{key:val,stack:new Error().stack?.split('\n').slice(1,5)},timestamp:Date.now()})}).catch(()=>{});
// #endregion
```

**Python (direct file append):**
```python
# #region agent log
import json,time,traceback
with open('LOG_FILE','a') as f: f.write(json.dumps({'logFile':'LOG_FILE','sessionId':'SESSION_ID','runId':'debug','hypothesisId':'A','location':'file.py:LINE','message':'description','data':{'key':val,'stack':traceback.format_stack()[-3:]},'timestamp':int(time.time()*1000)})+'\n')
# #endregion
```

Required payload fields: `logFile`, `sessionId`, `runId` (`"debug"` or `"post-fix"`), `hypothesisId`, `location`, `stack`, `timestamp`.

## Step 3: Delete Log → Request Reproduction

Delete LOG_FILE using the `delete_file` tool (never `rm`/`touch`).
End response with `<reproduction_steps>` block.

## Step 4: Analyze Logs

Read LOG_FILE. Produce a verdict table per hypothesis:

| Hypothesis | Verdict   | Evidence (log line citation) |
|------------|-----------|------------------------------|
| A          | CONFIRMED | …                            |
| B          | REJECTED  | …                            |

If all are REJECTED: do not fix. Generate new hypotheses in a different subsystem.

## Step 5: Fix

Fix only CONFIRMED hypotheses, minimal scope. Keep instrumentation until verified.

## Step 6: Verify Fix

1. Delete LOG_FILE with `delete_file`.
2. Change all `runId` to `"post-fix"`.
3. Request reproduction again.
4. Read LOG_FILE — cite specific log lines to prove success (no citation = no success claim).

## Step 7: Cleanup

After user confirmation:
1. Remove all `#region agent log` / `#endregion` blocks.
2. Delete LOG_FILE with `delete_file`.

## Hard Rules

- Never fix without runtime evidence
- Never remove instrumentation before verification
- Never use `setTimeout`/`sleep` as a fix
- Never use shell `rm`/`touch` for log files — use `delete_file` only
- Always cite specific log lines when declaring success
