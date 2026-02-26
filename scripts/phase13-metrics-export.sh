#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
OUT="${PHASE13_METRICS_EXPORT_PATH:-artifacts/phase13-metrics-export.json}"
mkdir -p "$(dirname "$OUT")"

curl -sS "$API_BASE/ask/metrics/export" > "$OUT"

node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8')); if(j.status!=='implemented'){console.error('invalid export status'); process.exit(1);} console.log('phase13 metrics export written to '+p+' records='+j.totalRecords);" "$OUT"
