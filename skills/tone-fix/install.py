#!/usr/bin/env python3
"""tone-fix 를 설치된 에이전트에 연결. 여러 번 돌려도 결과가 같음.

python3 install.py            연결
python3 install.py --check    바꿀 것만 출력하고 파일은 안 건드림
"""
import json, os, shutil, sys, time

SKILL = os.path.dirname(os.path.realpath(__file__))
HOME = os.path.expanduser("~")
CHECK = "--check" in sys.argv
STAMP = time.strftime("%Y%m%d-%H%M%S")
HOOK_SCRIPTS = ("response-lint.py", "commit-pr-lint.py", "comment-lint.py", "ai-tell-lint.py")


def tilde(path):
    return "~" + path[len(HOME):] if path.startswith(HOME + os.sep) else path


def cmd(script):
    return f"python3 {tilde(os.path.join(SKILL, 'hooks', script))}"


def backup(path):
    dst = os.path.join(HOME, ".claude", "backups", "tone-fix", STAMP)
    os.makedirs(dst, exist_ok=True)
    shutil.copy2(path, dst)


def link(dst, src):
    """dst 를 src 로 가는 심링크로 맞춤. 실파일이 있으면 백업 뒤 교체."""
    if os.path.islink(dst) and os.path.realpath(dst) == os.path.realpath(src):
        return
    print(f"링크: {tilde(dst)} → {tilde(src)}")
    if CHECK:
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.lexists(dst):
        if os.path.isfile(dst) and not os.path.islink(dst):
            backup(dst)
        os.remove(dst)
    os.symlink(src, dst)


def load_json(path):
    """읽다 실패하면 중단. 빈 객체로 덮어쓰면 다른 도구의 설정이 날아감."""
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except ValueError as e:
        sys.exit(f"중단: {path} 를 JSON 으로 못 읽음({e}). 손으로 고친 뒤 다시 실행.")


def save_json(path, data, before):
    if data == before:
        return
    print(f"수정: {tilde(path)}")
    if CHECK:
        return
    if os.path.exists(path):
        backup(path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def ours(command):
    return any(s in command for s in HOOK_SCRIPTS) and ("tone-fix" in command or "/.claude/hooks/" in command)


def claude():
    base = os.path.join(HOME, ".claude")
    if not os.path.isdir(base):
        return
    link(os.path.join(base, "rules", "korean-writing.md"), os.path.join(SKILL, "rules.md"))
    link(os.path.join(base, "skills", "tone-fix"), SKILL)

    path = os.path.join(base, "settings.json")
    data = load_json(path)
    before = json.loads(json.dumps(data))
    hooks = data.setdefault("hooks", {})
    wanted = {
        ("Stop", None, cmd("response-lint.py")),
        ("SubagentStop", None, cmd("response-lint.py")),
        ("PreToolUse", "Bash", cmd("commit-pr-lint.py")),
        ("PreToolUse", "Write|Edit", cmd("comment-lint.py")),
    }
    # 예전 위치(~/.claude/hooks) 등록과 matcher 가 바뀐 옛 등록은 걷어 냄
    have = set()
    for event, groups in list(hooks.items()):
        kept = []
        for g in groups:
            inner = []
            for h in g.get("hooks", []):
                key = (event, g.get("matcher"), h.get("command", ""))
                if ours(key[2]) and key not in wanted:
                    continue
                have.add(key)
                inner.append(h)
            if inner:
                kept.append({**g, "hooks": inner})
        hooks[event] = kept
    for event, matcher, command in sorted(wanted - have, key=str):
        group = {"hooks": [{"type": "command", "command": command}]}
        if matcher:
            group = {"matcher": matcher, **group}
        hooks.setdefault(event, []).append(group)
    save_json(path, data, before)


def main():
    if not shutil.which("python3"):
        sys.exit("python3 가 PATH 에 없음. hook 이 조용히 실패하니 먼저 설치.")
    claude()
    print("완료" if not CHECK else "확인만 함(--check)")


if __name__ == "__main__":
    main()
