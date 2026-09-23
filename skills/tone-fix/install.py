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
    dst = os.path.join(HOME, ".local", "state", "tone-fix", "backups", STAMP)
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


def merge_hooks(path, wanted, prune):
    """wanted = {(이벤트, matcher, 명령)}. 없는 것만 각 이벤트 끝에 붙임.
    prune 이면 wanted 에 없는 우리 옛 등록(예전 경로 · 바뀐 matcher)을 걷어 냄."""
    data = load_json(path)
    before = json.loads(json.dumps(data))
    hooks = data.setdefault("hooks", {})
    have = set()
    for event, groups in list(hooks.items()):
        kept = []
        for g in groups:
            inner = []
            for h in g.get("hooks", []):
                key = (event, g.get("matcher"), h.get("command", ""))
                if prune and ours(key[2]) and key not in wanted:
                    continue
                have.add(key)
                inner.append(h)
            if inner:
                kept.append({**g, "hooks": inner})
        hooks[event] = kept
    added = sorted(wanted - have, key=str)
    for event, matcher, command in added:
        group = {"hooks": [{"type": "command", "command": command}]}
        if matcher:
            group = {"matcher": matcher, **group}
        hooks.setdefault(event, []).append(group)
    save_json(path, data, before)
    return added


def claude():
    base = os.path.join(HOME, ".claude")
    if not os.path.isdir(base):
        return
    link(os.path.join(base, "rules", "korean-writing.md"), os.path.join(SKILL, "rules.md"))
    link(os.path.join(base, "skills", "tone-fix"), SKILL)
    merge_hooks(os.path.join(base, "settings.json"), {
        ("Stop", None, cmd("response-lint.py")),
        ("SubagentStop", None, cmd("response-lint.py")),
        ("PreToolUse", "Bash", cmd("commit-pr-lint.py")),
        ("PreToolUse", "Write|Edit", cmd("comment-lint.py")),
    }, prune=True)


BEGIN, END = "<!-- tone-fix:begin -->", "<!-- tone-fix:end -->"


def codex():
    base = os.path.join(HOME, ".codex")
    if not os.path.isdir(base):
        return
    # Codex 전역 AGENTS.md 는 다른 파일을 불러오지 못해 본문을 복사. 표시 사이만 갈아 끼움.
    path = os.path.join(base, "AGENTS.md")
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    block = f"{BEGIN}\n{open(os.path.join(SKILL, 'rules.md'), encoding='utf-8').read().strip()}\n{END}"
    if BEGIN in old and END in old:
        new = old[:old.index(BEGIN)] + block + old[old.index(END) + len(END):]
    else:
        new = old.rstrip("\n") + ("\n\n" if old.strip() else "") + block + "\n"
    if new != old:
        print(f"규칙 블록: {tilde(path)}")
        if not CHECK:
            if old:
                backup(path)
            with open(path, "w", encoding="utf-8") as f:
                f.write(new)
    # Codex 는 hook 승인을 파일 안 순서로 기억해서, 옛 등록을 걷어 내면 뒤쪽 승인이 풀림
    added = merge_hooks(os.path.join(base, "hooks.json"), {
        ("Stop", None, cmd("response-lint.py")),
        ("SubagentStop", None, cmd("response-lint.py")),
        ("PreToolUse", "^Bash$", cmd("commit-pr-lint.py")),
        ("PreToolUse", "^apply_patch$", cmd("comment-lint.py")),
    }, prune=False)
    if added and not CHECK:
        print(f"Codex: 새 hook {len(added)}개. codex 를 켜서 /hooks 에서 승인해야 돎(codex exec 는 승인 전 hook 을 조용히 건너뜀).")


def main():
    if not shutil.which("python3"):
        sys.exit("python3 가 PATH 에 없음. hook 이 조용히 실패하니 먼저 설치.")
    claude()
    codex()
    print("완료" if not CHECK else "확인만 함(--check)")


if __name__ == "__main__":
    main()
