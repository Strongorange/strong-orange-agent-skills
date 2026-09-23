# strong-orange-agent-skills

Personal skill package repository for `npx skills`.

## Install with an agent

Paste this into Claude Code, Codex, or Cursor:

```text
Install my skills from https://github.com/Strongorange/strong-orange-agent-skills.
1. Read the "Included skills" list in its README. Install those, and skip skill-creator and skill-installer (bundled Codex system skills).
2. Install user-level for all three agents:
   npx skills add Strongorange/strong-orange-agent-skills -g -a claude-code codex cursor -s <skill> -s <skill> ... -y
3. Verify: each skill is a folder at ~/.agents/skills/<skill>, and ~/.claude/skills/<skill> is a symlink to ../../.agents/skills/<skill>.
   Codex and Cursor read ~/.agents/skills directly. Do not add links under ~/.codex/skills or ~/.cursor/skills, or Codex lists the skill twice.
4. If a skill folder has config.example.yml, copy it to config.local.yml in the same folder and ask me for the values.
```

## Install by hand

```bash
# List skills without installing
npx skills add Strongorange/strong-orange-agent-skills --list

# Install user-level to ~/.agents/skills (Claude Code gets a symlink; Codex and Cursor read it directly)
npx skills add Strongorange/strong-orange-agent-skills -g -a claude-code codex cursor -s agent-handoff -s review-all -y

# Update or remove
npx skills update -g
npx skills remove -g -s agent-handoff
```

`--all` also installs the bundled `skill-creator` and `skill-installer` from `skills/.system`, so pick skills with `-s` instead.

## Included skills

- agent-handoff
- agent-skill-sync-manager
- functional-spec-author
- hitl-eval-dashboard
- refactor-review-checklist
- resume-asset-coach
- resume-driven-development-coach
- review-acid
- review-all
- review-comments
- review-ready-branch-rewrite
- review-solid
- review-tests
- runtime-evidence-debugger
- scaffold-dev-verify
- strategy-template-governor
