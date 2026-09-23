#!/usr/bin/env python3
"""Stop · SubagentStop hook: 마지막 응답의 AI 번역투·과장·AI 티 감지 → 1회 재작성 유도.

응답은 입력의 last_assistant_message 를 쓰고, 없을 때만 transcript 를 읽음.
1층: ../dict.txt 정규식 (탭 구분: 정규식<TAB>대체 제안).
     절대 규칙 — 1회 매칭이면 block. 새 괴상어는 여기 한 줄 추가.
2층: humanize-korean 플러그인 metrics_v2 카운트형 지표 (빈도 규칙 — 누적이
     AI_TELL_MAX_TELLS 이상이면 block). 플러그인 없으면 조용히 1층만 동작.
     한글 AI_TELL_MIN_CHARS 미만 응답은 2층 skip (짧은 글에선 노이즈).
백틱·따옴표 안 텍스트는 검사 제외 (코드 식별자·메타 논의 보호).
자체 검증: python3 response-lint.py --self-test
"""
import glob, json, os, re, sys

MIN_CHARS = int(os.environ.get("AI_TELL_MIN_CHARS", "400"))   # 2층 최소 한글 글자수
MAX_TELLS = int(os.environ.get("AI_TELL_MAX_TELLS", "3"))     # 2층 누적 임계
DICT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dict.txt")
PLUGIN_REG = os.path.expanduser("~/.claude/plugins/installed_plugins.json")

# 빈도 규칙: metrics key → (섹션, taxonomy ID, 허용 횟수, 처방, 근거 추출용 모듈 속성)
# 허용 횟수를 넘는 만큼만 tell로 누적. quick-rules.md의 빈도 조건을 그대로 옮김.
# have_make(A-7)는 dict 1층이 절대 규칙으로 담당하므로 여기서 제외.
FREQ_RULES = {
    "conclusion_pivot_count": ("metrics", "D-1", 2,
        "결산 접속(결론적으로/따라서/이를 통해/그러므로) 1~2건만 남기고 삭제", None),
    "safe_balance_count": ("metrics", "G-3", 3,
        "균형 lexicon(양쪽 모두/신중하게/균형) → 한쪽 단언·구체 비교", None),
    "by_passive_count": ("v2_metrics", "A-9", 0,
        "'~에 의해 ~된다' 피동 → 행위자를 주어로", "_BY_PASSIVE_RE"),
    "double_particle_count": ("v2_metrics", "A-19", 0,
        "이중 조사(에서의/으로의/에의) → 절·구로 풀어쓰기", "_DOUBLE_PARTICLE_RE"),
    "antithesis_count": ("v2_metrics", "C-8", 1,
        "'A가 아니라 B' 대구 반복 → 한 번만, 나머지는 직접 단언", "_ANTITHESIS_RE"),
}


def last_assistant_text(tp):
    last = None
    with open(tp, encoding="utf-8") as f:
        for ln in f:
            try:
                obj = json.loads(ln)
            except Exception:
                continue
            if obj.get("type") != "assistant":
                continue
            texts = [b.get("text", "") for b in obj.get("message", {}).get("content", [])
                     if isinstance(b, dict) and b.get("type") == "text"]
            if texts:
                last = "\n".join(texts)
    return last


def strip_protected(text):
    t = re.sub(r"```.*?```", " ", text, flags=re.S)
    t = re.sub(r"`[^`\n]*`", " ", t)
    t = re.sub(r'"[^"\n]*"', " ", t)
    t = re.sub(r"'[^'\n]*'", " ", t)
    t = re.sub(r"[“][^”\n]*[”]", " ", t)
    return t


def dict_hits(t):
    if not os.path.isfile(DICT_PATH):
        print(f"tone-fix: 금지어 사전 없음({DICT_PATH})", file=sys.stderr)
        return []
    hits = []
    for ln in open(DICT_PATH, encoding="utf-8"):
        ln = ln.rstrip("\n")
        if not ln or ln.startswith("#"):
            continue
        pat, _, sug = ln.partition("\t")
        try:
            m = re.search(pat, t)
        except re.error:
            continue
        if m:
            s = max(0, m.start() - 15)
            ctx = t[s:m.end() + 15].replace("\n", " ").strip()
            hits.append(f'- "{m.group(0)}" (…{ctx}…) → {sug}')
    return hits


def load_metrics_mod():
    """installed_plugins.json에서 humanize-korean 설치 경로를 찾아 metrics_v2 import. 실패 시 None."""
    try:
        reg = json.load(open(PLUGIN_REG, encoding="utf-8"))
        entries = reg.get("plugins", reg).get("humanize-korean@im-not-ai") or []
        root = entries[0]["installPath"]
    except Exception:
        return None
    ref = os.path.join(root, "skills", "humanize-korean", "references")
    if not os.path.isfile(os.path.join(ref, "metrics_v2.py")):
        return None
    sys.path.insert(0, ref)
    try:
        import metrics_v2
        return metrics_v2
    except Exception:
        return None


