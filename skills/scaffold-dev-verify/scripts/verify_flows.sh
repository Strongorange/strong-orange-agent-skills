#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3000}
WEB_URL=${WEB_URL:-http://localhost:3001}
LOG_SINCE=${LOG_SINCE:-3m}
EMAIL_SUFFIX=${EMAIL_SUFFIX:-example.com}
PASS=${PASS:-StrongPass123!}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd python3
require_cmd docker

now_ts=$(date +%s)
EMAIL_A="referrer_${now_ts}@${EMAIL_SUFFIX}"
EMAIL_B="referred_${now_ts}@${EMAIL_SUFFIX}"

json_get() {
  python3 -c 'import json,sys;print(json.loads(sys.argv[1]).get("data", json.loads(sys.argv[1])))' "$1"
}

json_get_field() {
  python3 -c 'import json,sys;print(json.loads(sys.argv[1])["data"][sys.argv[2]])' "$1" "$2"
}

json_get_data_field() {
  python3 -c 'import json,sys;print(json.loads(sys.argv[1])["data"].get(sys.argv[2]))' "$1" "$2"
}

resp_a=$(curl -sS -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"password\":\"$PASS\"}")

access_a=$(json_get_field "$resp_a" "accessToken")

me_a=$(curl -sS "$BASE_URL/auth/me" -H "Authorization: Bearer $access_a")
ref_code=$(json_get_data_field "$me_a" "referralCode")

echo "Referral code: $ref_code"

resp_b=$(curl -sS -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\",\"password\":\"$PASS\",\"referralCode\":\"$ref_code\"}")

access_b=$(json_get_field "$resp_b" "accessToken")

pref_get=$(curl -sS "$BASE_URL/users/notification-preferences" -H "Authorization: Bearer $access_b")
python3 -c 'import json,sys;print("Notification GET:", json.loads(sys.argv[1])["data"])' "$pref_get"

pref_put=$(curl -sS -X PUT "$BASE_URL/users/notification-preferences" \
  -H "Authorization: Bearer $access_b" \
  -H "Content-Type: application/json" \
  -d '{"emailNotificationsEnabled": false}')
python3 -c 'import json,sys;print("Notification PUT:", json.loads(sys.argv[1])["data"])' "$pref_put"

reset_resp=$(curl -sS -X POST "$BASE_URL/auth/password-reset/request" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\"}")

python3 -c 'import json,sys;print("Password reset request:", json.loads(sys.argv[1]).get("data", json.loads(sys.argv[1]).get("success")))' "$reset_resp"

echo "\n--- python-worker logs (since ${LOG_SINCE}) ---"
docker logs --since "$LOG_SINCE" scaffold-python-worker | tail -n 20

echo "\n--- point-worker logs (since ${LOG_SINCE}) ---"
docker logs --since "$LOG_SINCE" scaffold-point-worker | tail -n 20

echo "\nNote: resetUrl should point to ${WEB_URL} if PUBLIC_WEB_URL is set in .env." 
