#!/usr/bin/env python3
"""PreToolUse(Write · Edit · MultiEdit) hook: 파일에 들어갈 주석 · 테스트 이름 · 문서 문장 검사.

코드 파일: 주석 줄과 it · test · describe 이름에서 사전 금지어 + 줄 끝 "~한다" 류 종결.
마크다운: 코드 블록 · 백틱 밖 문장에서 사전 금지어만.
금지어 사전 · 종결 판정은 commit-pr-lint.py 와 같은 것을 씀. 규칙 정본은 ../rules.md.
자체 검증: python3 comment-lint.py --self-test
"""
import importlib.util, json, os, re, sys

sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.realpath(__file__))
_spec = importlib.util.spec_from_file_location("commit_pr_lint", os.path.join(HERE, "commit-pr-lint.py"))
cpl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cpl)

# 금지어를 설명하려고 그대로 적는 파일들
SKIP_DIRS = [os.path.dirname(HERE) + os.sep] + [os.path.expanduser(p) for p in (
    "~/.claude/rules/", "~/.claude/handoffs/", "~/.claude/backups/",
)]
SLASH_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".go", ".java",
             ".kt", ".swift", ".rs", ".c", ".cc", ".cpp", ".h", ".cs", ".php", ".scala", ".dart"}
HASH_EXT = {".py", ".sh", ".bash", ".zsh", ".rb", ".yml", ".yaml", ".toml", ".tf", ".hcl",
            ".conf", ".ini", ".env", ".r"}
CSS_EXT = {".css", ".scss", ".less", ".sql"}
MD_EXT = {".md", ".mdx"}
HANGUL = re.compile(r"[가-힣]")
SLASH_COMMENT = re.compile(r"(?:^|\s|[;{(,])//+\s?(.*)$|/\*+\s?(.*?)(?:\*/|$)|^\s*\*(?!/)\s?(.*)$")
HASH_COMMENT = re.compile(r"(?:^|\s)#+\s?(.*)$")
SQL_COMMENT = re.compile(r"(?:^|\s)--\s?(.*)$|/\*+\s?(.*?)(?:\*/|$)|^\s*\*(?!/)\s?(.*)$")
TEST_NAME = re.compile(r"\b(?:it|test|describe)(?:\.\w+)*\(\s*(['\"`])(.*?)\1")
FENCE = re.compile(r"^\s*(```|~~~)")


def first_group(m):
    return next((g for g in m.groups() if g), "") if m else ""


def code_lines(text, ext):
    """검사할 (문장, 종결 검사 여부) 목록."""
    if ext in SLASH_EXT:
        pattern = SLASH_COMMENT
    elif ext in HASH_EXT:
        pattern = HASH_COMMENT
    else:
        pattern = SQL_COMMENT
    out = []
    for line in text.splitlines():
        if line.startswith("#!"):
            continue
        comment = first_group(pattern.search(line)).strip()
        if comment:
            out.append(comment)
        if ext in SLASH_EXT or ext == ".py":
            out += [m.group(2) for m in TEST_NAME.finditer(line)]
    return [(s, True) for s in out if HANGUL.search(s)]


def md_lines(text):
    out, in_fence = [], False
    for line in text.splitlines():
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if not in_fence and HANGUL.search(line):
            out.append((line, False))
    return out


def problems(path, text):
    given = os.path.abspath(os.path.expanduser(path))
    full = os.path.realpath(given)
    if any(p.startswith(d) for p in (given, full) for d in SKIP_DIRS):
        return []
    ext = os.path.splitext(full)[1].lower()
    if ext in MD_EXT:
        lines = md_lines(text)
    elif ext in SLASH_EXT | HASH_EXT | CSS_EXT:
        lines = code_lines(text, ext)
    else:
        return []
    rules = cpl.load_dict()
    found = []
    for raw, check_ending in lines:
        line = cpl.CODE_SPAN.sub("", raw)
        for pattern, fix in rules:
            m = pattern.search(line)
            if m:
                found.append(f'"{m.group(0)}" ({raw.strip()[:50]}) → {fix}')
        if check_ending and cpl.ends_with_plain_form(line):
            found.append(f'"~한다" 류 종결: "{raw.strip()[:60]}" → 끝을 짧게(예: ~함 · ~고침 · 명사로 끝)')
    return list(dict.fromkeys(found))


