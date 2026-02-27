---
name: scaffold-dev-verify
description: Run Rabbit Scaffold dev verification flows (register, referral, notification preferences, password reset) and print API responses plus worker logs. Use when you need to quickly validate the dev docker-compose stack and event flow after a build or pull.
---

# Scaffold Dev Verify

## Overview
Run a single scripted verification against the local dev stack to confirm: API auth works, referral flow triggers, notification prefs update, password reset event emits, and worker logs show expected events.

## Quick Start (Workflow)
1. Ensure the dev stack is up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
2. From the repo root, run:
   - `./.codex/skills/scaffold-dev-verify/scripts/verify_flows.sh`
3. Confirm output:
   - Referral code printed
   - Notification GET/PUT shows `true` then `false`
   - Password reset request prints `true`
   - `python-worker` logs include `password_reset_send`
   - `point-worker` logs include `auth.user.referred` and `referral_bonus_*`

## Parameters (Environment Variables)
- `BASE_URL` (default: `http://localhost:3000`)
- `WEB_URL` (default: `http://localhost:3001`)
- `LOG_SINCE` (default: `3m`)
- `EMAIL_SUFFIX` (default: `example.com`)
- `PASS` (default: `StrongPass123!`)

Example:
```
BASE_URL=http://localhost:3000 LOG_SINCE=5m ./home/ubuntu/.codex/skills/scaffold-dev-verify/scripts/verify_flows.sh
```

## Notes
- The script uses `docker logs` for `scaffold-python-worker` and `scaffold-point-worker`.
- If reset URLs do not point to the web app, set `PUBLIC_WEB_URL=http://localhost:3001` in `.env` and restart the stack.

## Resources
### scripts/
- `verify_flows.sh`: End-to-end dev verification script.
