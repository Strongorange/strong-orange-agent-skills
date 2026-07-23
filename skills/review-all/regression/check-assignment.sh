#!/usr/bin/env bash
# 1층 — §1-1 파일→렌즈 배정·ACID 프리필터 회귀. LLM 없이 도는 유일한 층.
#
#   ./check-assignment.sh              # 배정 출력
#   ./check-assignment.sh --check      # 정답과 diff, 어긋나면 exit 1
#
# 프리필터 정규식은 review-all/SKILL.md §1-1 과 **같아야** 한다. 한쪽만 고치면
# 문서와 실행이 갈라진다 — 고칠 땐 양쪽 다.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="${2:-$HERE/scenario}"
KEY="$HERE/answer-keys/scenario-assignment.txt"

ACID_RE='\$transaction|beginTransaction|prisma\.|knex|typeorm|\.save\(|\.create\(|\.update\(|\.updateMany\(|\.delete\(|INSERT |UPDATE |DELETE |fetch\(|axios|publish\('

assign() {
  for f in "$DIR"/*.ts; do
    b="$(basename "$f")"
    if [[ "$b" == *.test.* || "$b" == *.spec.* || "$f" == */__tests__/* ]]; then
      echo "$b: comment,test"
    else
      lenses="comment,solid"
      grep -qE "$ACID_RE" "$f" && lenses="$lenses,acid"
      echo "$b: $lenses"
    fi
  done
}

if [[ "${1:-}" == "--check" ]]; then
  if diff -u "$KEY" <(assign); then
    echo "PASS — 배정·프리필터 정답 일치"
  else
    echo "FAIL — 위 diff 확인. 프리필터를 고쳤다면 SKILL.md §1-1 정규식도 같이 고쳤는지 볼 것." >&2
    exit 1
  fi
else
  assign
fi
