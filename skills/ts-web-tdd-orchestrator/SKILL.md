---
name: ts-web-tdd-orchestrator
description: Plan-first staged TDD orchestration for TypeScript web repositories. Use when a TypeScript, React, Next.js, or Node web task benefits from a short spec, explicit red/green/refactor/verify stages, deterministic validation, and keeping code changes behind explicit user approval. Best suited for small feature additions, policy changes, and bug fixes where tests should act as the primary oracle.
metadata:
  version: "0.2.0"
---

# TS Web TDD Orchestrator

Guide TypeScript web changes through a strict plan-first workflow.
Favor staged progress and deterministic gates over one-shot implementation.

## Workflow

1. Ground in the repo first.
   - Find the actual app root before planning. Check the current directory, monorepo packages, and obvious symlinked app folders for `package.json`, test config, and TypeScript config.
   - Read local rules such as `AGENTS.md`, package scripts, and nearby test files before proposing changes.
   - If more than one plausible app root exists, summarize the candidates and ask before editing.
2. Clarify intent before edits.
   - Extract goal, success criteria, expected behavior change, likely file scope, and the smallest useful test target.
   - If requirements, scope, or acceptance criteria are still unclear, ask questions and stop there.
   - Do not edit code while the user is still asking for explanation, review, planning, or tradeoff analysis.
3. Produce a short approval-ready `spec`.
   - Keep it compact. Capture only:
     - behavior: what should happen
     - non-behavior: what is explicitly out of scope
     - edge cases: important boundary or failure cases
     - oracle: how correctness will be checked
   - Avoid design essays or implementation architecture unless the user explicitly asks for that depth.
4. Produce a short approval-ready plan.
   - Summarize the intended change, the failing test to add in `red`, the minimum implementation expected in `green`, and the verification commands for `verify`.
   - Keep the plan concrete enough to execute immediately after approval.
5. Wait for explicit approval before editing.
   - Treat natural-language approvals such as `진행해`, `계획대로 진행`, `구현해`, `수정해도 돼`, or equivalent confirmations as approval to edit.
   - Before approval, do not modify files, do not sneak into implementation, and do not "helpfully" patch code.
6. Execute the staged loop.
   - `red`: add or update only the failing test. Do not edit production code.
   - `green`: make the smallest production change that passes the approved test. Preserve test intent.
   - `refactor`: improve structure while preserving passing behavior. Do not expand scope.
   - `verify`: run deterministic checks and report the result.

## Stage Rules

- Keep stage boundaries strict. Do not blend `red`, `green`, and `refactor` into one edit batch.
- Prefer the smallest coherent change that proves the requested behavior.
- If the work becomes larger than a small feature or bug fix, stop and propose a smaller slice before continuing.
- If a verification failure reveals a new bug or wider requirement gap, summarize the problem and wait for renewed approval instead of looping indefinitely.
- If the user explicitly requests a review or explanation mid-flow, stop editing and respond to that request first.

## Stage Contracts

### `spec`

- Output only a compact execution spec, not an essay.
- Include `behavior`, `non-behavior`, `edge cases`, and `oracle`.
- Prefer observable product behavior over implementation details.
- If the oracle is weak or missing, say so explicitly before moving to `red`.

### `red`

- Edit only tests or test fixtures needed to express the failing behavior.
- Do not edit production code.
- Do not use `skip`, `todo`, `.only`, or equivalent narrowing shortcuts.
- Test observable behavior, not private implementation details, unless the repo already uses that pattern and the target is truly internal.
- State briefly why the new test should fail before implementation.

### `green`

- Make the smallest production change that satisfies the approved failing test.
- Keep the meaning of the test suite fixed.
- Test edits are allowed only for mechanical harness issues:
  - import or path fixes
  - fixture wiring
  - mock, stub, fake timer, or environment setup needed to execute the existing test intent
  - removing nondeterminism that makes the test flaky without changing its meaning
- Do not hard-code values, add special-case input handling, or create test-case-specific bypasses just to satisfy the current tests.
- Do not change expected values, weaken assertions, delete cases, or narrow coverage to fit the implementation.
- Do not add unrelated refactors, abstractions, or speculative cleanup.
- If the test's intended behavior appears wrong, stop and report `BLOCKED: test intent needs review`, then return to `spec` or `red` instead of silently rewriting the test.

### `refactor`

- Preserve passing behavior while improving structure.
- Keep scope narrow. Refactor only what the approved change now touches.
- If behavior might change, observable outputs shift, or the oracle no longer feels obviously valid, stop immediately and reopen `spec`.
- If refactoring requires new behavior or a changed oracle, stop and reopen `spec`.

## Verification

- Required gates for TypeScript changes are:
  - `npm test`
  - `npx tsc --noEmit`
- Conditional gates:
  - repo-native lint command
  - integration tests
  - E2E or smoke checks when routing, async effects, focus management, or user-visible workflows changed
- Prefer repo-native equivalents when they are clearly better fits from `package.json`.
  - Example: a project-specific `test`, `check`, or `typecheck` script.
- Do not add a new production dependency without explicit user confirmation.
- If package installation is required, prefer `pnpm`.
- If verification is too expensive or impossible in the current environment, say so explicitly and report the closest check you ran.

## Output Expectations

- Before approval, output only the concise plan and any blocking questions.
- In `spec`, report only the compact behavior contract and oracle.
- In `red`, report the exact failing behavior the test captures.
- In `green`, report the minimal implementation change.
- In `refactor`, report only structural cleanups and any preserved invariants.
- In `verify`, report the commands run, whether they passed, and any residual risk.

## When To Exit This Skill

- If the task is mostly documentation, brainstorming, architecture-only discussion, or code review, return to the normal workflow instead of forcing staged TDD.
- If the request is E2E-heavy or requires a broad migration, use this skill only to define the first safe slice rather than forcing the entire effort through one loop.
