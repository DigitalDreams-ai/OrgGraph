#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"
API_BASE="${API_BASE:-http://127.0.0.1:3100}"
SF_PARSE_PATH="${SF_PARSE_PATH:-$ROOT_DIR/data/sf-project/force-app/main/default}"

"$ROOT_DIR/scripts/sf-auth.sh"
"$ROOT_DIR/scripts/sf-retrieve.sh"

curl -sS -X POST "$API_BASE/refresh" \
  -H 'content-type: application/json' \
  -d "{\"fixturesPath\":\"$SF_PARSE_PATH\",\"mode\":\"full\"}"