def metrics_hits(t, mod=None):
    if len(re.findall(r"[가-힣]", t)) < MIN_CHARS:
        return []
    mod = mod or load_metrics_mod()
    if mod is None:
        return []
    try:
        d = mod.compute_all_v2(t, genre="essay")
    except Exception:
        return []
    ev = d.get("evidence") or {}
    lines, tells = [], 0
    for key, (sec, tid, allow, sug, attr) in FREQ_RULES.items():
        n = int((d.get(sec) or {}).get(key) or 0)
        excess = n - allow
        if excess <= 0:
            continue
        tells += excess
        if key == "conclusion_pivot_count":
            ex = ev.get("conclusion_pivots") or []
        elif key == "safe_balance_count":
            ex = ev.get("safe_balances") or []
        else:
            rx = getattr(mod, attr, None) if attr else None
            ex = [m.group(0) for m in rx.finditer(t)] if rx else []
        ex_s = ", ".join(dict.fromkeys(ex))[:60]
        lines.append(f"- [{tid}] {n}회 ({ex_s}) → {sug}")
    return lines if tells >= MAX_TELLS else []


def build_reason(h1, h2):
    parts = ["✍️ 표현 점검 — 방금 응답에 어색한 번역투/과장/AI 티가 감지됐습니다. "
             "아래 항목만 자연스러운 개발자 한국어로 바꿔 응답 전체를 다시 작성하세요. "
             "내용·구조·길이·코드 식별자는 유지하고 해당 표현만 교체합니다."]
    if h1:
        parts.append("[표현]\n" + "\n".join(h1[:8]))
    if h2:
        parts.append("[빈도 — humanize-korean quick-rules]\n" + "\n".join(h2[:6]))
    return "\n".join(parts)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    if data.get("stop_hook_active"):          # 재귀 방지 — 사이클당 1회만 차단
        return
    sid = data.get("session_id", "")
    if sid and glob.glob(os.path.expanduser(
            f"~/.cursor/projects/*/agent-transcripts/{sid}/{sid}.jsonl")):
        return                                 # Cursor는 block을 사용자 입력처럼 재주입 — 제외
    last = data.get("last_assistant_message")
    tp = data.get("transcript_path", "")
    if not last and tp and os.path.isfile(tp):
        last = last_assistant_text(tp)
    if not last:
        return
    t = strip_protected(last)
    h1, h2 = dict_hits(t), metrics_hits(t)
    if not (h1 or h2):
        return
    print(json.dumps({"decision": "block", "reason": build_reason(h1, h2)}, ensure_ascii=False))


def self_test():
    mod = load_metrics_mod()
    # 1층: 절대 규칙 1회 → hit. 백틱 안은 제외.
    assert dict_hits(strip_protected("이 값은 캐시에 저장되어진다.")), "A-8 미감지"
    assert not dict_hits(strip_protected("`저장되어진다` 심볼 설명")), "백틱 보호 실패"
    assert dict_hits(strip_protected("이 결과는 시사하는 바가 크다.")), "D-2 미감지"
    # 2층: 빈도 누적 ≥ MAX_TELLS → hit
    body = ("서버에서의 응답 지연은 캐시 미스가 원인이다. 따라서 조회 결과를 Redis에 저장했다. "
            "이를 통해 응답 시간이 줄었다. 그러므로 DB 부하도 감소했다. 결론적으로 TTL은 5분으로 정했다. "
            "이 값은 스케줄러에 의해 갱신된다. 클라이언트로의 전달은 기존 경로를 쓴다. ")
    bad = body * 5
    if mod is None:
        print("self-test ok (humanize-korean 플러그인 없음 — 빈도 검사 건너뜀)")
        return
    assert metrics_hits(strip_protected(bad), mod), "빈도 누적 미감지"
    good = ("상품 조회 응답을 Redis에 캐시했다. TTL은 5분이다. 캐시 키는 상품 ID와 옵션 해시를 합쳐 만든다. "
            "갱신은 스케줄러가 맡는다. 중복 웹훅은 event_id 유니크 제약으로 막았다. "
            "권한 화면에는 읽기 전용 체크박스를 추가했다. 배포는 내일 오전이다. ") * 6
    assert not dict_hits(strip_protected(good)), f"오탐(1층): {dict_hits(strip_protected(good))}"
    assert not metrics_hits(strip_protected(good), mod), "오탐(2층)"
    assert not metrics_hits(strip_protected(body), mod), "짧은 글에 2층 발동"
    print("self-test ok")


if __name__ == "__main__":
    self_test() if "--self-test" in sys.argv else main()
