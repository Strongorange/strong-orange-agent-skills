# Functional Spec Quality Checklist

Use this checklist before finalizing the document.

## 1. Reality Grounding

- Did you inspect the actual codebase before writing?
- Did you verify the main FE entry point, API path, and persistence path?
- Did you separate verified facts from assumptions?
- Did you ask the user only for non-discoverable product intent or decisions?

## 2. Minimum Structure

The document should usually include:

- purpose
- background
- scope
- actors / preconditions
- use cases
- functional requirements
- business rules
- interfaces
- data requirements
- error handling
- non-functional requirements
- open questions
- risks or design debt

## 3. AS-IS Specific Checks

- Did you clearly label the document as `AS-IS`?
- Did you avoid describing intended future behavior as current behavior?
- Did you create a separate section for mismatches, stale code, dead paths, or policy drift?
- Did you capture how the feature actually behaves end-to-end?

## 4. TO-BE Specific Checks

- Did you clearly label the document as `TO-BE`?
- Did you distinguish desired behavior from current behavior?
- Did you define scope and exclusions explicitly?
- Did you include compatibility, rollout, or migration constraints when relevant?

## 5. Requirement Quality

- Is each requirement testable?
- Is each requirement specific enough for engineering and QA to act on?
- Did you avoid mixing multiple requirements into one vague sentence?
- Did you use exact field names, statuses, endpoint paths, or enums where useful?

## 6. Single-Format Discipline

- Is the team using one stable section order across features?
- Is the document staying focused on the functional spec itself rather than turning into a test plan?
- If tests are needed, are they split into a separate artifact?

## 7. Traceability

- Did you list the core files, endpoints, tables, configs, or services used to verify the doc?
- If the repo already had related docs, did you note where the implementation differs?

## 8. Practical Source Basis

This checklist is intentionally practical, but it is not arbitrary. It aligns with the common structure found across well-known requirements-document practices:

- IEEE / ISO requirements specifications: purpose, scope, stakeholders, operational scenarios, requirements, verification
- common PRD / BRD templates: assumptions, out of scope, user stories/use cases, dependencies, open questions
- functional specification guidance: capabilities, interactions, exceptions, system response

Use this checklist as a working team standard, not as a claim that one single template is universally mandatory.
