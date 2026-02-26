#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
FIXTURES_PATH="${ORGUMENTED_PROMOTION_FIXTURES:-data/sf-project/force-app/main/default}"
ARTIFACT_DIR="${ORGUMENTED_PROMOTION_ARTIFACT_DIR:-artifacts/phase8-promotion}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ARTIFACT_DIR/$STAMP-dry-run"

mkdir -p "$OUT_DIR"

curl -sS "$API_BASE/ready" > "$OUT_DIR/ready.json"
curl -sS "$API_BASE/ingest/latest" > "$OUT_DIR/ingest-latest.json"
curl -sS -X POST "$API_BASE/refresh" \
  -H 'content-type: application/json' \
  -d "{\"fixturesPath\":\"$FIXTURES_PATH\",\"mode\":\"incremental\"}" > "$OUT_DIR/refresh-incremental.json"

echo "{\"status\":\"ok\",\"stamp\":\"$STAMP\",\"artifactDir\":\"$OUT_DIR\"}" > "$OUT_DIR/result.json"
echo "phase8 promotion dry-run completed: $OUT_DIR"

