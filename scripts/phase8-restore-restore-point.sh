#!/bin/sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <restore-point-stamp>"
  exit 1
fi

STAMP="$1"
ROOT="${ORGUMENTED_ROOT:-$(pwd)}"
STORE_DIR="${ORGUMENTED_RESTORE_POINT_DIR:-$ROOT/data/refresh/restore-points}"
SOURCE="$STORE_DIR/$STAMP"

if [ ! -d "$SOURCE" ]; then
  echo "restore point not found: $SOURCE"
  exit 1
fi

copy_back() {
  src="$1"
  dst="$2"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

copy_back "$SOURCE/data/orgumented.db" "$ROOT/data/orgumented.db"
copy_back "$SOURCE/data/evidence/index.json" "$ROOT/data/evidence/index.json"
copy_back "$SOURCE/data/refresh/state.json" "$ROOT/data/refresh/state.json"
copy_back "$SOURCE/data/refresh/ontology-report.json" "$ROOT/data/refresh/ontology-report.json"

echo "restore point applied: $SOURCE"

