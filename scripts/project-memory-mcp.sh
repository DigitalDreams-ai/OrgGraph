#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"

# shellcheck disable=SC1091
. "$ROOT_DIR/scripts/load-dotenv.sh"

cd "$ROOT_DIR"
exec npm exec --yes pnpm@9.12.3 -- --filter @orgumented/project-memory-mcp start
