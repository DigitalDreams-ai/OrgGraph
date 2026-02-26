#!/bin/sh
set -eu

ROOT="${ORGUMENTED_ROOT:-$(pwd)}"
RESTORE_DIR="${ORGUMENTED_RESTORE_POINT_DIR:-$ROOT/data/refresh/restore-points}"
RETENTION_DAYS="${ORGUMENTED_RETENTION_DAYS:-30}"

if [ -d "$RESTORE_DIR" ]; then
  find "$RESTORE_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
fi

LOG_PATH="${ORGUMENTED_PROMOTION_LOG_PATH:-$ROOT/data/refresh/promotion-log.jsonl}"
if [ -f "$LOG_PATH" ]; then
  find "$LOG_PATH" -type f -mtime +"$RETENTION_DAYS" -exec sh -c ': > "$1"' _ {} \;
fi

echo "retention prune complete (days=$RETENTION_DAYS)"

