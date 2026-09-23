#!/usr/bin/env bash
# Usage: scan-sensitive.sh <repo-or-dir> [--history]
# Prints matches and exits 1, or prints "clean" and exits 0.
# Binary files are scanned too (-a -o prints only the matched text).
set -euo pipefail

cfg="$(cd "$(dirname "$0")/.." && pwd)/config.local.yml"
[ -f "$cfg" ] || { echo "missing $cfg: copy config.example.yml and fill it" >&2; exit 2; }
pat=$(awk '/^sensitive_patterns:/{f=1;next} f&&/^  - /{sub(/^  - /,"");print;next} f&&!/^ *#/{f=0}' "$cfg" | paste -sd'|')
[ -n "$pat" ] || { echo "sensitive_patterns is empty in $cfg" >&2; exit 2; }

target=${1:?usage: scan-sensitive.sh <repo-or-dir> [--history]}
# The skill's own config.local.yml holds the patterns, so skip it on disk.
# Inside git it is never skipped: a committed config.local.yml is itself a leak.
out=$(grep -rnaoiE --exclude-dir=.git --exclude=config.local.yml "$pat" "$target" || true)

if [ "${2:-}" = --history ]; then
  cd "$target"
  ignored=$(git ls-files -ci --exclude-standard 2>/dev/null || true)
  [ -n "$ignored" ] && out+=$'\n'"tracked but gitignored:"$'\n'"$ignored"
  out+=$'\n'$(git rev-list --all | while read -r c; do
    git grep -naoiE "$pat" "$c" || true
  done | sed 's/^[0-9a-f]*://' | sort -u)
  out+=$'\n'$(git log --all --format='%h author=%an <%ae> committer=%cn <%ce> %s' | grep -iE "$pat" || true)
fi

out=$(printf '%s\n' "$out" | sed '/^$/d')
[ -z "$out" ] && { echo clean; exit 0; }
printf '%s\n' "$out"
exit 1
