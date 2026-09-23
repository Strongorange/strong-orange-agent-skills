# strong-orange-agent-skills

Personal skill package repository for `npx skills`.

## Install with an agent

Paste this into Claude Code, Codex, Cursor, or OpenCode:

```text
Install my skills from https://github.com/Strongorange/strong-orange-agent-skills.
0. If ~/.agents/skills/tone-fix/.tone-fix-source exists, this is the machine that holds the tone-fix source. Leave tone-fix out of step 1 and skip step 4, or its local edits are overwritten.
1. Install every skill user-level (or pick some from the "Included skills" list with -s <skill>):
   npx skills add Strongorange/strong-orange-agent-skills -g -a claude-code codex cursor -s '*' -y
2. Verify: each skill is a folder at ~/.agents/skills/<skill>, and ~/.claude/skills/<skill> is a symlink to ../../.agents/skills/<skill>.
   Codex, Cursor, and OpenCode read ~/.agents/skills directly. Do not add links under ~/.codex/skills, ~/.cursor/skills, or ~/.config/opencode/skills (and do not pass -a opencode), or the skill is listed twice.
3. If a skill folder has config.example.yml, copy it to config.local.yml in the same folder and ask me for the values.
4. If tone-fix was installed (needs python3):
   - Run `python3 ~/.agents/skills/tone-fix/install.py --check` and show me what it will change, then run it without --check.
     It only touches agents that exist on this machine: Claude Code (~/.claude/rules link, settings.json hooks), Codex (~/.codex/AGENTS.md block, hooks.json), OpenCode (~/.config/opencode/plugins/tone-fix.js and AGENTS.md links). Backups go to ~/.local/state/tone-fix/backups/.
   - Verify: `for h in response-lint commit-pr-lint comment-lint; do python3 ~/.agents/skills/tone-fix/hooks/$h.py --self-test; done` prints ok three times.
   - Tell me to restart the agents. In Codex I must approve the new hooks in /hooks, or they never run.
   - Run install.py again after every `npx skills update`.
```

## Install by hand

```bash
# List skills without installing
npx skills add Strongorange/strong-orange-agent-skills --list

# Install user-level to ~/.agents/skills (Claude Code gets a symlink; Codex and Cursor read it directly)
npx skills add Strongorange/strong-orange-agent-skills -g -a claude-code codex cursor -s '*' -y
npx skills add Strongorange/strong-orange-agent-skills -g -a claude-code codex cursor -s agent-handoff -s review-all -y

# Update or remove
npx skills update -g
npx skills remove -g -s agent-handoff
```

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
- tone-fix
