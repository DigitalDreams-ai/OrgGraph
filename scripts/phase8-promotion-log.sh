#!/bin/sh
set -eu

STATUS="${1:-}"
if [ "$STATUS" = "" ]; then
  echo "usage: $0 <status> [note]"
  exit 1
fi

NOTE="${2:-}"
ROOT="${ORGUMENTED_ROOT:-$(pwd)}"
LOG_PATH="${ORGUMENTED_PROMOTION_LOG_PATH:-$ROOT/data/refresh/promotion-log.jsonl}"
OPERATOR="${ORGUMENTED_OPERATOR:-unknown-operator}"
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
COMMIT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

mkdir -p "$(dirname "$LOG_PATH")"
printf '%s\n' "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"operator\":\"$OPERATOR\",\"branch\":\"$BRANCH\",\"commit\":\"$COMMIT\",\"status\":\"$STATUS\",\"note\":\"$NOTE\"}" >> "$LOG_PATH"

echo "promotion log appended: $LOG_PATH"

