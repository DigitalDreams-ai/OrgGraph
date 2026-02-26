#!/bin/sh
set -eu

STATUS="${1:-}"
MESSAGE="${2:-}"

if [ "$STATUS" = "" ] || [ "$MESSAGE" = "" ]; then
  echo "usage: $0 <status> <message>"
  exit 1
fi

WEBHOOK="${ORGUMENTED_ALERT_WEBHOOK_URL:-}"
if [ "$WEBHOOK" = "" ]; then
  echo "alert webhook not configured; skipping"
  exit 0
fi

curl -sS -X POST "$WEBHOOK" \
  -H 'content-type: application/json' \
  -d "{\"status\":\"$STATUS\",\"message\":\"$MESSAGE\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >/dev/null

echo "alert webhook sent"

