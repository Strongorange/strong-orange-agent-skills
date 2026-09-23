---
name: agent-skill-sync-manager
description: |
  Manage local and publishable Agent Skills across this machine. Use when the user asks to register, install, sync, publish, mirror, push, or verify skills across ~/.agents/skills, Claude Code, Cursor, Codex, team skill repo, or Strongorange personal skill repo. Treat ~/.agents/skills as the working source of truth, create agent-specific symlinks, compare hashes before overwriting, and only commit or push after explicit user request or confirmation.
---

# Agent Skill Sync Manager

This skill manages the local skill workspace and the two publish repositories used on this machine.

The working entrypoint is `~/.agents/skills`. Agent runtimes should read skills through symlinks from their own discovery paths.

## Known Locations

| Purpose | Path |
|---|---|
| Working source | `~/.agents/skills` |
| Claude Code skills | `~/.claude/skills` |
| Cursor skills | `~/.cursor/skills` |
| Codex skills | `~/.codex/skills` |
| Team repo | `~/github/<team>-agent-skills` |
| Strongorange personal repo | `~/github/strong-orange-agent-skills` |

OpenCode is not locked yet. If the user mentions OpenCode, discover its current skill path before changing anything.

## Operating Model

- Treat `~/.agents/skills/<skill>` as the working source.
- If that entry is a symlink, resolve it and report the real origin before syncing.
- Prefer runtime symlinks in this shape: `../../.agents/skills/<skill>`.
- Do not overwrite, delete, or replace existing skills without showing diff or hash comparison first.
- Do not commit or push unless the user explicitly asked for it or confirmed after review.
- Never force push. Never use destructive git commands.

## Workflow

### Step 1: Identify the Skill

Determine the skill name from the user request or path.

Check:

```bash
ls -ld ~/.agents/skills/<skill>
test -f ~/.agents/skills/<skill>/SKILL.md
```

Read `SKILL.md` and verify:

- frontmatter exists
- `name` equals the directory name
- `description` is non-empty and trigger-oriented
- `SKILL.md` is under 500 lines unless there is a strong reason

### Step 2: Resolve Origin

Classify the working entry:

| Entry type | Action |
|---|---|
| Normal directory | Treat as local working source |
| Symlink to a repo skill | Treat target repo path as origin; avoid blind copy back |
| Symlink to project-local skill | Ask before publishing outside the project |
| Missing | Stop and ask whether to create or install it |

Report the resolved origin before syncing to repos.

### Step 3: Choose Targets

If the user did not specify targets, ask where to sync:

- `local only`: `~/.agents/skills` plus runtime symlinks
- `team repo`: `~/github/<team>-agent-skills`
- `personal repo`: `~/github/strong-orange-agent-skills`
- `both repos`: both publish repositories

Defaults:

- Company/project/team workflow skills -> team repo
- personal workflow, generic utility, experimental skills -> personal repo
- user says “team and personal both” -> both repos

### Step 4: Sync Runtime Symlinks

For each runtime path that should recognize the skill:

```bash
ln -s ../../.agents/skills/<skill> ~/.claude/skills/<skill>
ln -s ../../.agents/skills/<skill> ~/.cursor/skills/<skill>
ln -s ../../.agents/skills/<skill> ~/.codex/skills/<skill>
```

Before creating a link:

- If the path does not exist, create the symlink.
- If it already points to the same resolved target, leave it.
- If it points elsewhere, report it and ask before replacing.
- If it is a real directory, do not replace it automatically.

### Step 5: Sync Publish Repos

Publish repo layout:

```text
skills/<skill>/SKILL.md
skills/<skill>/references/
skills/<skill>/scripts/
skills/<skill>/agents/openai.yaml
```

Copy the whole skill directory when supporting files exist. At minimum, copy `SKILL.md`.

Update README included-skills list:

- Team repo uses backticks: ``- `<skill>` ``
- Strongorange repo uses plain bullets: `- <skill>`
- Preserve the existing README style and ordering as much as possible.

Compare source and destination:

```bash
sha256sum ~/.agents/skills/<skill>/SKILL.md \
  <repo>/skills/<skill>/SKILL.md
```

For supporting files, compare file lists and hashes as needed.

### Step 6: Review Before Commit

Before committing, run in each touched repo:

```bash
git status --short
git diff --stat
git diff
git log -5 --oneline
```

Review for:

- unrelated dirty files
- accidentally included secrets or environment files
- README mismatch
- missing supporting files

Use the repo’s existing commit style. Common local pattern:

```text
[feat] <skill> 스킬 추가
```

### Step 7: Push Only When Requested

If the user asked to push, run:

```bash
git push origin main
```

After push:

```bash
git status --short
git log -1 --oneline
```

Report commit hashes and whether each repo is clean.

## Verification Checklist

- [ ] `~/.agents/skills/<skill>/SKILL.md` is readable.
- [ ] Claude/Cursor/Codex runtime paths can read `SKILL.md`.
- [ ] Runtime paths are symlinks to `~/.agents/skills/<skill>` or a deliberately accepted equivalent.
- [ ] `name` frontmatter matches the directory name.
- [ ] Source and publish repo copies have matching hashes when publishing.
- [ ] README included-skills list is updated when publishing.
- [ ] Git working tree is clean after commit/push.

## Safety Rules

- Do not publish skills containing tokens, credentials, customer data, private server names, or one-off local secrets.
- Do not replace a real directory with a symlink automatically.
- Do not overwrite a different repo copy without showing diff or hash comparison.
- Do not commit unrelated files.
- Do not force push.
- Do not assume OpenCode’s path; discover it first.

