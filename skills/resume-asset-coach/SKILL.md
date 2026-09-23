---
name: resume-asset-coach
description: Turn real projects, features, refactors, incidents, and technical tooling work into honest resume and interview assets. Use when Codex should extract resume bullets, project summaries, portfolio blurbs, defensible ownership framing, 1-minute interview stories, likely interviewer questions, follow-up questions, or AI-assisted credibility-safe wording from a repo, PR, changelog, ticket, or user-provided work history.
---

# Resume Asset Coach

## Overview
Convert real work into defensible career assets. Ground every claim in code, docs, commits, release history, or user-provided facts; do not optimize for hype.

## Workflow
1. Gather evidence first.
Read the repo, docs, changelog, PRs, release notes, or user notes before writing assets.

2. Separate facts from interpretation.
Extract:
- what changed
- what problem it solved
- what the user likely owned
- what impact is directly proven
- what is only inferred

3. Frame ownership honestly.
- Use `implemented`, `designed`, `standardized`, `debugged`, `operated`, `shipped`, or `improved` only when supported by evidence.
- Call out `AI-assisted` work when that matters to credibility.
- Never claim sole authorship, scale, or metrics without support.

4. Pick the right deliverables.
Common outputs:
- resume bullets
- project or portfolio summary
- 1-minute interview answer
- likely interviewer questions
- follow-up questions
- strong but honest model answers
- claims the user can safely defend

5. Tune the strength without inventing facts.
When useful, provide:
- `Safe`: conservative and fully provable
- `Stronger`: sharper phrasing that is still defensible

6. Ask only for missing facts that materially change the asset.
If the evidence is already strong enough, proceed.

## Output Patterns

### Resume Bullets
- Keep each bullet focused on one accomplishment.
- Use: action + scope + technical mechanism + result.
- Prefer concrete nouns over generic senior-sounding language.
- Quantify only when evidence exists.

Useful patterns:
- `Improved ... by ... through ..., enabling ...`
- `Built/standardized ... to ..., reducing ...`
- `Designed and shipped ... that ...`
- `Automated ... so that ...`

### 1-Minute Interview Story
Return these sections:
- `What it was`
- `Why it mattered`
- `What I specifically owned`
- `Hard part`
- `Decision or tradeoff`
- `Outcome`
- `What I would improve next`

### Question Pack
Return:
- `Likely Questions`
- `Follow-up Questions`
- `Model Answers`

Prioritize questions about:
- problem framing
- technical decisions
- tradeoffs
- debugging
- impact
- ownership
- AI usage honesty

### AI-Assisted Framing
When AI materially helped, frame the work as user-owned decision making plus AI-assisted execution.

Good patterns:
- `Used AI-assisted implementation while owning requirements, technical decisions, validation, and release.`
- `Led the workflow and policy design, then used AI to accelerate implementation and documentation.`

Avoid:
- claiming manual from-scratch implementation if false
- saying only `used AI` without clarifying what the user actually owned

## Rules
- Optimize for defensibility, not hype.
- Prefer repo-grounded statements over generic career language.
- If the work is internal tooling or DX, present it as productivity, reliability, standardization, or operability impact.
- If impact is local-only, use phrases like `reduced setup friction`, `made parallel validation possible`, `standardized local workflows`, or `improved reliability of developer testing`.
- If the user asks to sound stronger, strengthen wording without inventing scope, metrics, or ownership.
- If codebase context exists, cite files when explaining why a claim is defensible.
- If asked for broad resume prep, include both bullets and interview prep.
- If the user seems hesitant about claiming ownership, include an `Ownership Narrative` section that explains what they can honestly say.

## Default Deliverable
When the user gives a project and asks broadly for “resume assets,” return:
- `Resume Bullets`
- `1-Minute Summary`
- `Claims I Can Defend`
- `Likely Questions`
- `Follow-up Questions`
- `Model Answers`
- `AI-Assisted Honesty Line` when relevant
