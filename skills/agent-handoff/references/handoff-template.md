# <Handoff Title>

## Goal
<one-sentence next-thread objective>

## Workspace
- Worktree/checkout: `<path>`
- Branch: `<branch>` / Base: `<base branch — state it, do not assume>`
- Commits so far: `<sha> <subject>`
- PR: `<number + state, or "none yet">` / title convention: `<...>`

## Current State
- <what is already implemented>
- <what is not implemented>

## Locked Decisions
- <decision> — <why, so the next thread does not undo it>

## Contracts
- Endpoint/API:
- Request shape:
- Response shape:
- Error handling:
- Constants/keys:

## Relevant Files
- `<path>:<line>` - <why it matters>
- `<path>:<line>` - <why it matters>

## Hard-won Context
- Run it locally: <env values, ports to avoid, seeded credentials + the script that mints them>
- Trap: <symptom the next thread will see> → <cause> → <what to do instead>
- Normal and unrelated: <errors that are safe to ignore>
- Already tried and rejected: <approach> — <why>
- Cleanup owed: <temp scripts, test rows, local-only files>

## Working Agreement
- Slice size / when to stop and report: <...>
- What counts as evidence: <...>
- Commit · comment · PR style: <...>
- Off-limits: <ports, data, other threads' files>
- Tools & skills: `<tool or skill>` - <when to reach for it>

## Open Risks
- <risk or unknown>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Verification
- `<command or manual step>` - <expected result>
- `<command or manual step>` - <expected result>

## Related Docs
- <canonical note/vault link> - <what it holds>
- <secondary note> - <what it holds>

## Start Prompt
```text
Read <handoff path> end to end. Work in <worktree>, branch <branch>, base <base>.
<direct task for the next thread>
```
