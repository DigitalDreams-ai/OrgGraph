#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
NODE_BIN="${NODE_BIN:-/usr/local/bin/node}"
MCP_ENTRY="$ROOT_DIR/packages/project-memory-mcp/dist/index.js"

# shellcheck disable=SC1091
. "$ROOT_DIR/scripts/load-dotenv.sh"

if [ ! -x "$NODE_BIN" ]; then
  echo "project-memory MCP error: node binary not found at $NODE_BIN" >&2
  exit 1
fi

if [ ! -f "$MCP_ENTRY" ]; then
  echo "project-memory MCP error: build artifact missing at $MCP_ENTRY" >&2
  echo "Run: pnpm --filter @orgumented/project-memory-mcp build" >&2
  exit 1
fi

export ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT="${ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT:-$ROOT_DIR}"

cd "$ROOT_DIR"
exec "$NODE_BIN" "$MCP_ENTRY"
