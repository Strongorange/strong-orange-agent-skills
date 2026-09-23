#!/usr/bin/env python3
"""Create a handoff markdown skeleton.

Example:
  python3 scripts/create_handoff.py \\
    --goal "Implement FE integration for order checkout" \\
    --title "Backend to FE Handoff" \\
    --output docs/handoff/2026-02-12-order-checkout-fe.md \\
    --worktree ~/worktrees/my-repo/my-feature \\
    --branch feature/my-feature --base main \\
    --files src/api/orders.ts src/services/order-service.ts
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path


def build_content(title: str, goal: str, files: list[str], worktree: str, branch: str, base: str) -> str:
    file_lines = "\n".join(f"- `{f}` - <why it matters>" for f in files) if files else "- <add relevant files>"

    return f"""# {title}

## Goal
{goal}

## Workspace
- Worktree/checkout: `{worktree or "<path>"}`
- Branch: `{branch or "<branch>"}` / Base: `{base or "<base branch — state it, do not assume>"}`
- Commits so far: `<sha> <subject>`
- PR: `<number + state, or "none yet">`

## Current State
- <what is already implemented>
- <what is not implemented>

## Locked Decisions
- <decision> - <why, so the next thread does not undo it>

## Contracts
- Endpoint/API:
- Request shape:
- Response shape:
- Error handling:
- Constants/keys:

## Relevant Files
{file_lines}

## Hard-won Context
- Run it locally: <env values, ports to avoid, seeded credentials + the script that mints them>
- Trap: <symptom> -> <cause> -> <what to do instead>
- Normal and unrelated: <errors that are safe to ignore>
- Already tried and rejected: <approach> - <why>
- Cleanup owed: <temp scripts, test rows, local-only files>

## Working Agreement
- Slice size / when to stop and report: <...>
- What counts as evidence: <...>
- Commit - comment - PR style: <...>
- Off-limits: <ports, data, other threads' files>
- Tools & skills: `<tool or skill>` - <when to reach for it>

## Open Risks
- <risk or unknown>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Verification
- `<command or manual step>` - <expected result>
- `<command or manual step>` - <expected result>

## Related Docs
- <canonical note/vault link> - <what it holds>

## Start Prompt
```text
Read this handoff end to end. Work in {worktree or "<worktree>"}, branch {branch or "<branch>"}, base {base or "<base>"}.
<direct task for the next thread>
```
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a handoff markdown skeleton")
    parser.add_argument("--goal", required=True, help="One-sentence objective for next thread")
    parser.add_argument("--title", default="Handoff", help="Handoff title")
    parser.add_argument("--output", required=True, help="Output markdown path")
    parser.add_argument("--files", nargs="*", default=[], help="Relevant file paths")
    parser.add_argument("--worktree", default="", help="Checkout or git worktree path the next thread works in")
    parser.add_argument("--branch", default="", help="Working branch")
    parser.add_argument("--base", default="", help="Base branch the PR targets")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    content = build_content(args.title, args.goal, args.files, args.worktree, args.branch, args.base)
    content = f"<!-- generated: {timestamp} -->\n\n" + content

    output_path.write_text(content, encoding="utf-8")
    print(str(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
