#!/usr/bin/env python3
"""Create a handoff markdown skeleton.

Example:
  python3 scripts/create_handoff.py \\
    --goal "Implement FE integration for ai_style_change" \\
    --title "Backend to FE Handoff" \\
    --output docs/handoff/2026-02-12-style-change-fe.md \\
    --files application/controllers/AI.php application/libraries/AiReWriteService.php
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path


def build_content(title: str, goal: str, files: list[str]) -> str:
    file_lines = "\n".join(f"- `{f}` - <why it matters>" for f in files) if files else "- <add relevant files>"

    return f"""# {title}

## Goal
{goal}

## Current State
- <what is already implemented>
- <what is not implemented>

## Locked Decisions
- <decision 1>
- <decision 2>

## Contracts
- Endpoint/API:
- Request shape:
- Response shape:
- Error handling:
- Constants/keys:

## Relevant Files
{file_lines}

## Open Risks
- <risk or unknown>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Start Prompt
```text
<direct prompt to start the next thread>
```
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a handoff markdown skeleton")
    parser.add_argument("--goal", required=True, help="One-sentence objective for next thread")
    parser.add_argument("--title", default="Handoff", help="Handoff title")
    parser.add_argument("--output", required=True, help="Output markdown path")
    parser.add_argument("--files", nargs="*", default=[], help="Relevant file paths")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    content = build_content(args.title, args.goal, args.files)
    content = f"<!-- generated: {timestamp} -->\n\n" + content

    output_path.write_text(content, encoding="utf-8")
    print(str(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
