#!/bin/sh
set -eu

API_BASE="${ORGGRAPH_API_BASE:-http://127.0.0.1:3100}"
SNAPSHOT_DIR="${ORGGRAPH_SNAPSHOT_DIR:-data/validation/snapshots}"

mkdir -p "$SNAPSHOT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"

curl -sS "$API_BASE/ready" > "$SNAPSHOT_DIR/$STAMP-ready.json"
curl -sS "$API_BASE/ingest/latest" > "$SNAPSHOT_DIR/$STAMP-ingest-latest.json"
cp "$SNAPSHOT_DIR/$STAMP-ready.json" "$SNAPSHOT_DIR/latest-ready.json"
cp "$SNAPSHOT_DIR/$STAMP-ingest-latest.json" "$SNAPSHOT_DIR/latest-ingest-latest.json"

echo "snapshot captured at $SNAPSHOT_DIR ($STAMP)"

