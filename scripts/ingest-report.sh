#!/bin/sh
set -eu

API_BASE="${ORGGRAPH_API_BASE:-http://127.0.0.1:3100}"
curl -sS "$API_BASE/ingest/latest"
echo

