#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
ARTIFACT_PATH="${1:-artifacts/phase14-drift-gate.json}"

mkdir -p "$(dirname "$ARTIFACT_PATH")"

REFRESH_RESPONSE="$(curl -sS -X POST "${API_BASE}/refresh" -H 'content-type: application/json' -d '{}')"
SNAPSHOT_ID="$(printf '%s' "$REFRESH_RESPONSE" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(String(d.snapshotId||''));")"
if [ -z "$SNAPSHOT_ID" ]; then
  echo "failed: refresh did not return snapshotId"
  exit 1
fi

curl -sS "${API_BASE}/refresh/diff/${SNAPSHOT_ID}/${SNAPSHOT_ID}" >"$ARTIFACT_PATH"
WITHIN_BUDGET="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(Boolean(d?.driftEvaluation?.withinBudget)));" "$ARTIFACT_PATH")"
if [ "$WITHIN_BUDGET" != "true" ]; then
  echo "failed: semantic drift gate is out of budget"
  cat "$ARTIFACT_PATH"
  exit 1
fi

echo "semantic drift gate passed; artifact at $ARTIFACT_PATH"
