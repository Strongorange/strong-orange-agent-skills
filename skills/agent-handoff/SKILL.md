---
name: agent-handoff
description: Create focused thread-to-thread handoff packets (goal, locked decisions, relevant files, risks, acceptance criteria, and next-thread starter prompt). Use when switching tasks, moving from backend to frontend, splitting large work into phases, or asking another agent/thread to continue implementation without context loss.
---

# Agent Handoff

## Overview
Create a clean handoff packet for the next thread instead of compressing context into a lossy summary.

## Workflow
1. Define the exact next-thread goal in one sentence.
2. Collect only relevant context for that goal:
- current implementation state
- API/data contracts and constants
- locked decisions and constraints
- unresolved risks/blockers
- files the next thread must read first
3. Draft a next-thread starter prompt that is immediately executable.
4. Include acceptance criteria and verification commands.

## Output Format
Return a single markdown handoff packet with these sections in order:

- `Title`
- `Goal`
- `Current State`
- `Locked Decisions`
- `Contracts`
- `Relevant Files`
- `Open Risks`
- `Acceptance Criteria`
- `Start Prompt`

Keep it concise and decision-complete. Avoid narrative history.

## Rules
- Prefer exact values over paraphrases (error codes, endpoint paths, payload shapes, feature flags).
- Include file paths with line numbers when possible.
- Do not include unrelated files.
- If uncertainty remains, state it explicitly under `Open Risks`.
- If requested, write the packet to `docs/handoff/<yyyy-mm-dd>-<slug>.md`.

## Starter Prompt Style
Use imperative wording so the next thread can execute immediately.

Good:
- `Implement FE integration for POST /ai/ai_style_change using these contracts...`
- `Execute phase 1 of this plan and report only regressions + fixes.`

Avoid:
- vague summaries
- retrospective narrative

## Resources
- Template: `references/handoff-template.md`
- Optional generator script: `scripts/create_handoff.py`

If a user asks for a saved handoff file, use the script first, then fill placeholders with real context.
