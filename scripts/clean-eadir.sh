#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

if command -v find >/dev/null 2>&1; then
  find "$ROOT_DIR" -type d -name '@eaDir' -prune -exec rm -rf {} +
fi
