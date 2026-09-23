#!/usr/bin/env python3
"""PreToolUse(Bash) hook: git commit · gh pr create/edit/comment 의 메시지를 보내기 전에 검사.

검사 대상: 명령 문자열(-m · heredoc 포함) + -F/--file/--body-file 로 넘긴 파일 내용.
검사 항목: ../dict.txt 금지어 · 세션 트레일러 · 줄 끝 "~한다" 류 종결.
걸리면 exit 2 로 막고 stderr 로 고칠 곳을 알려 줌. 규칙 정본은 ../rules.md.
사용자가 허락한 경우에만 명령 끝에 `# ai-tell-ok` 를 붙여 통과.
자체 검증: python3 commit-pr-lint.py --self-test
"""
import json, os, re, shlex, sys

DICT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dict.txt")
TARGET = re.compile(r"\bgit\b[^|;&\n]*\bcommit\b|\bgh\s+pr\s+(create|edit|comment)\b")
FILE_FLAGS = {"-F", "--file", "--body-file"}
TRAILER = re.compile(r"Claude-Session|claude\.ai/code|Co-Authored-By:\s*Claude", re.I)
TRAILING = re.compile(r"[\s\"'.)\]]+$")
PAST_OR_PLAIN = ("었다", "았다", "였다", "했다", "됐다", "있다", "없다", "이다")
CODE_SPAN = re.compile(r"`[^`\n]*`")


def load_dict():
    rules = []
    try:
        for line in open(DICT_PATH, encoding="utf-8"):
            if not line.strip() or line.startswith("#") or "\t" not in line:
                continue
            pattern, fix = line.rstrip("\n").split("\t", 1)
            rules.append((re.compile(pattern), fix))
    except OSError:
        print(f"tone-fix: 금지어 사전 없음({DICT_PATH})", file=sys.stderr)
    return rules


def message_files(command, cwd):
    try:
        tokens = shlex.split(command, comments=False)
    except ValueError:
        return []
    paths = []
    for i, tok in enumerate(tokens):
        if tok in FILE_FLAGS and i + 1 < len(tokens):
            paths.append(tokens[i + 1])
        for flag in FILE_FLAGS:
            if tok.startswith(flag + "="):
                paths.append(tok.split("=", 1)[1])
    texts = []
    for p in paths:
        full = p if os.path.isabs(p) else os.path.join(cwd, p)
        try:
            texts.append(open(os.path.expanduser(full), encoding="utf-8").read())
        except OSError:
            pass
    return texts


def ends_with_plain_form(line):
    """바꾼다 · 한다 · 막는다(받침 ㄴ + 다)와 했다 · 있다 · 이다 류로 끝나는 줄."""
    body = TRAILING.sub("", line)
    if len(body) < 2 or body[-1] != "다":
        return False
    before = ord(body[-2]) - 0xAC00
    return (0 <= before < 11172 and before % 28 == 4) or body.endswith(PAST_OR_PLAIN)


def problems(text, rules):
    found = []
    for raw in text.splitlines():
        line = CODE_SPAN.sub("", raw)
        if TRAILER.search(line):
            found.append(f'세션 트레일러 · 링크: "{raw.strip()[:60]}" → 삭제')
        for pattern, fix in rules:
            m = pattern.search(line)
            if m:
                found.append(f'"{m.group(0)}" ({raw.strip()[:50]}) → {fix}')
        if ends_with_plain_form(line):
            found.append(f'"~한다" 류 종결: "{raw.strip()[:60]}" → 끝을 짧게(예: ~함 · ~고침 · 명사로 끝)')
    return list(dict.fromkeys(found))


def check(command, cwd):
    if not TARGET.search(command) or "# ai-tell-ok" in command:
        return []
    rules = load_dict()
    return problems("\n".join([command, *message_files(command, cwd)]), rules)


def self_test():
    ok = check('git commit -m "[fix] 목록 조회를 이동"', "/") == []
    ok &= bool(check('git commit -m "[fix] 조회 경로를 바꾼다"', "/"))
    ok &= bool(check('gh pr create --title "x" --body "Claude-Session: y"', "/"))
    ok &= bool(check('git commit -m "[feat] 새 배선 추가"', "/"))
    ok &= check('git commit -m "[feat] `gateway` 이름 정리"', "/") == []
    ok &= check('ls -la  # 배선', "/") == []
    ok &= check('git commit -m "[fix] 조회를 바꾼다" # ai-tell-ok', "/") == []
    print("self-test", "ok" if ok else "FAIL")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    try:
        data = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)
    if data.get("tool_name") != "Bash":
        sys.exit(0)
    found = check(data.get("tool_input", {}).get("command", ""), data.get("cwd", os.getcwd()))
    if not found:
        sys.exit(0)
    print(
        "커밋 · PR 문장 검사에 걸렸습니다(tone-fix rules.md). 아래를 고친 뒤 다시 실행하세요.\n"
        + "\n".join(f"- {f}" for f in found)
        + "\n오탐이면 사용자에게 확인받고 명령 끝에 `# ai-tell-ok` 를 붙입니다.",
        file=sys.stderr,
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