PATCH_FILE = re.compile(r"^\*\*\* (?:Add|Update) File: (.+)$|^\*\*\* Move to: (.+)$")


def patch_files(patch):
    """apply_patch 본문(Codex 의 tool_input.command)을 파일별 추가 줄로 나눔."""
    files, current = {}, None
    for line in patch.splitlines():
        m = PATCH_FILE.match(line)
        if m:
            current = (m.group(1) or m.group(2)).strip()
            files.setdefault(current, [])
        elif line.startswith("*** "):
            current = None
        elif current and line.startswith("+"):
            files[current].append(line[1:])
    return [(path, "\n".join(lines)) for path, lines in files.items()]


def targets(data):
    """검사할 (파일 경로, 새로 들어갈 내용) 목록."""
    tool_input = data.get("tool_input", {})
    if data.get("tool_name") == "apply_patch":
        cwd = data.get("cwd", "")
        return [(os.path.join(cwd, p), t) for p, t in patch_files(tool_input.get("command", ""))]
    if "content" in tool_input:
        text = tool_input["content"]
    elif "edits" in tool_input:
        text = "\n".join(e.get("new_string", "") for e in tool_input["edits"])
    else:
        text = tool_input.get("new_string", "")
    return [(tool_input.get("file_path", ""), text)]


def self_test():
    ok = bool(problems("/x/a.ts", "// 캐시를 비운다\nconst a = 1"))
    ok &= problems("/x/a.ts", "// 캐시를 비움. 동시에 지우면 경합\nconst url = 'https://a.b/한다'") == []
    ok &= bool(problems("/x/a.ts", "/**\n * 요청을 배선에 연결\n */"))
    ok &= bool(problems("/x/a.test.ts", "it('칩 경로는 결정적으로 동작한다', () => {})"))
    ok &= problems("/x/a.test.ts", "it('칩은 어느 언어든 LLM 없이 알아봄', () => {})") == []
    ok &= bool(problems("/x/a.py", "x = 1  # 값을 넘긴다"))
    ok &= problems("/x/a.py", "#!/usr/bin/env python3\ns = '# 한다'") == []
    ok &= bool(problems("/x/note.md", "새 게이트 추가"))
    ok &= problems("/x/note.md", "응답을 바꾼다.\n```\n// 배선\n```\n`게이트` 설명") == []
    ok &= problems(os.path.expanduser("~/.claude/rules/x.md"), "게이트") == []
    ok &= problems(os.path.join(os.path.dirname(HERE), "rules.md"), "게이트") == []
    ok &= problems("/x/a.json", "배선") == []
    patch = "*** Begin Patch\n*** Add File: a.py\n+# 값을 저장한다\n+x = 1\n*** Update File: b.md\n@@\n-옛 줄\n+새 줄\n*** End Patch"
    got = targets({"tool_name": "apply_patch", "cwd": "/x", "tool_input": {"command": patch}})
    ok &= got == [("/x/a.py", "# 값을 저장한다\nx = 1"), ("/x/b.md", "새 줄")]
    ok &= bool([f for p, t in got for f in problems(p, t)])
    print("self-test", "ok" if ok else "FAIL")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    try:
        data = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)
    found = [f for path, text in targets(data) for f in problems(path, text)]
    if not found:
        sys.exit(0)
    print(
        "주석 · 테스트 이름 · 문서 문장 검사에 걸렸습니다(tone-fix rules.md). 고친 뒤 다시 저장하세요.\n"
        + "\n".join(f"- {f}" for f in found)
        + "\n오탐이면 사용자에게 알리고 tone-fix 의 dict.txt 나 이 hook 을 고칩니다.",
        file=sys.stderr,
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
