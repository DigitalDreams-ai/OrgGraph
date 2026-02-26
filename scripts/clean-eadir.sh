#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"

if command -v find >/dev/null 2>&1; then
  # Skip unreadable paths (for example mounted database volumes) so cleanup
  # does not fail the build pipeline.
  find "$ROOT_DIR" -type d -name '@eaDir' -prune -exec rm -rf {} + 2>/dev/null || true
fi
