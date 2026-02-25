#!/bin/sh
set -eu

ROOT="${ORGGRAPH_ROOT:-$(pwd)}"
STORE_DIR="${ORGGRAPH_RESTORE_POINT_DIR:-$ROOT/data/refresh/restore-points}"
STAMP="${1:-$(date +%Y%m%d-%H%M%S)}"
TARGET="$STORE_DIR/$STAMP"

mkdir -p "$TARGET"

copy_if_exists() {
  src="$1"
  dst="$2"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

copy_if_exists "$ROOT/data/orggraph.db" "$TARGET/data/orggraph.db"
copy_if_exists "$ROOT/data/evidence/index.json" "$TARGET/data/evidence/index.json"
copy_if_exists "$ROOT/data/refresh/state.json" "$TARGET/data/refresh/state.json"
copy_if_exists "$ROOT/data/refresh/ontology-report.json" "$TARGET/data/refresh/ontology-report.json"

cat > "$TARGET/manifest.json" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "restorePoint": "$STAMP",
  "root": "$ROOT"
}
EOF

echo "restore point created: $TARGET"

