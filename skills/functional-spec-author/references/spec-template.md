# Functional Spec Template

Use this template when the repo does not already provide a better house style.

## Document Info

| Field | Value |
| --- | --- |
| Title | `[Feature] Functional Specification` |
| Type | `AS-IS / TO-BE / AS-IS + TO-BE` |
| Status | `Draft / In Review / Approved` |
| Owner | `[Owner]` |
| Reviewers | `[Reviewers]` |
| Approver | `[Approver]` |
| Date | `YYYY-MM-DD` |

## Version History

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| v0.1 | `YYYY-MM-DD` | `[Author]` | Initial draft |

## 1. Purpose

- State what this feature or document is for.

## 2. Background

- State the current problem, business context, or motivation.

## 3. Scope

### In Scope

- `[Item]`

### Out of Scope

- `[Item]`

## 4. Actors and Preconditions

| Actor | Description |
| --- | --- |
| `[Actor]` | `[Description]` |

- Preconditions
  - `[Condition]`

## 5. Use Cases

### UC-01. `[Scenario]`

1. `[Step]`
2. `[Step]`
3. `[Result]`

## 6. Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-001 | The system must `[behavior]`. | High |

## 7. Business Rules

| ID | Rule |
| --- | --- |
| BR-001 | `[Rule]` |

## 8. UI / UX Requirements

- Screens, drawers, modals, key controls
- State transitions
- Loading, disabled, empty, and error states

## 9. Interfaces

### APIs

| API | Method | Request | Response |
| --- | --- | --- | --- |
| `[Path]` | GET/POST | `[Core fields]` | `[Core fields]` |

### External Services / Events

| System | Purpose | Failure Handling |
| --- | --- | --- |
| `[Service]` | `[Purpose]` | `[Handling]` |

## 10. Data Requirements

| Entity / Table | Purpose |
| --- | --- |
| `[Entity]` | `[Purpose]` |

## 11. Error Handling

| Case | System Handling | User Message |
| --- | --- | --- |
| `[Case]` | `[Handling]` | `[Message]` |

## 12. Non-Functional Requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-001 | Performance | `[Requirement]` |

## 13. Open Questions

| ID | Question | Needed Decision |
| --- | --- | --- |
| OQ-001 | `[Question]` | `[Who decides / what is needed]` |

## 14. Risks / Design Debt

| ID | Item | Impact |
| --- | --- | --- |
| KD-001 | `[Risk or mismatch]` | High/Medium/Low |

## 15. Implementation Trace

- Files inspected
- APIs verified
- Tables queried
- Flags/configs checked

For `AS-IS` docs, keep this section.
For pure `TO-BE` docs, keep it only if current-state grounding matters.

## Notes

- Keep test scenarios, test cases, and QA execution plans in a separate test artifact unless the user explicitly wants them combined.
- Keep one stable document structure across features so the team can scan documents predictably.
