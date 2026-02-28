#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
NODE_BIN="${NODE_BIN:-node}"

cd "$ROOT_DIR"
exec "$NODE_BIN" "$ROOT_DIR/scripts/project-memory-mcp.mjs"
