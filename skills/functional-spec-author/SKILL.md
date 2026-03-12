---
name: functional-spec-author
description: Create or update grounded functional specifications for web, app, and backend features. Use when documenting an existing feature from the codebase into an AS-IS spec, turning a planned change into a TO-BE spec, standardizing team feature documentation, or reconciling UI, API, DB, and business rules into one decision-ready requirements document.
---

# Functional Spec Author

Write a functional specification that is grounded in reality, not guessed from fragments.

## Workflow

1. Identify the document mode first.
   - `AS-IS`: document current behavior from the existing implementation.
   - `TO-BE`: document desired behavior for a planned feature or change.
   - `AS-IS + TO-BE`: document current state and the target state together when both are needed.
2. Ground in the codebase before writing.
   - Inspect FE entry points, state stores, API calls, controller/service paths, persistence, flags, and tests.
   - Prefer code and live config/data over stale docs.
   - Ask the user only for product intent or decisions that are not discoverable locally.
3. Separate verified facts from assumptions.
   - For `AS-IS`, write only behavior you can verify from code, config, data, logs, or explicit user confirmation.
   - For `TO-BE`, label desired behavior clearly and keep current behavior separate.
4. Use the team or repo template if one already exists.
   - If none exists, use `references/spec-template.md`.
5. Use one unified detailed functional-spec format for both `AS-IS` and `TO-BE`.
   - Keep the section order stable across documents.
   - Change the content by mode, not the structure.
   - Do not introduce a separate test-plan or QA section unless the user explicitly asks for it.
6. Fill the minimum decision-useful sections.
   - Purpose and background
   - Scope and exclusions
   - Actors, prerequisites, dependencies
   - User scenarios / use cases
   - Functional requirements
   - Business rules
   - UI and state transitions when relevant
   - APIs, events, and external dependencies
   - Data requirements
   - Error handling
   - Non-functional requirements
   - Open questions and risks
7. For `AS-IS` documentation, add an explicit current-gap section.
   - Record code/data mismatches, dead paths, stale flags, or policy drift separately.
   - Do not mix current behavior with intended behavior in the same requirement line.
8. For `TO-BE` documentation, add explicit compatibility notes.
   - Record migrations, rollout constraints, fallback behavior, and what must stay unchanged.
9. Include implementation traceability when the doc is code-grounded.
   - List the files, endpoints, tables, flags, and services used to verify the document.

## Rules

- Use one requirement per line when possible: `The system must ...`
- Prefer concrete nouns and exact values over vague wording.
- Do not hide uncertainty. Put it in `Open Questions` or `Risks`.
- Do not guess details that can be discovered by reading the repo.
- Treat test scenarios and QA cases as a separate artifact by default.
- If the codebase contradicts older docs or UI labels, trust the implementation and record the contradiction explicitly.
- If the user asks for a saved document, prefer one of these filenames unless the repo already has a naming convention:
  - `<feature>-functional-spec-as-is.md`
  - `<feature>-functional-spec-to-be.md`
  - `<feature>-functional-spec.md`

## Quality Bar

Before finalizing, read `references/quality-checklist.md` and make sure the document is:

- grounded in actual evidence
- complete enough for engineering and product review
- explicit about scope, rules, errors, and constraints
- clear about what is current truth vs planned change

## Resources

- Template fallback: `references/spec-template.md`
- Review checklist and source basis: `references/quality-checklist.md`
