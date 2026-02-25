#!/bin/sh
# Load repo .env into the current shell (if present).
# Intended to be sourced by other scripts.

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
DOTENV_PATH="${DOTENV_PATH:-$ROOT_DIR/.env}"

if [ -f "$DOTENV_PATH" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$DOTENV_PATH"
  set +a
fi
