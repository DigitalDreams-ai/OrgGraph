#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
SNAPSHOT_A="${1:-latest}"
SNAPSHOT_B="${2:-latest}"
OUT_PATH="${3:-artifacts/phase14-drift-report.json}"

mkdir -p "$(dirname "$OUT_PATH")"
curl -sS "${API_BASE}/refresh/diff/${SNAPSHOT_A}/${SNAPSHOT_B}" >"$OUT_PATH"
echo "drift report written to $OUT_PATH"
