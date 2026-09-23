---
name: refactor-review-checklist
description: Review or self-check refactors, cleanups, code moves, naming cleanup, abstraction changes, and maintainability-focused diffs. Use when an agent needs to judge whether a refactor preserves behavior, respects architecture boundaries and codebase conventions, keeps comments and documentation consistent, remains easy to maintain, and uses tests that are resistant to internal refactors.
---

# Refactor Review Checklist

## Overview

Use this skill to review or self-check refactors before staging, during review, or before merge.
Apply it to changes that modify structure more than product behavior: extraction, consolidation, file moves, dependency cleanup, interface trimming, and test rewrites.

## Core Checklist

- Preserve observable behavior unless the request explicitly changes behavior.
- Check SOLID alignment where relevant, especially single responsibility, dependency direction, and interface size.
- Respect the project architecture and module boundaries. If the project uses FSD, layered architecture, clean architecture, or similar rules, preserve ownership and import direction.
- Follow existing codebase conventions for naming, file placement, patterns, error handling, and comment style.
- Keep comment language consistent with repository standards. Flag mixed-language or stale comments.
- Prefer the smallest coherent change. Avoid mixing refactor, feature work, and formatting churn.
- Avoid widening public APIs, schemas, config surfaces, or dependencies without clear need.
- Preserve error semantics, edge-case handling, and failure-mode behavior.
- Reduce duplication only when the new abstraction is simpler than the repeated code.
- Keep names aligned with domain language and local patterns.
- Remove dead code only when it is clearly unreachable or replaced by a verified path.
- Check hot paths for performance, bundle size, allocation, query-count, or I/O regressions.
- Keep changes easy to bisect, debug, and revert.
- Update nearby docs, types, examples, or comments when the change modifies a developer-facing contract or expectation.
- Prefer contract-focused tests over implementation-coupled tests.
- Treat test-only rewiring with skepticism. Reject tests that mainly preserve the current implementation shape.
- Ask whether the change is easier to maintain six months later, not only whether it is cleaner today.

## Mini Workflow

1. Identify the invariants: behavior, API, UX, architecture constraints, and compatibility points that must remain stable.
2. Read the change for correctness and contract drift before judging style.
3. Flag material issues first: behavior regressions, boundary violations, brittle abstractions, misleading comments, and weak tests.
4. Separate required fixes from optional polish.
5. End with residual risks, missing tests, and any manual verification still needed.

## Output Expectations

- Report findings first and order them by severity.
- Cite concrete evidence from the change, file, test, or runtime behavior.
- State explicitly when no material findings are present.
- Keep summaries short and avoid changelog-style narration.
- For self-check mode, include residual risks, rollback notes, debuggability notes, and unverified assumptions.

## Do Not Do

- Do not reward abstraction for its own sake.
- Do not approve larger surface area without justification.
- Do not treat passing tests as sufficient evidence if the tests are brittle or over-mocked.
- Do not demand one architecture style universally. Evaluate against the local codebase standard.
- Do not suggest broad rewrites unless they remove a concrete risk that the current refactor introduces.
