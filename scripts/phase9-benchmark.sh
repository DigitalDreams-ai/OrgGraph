#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
OUTPUT_DIR="${ORGUMENTED_BENCHMARK_DIR:-artifacts/phase9-benchmark}"
RUNS="${ORGUMENTED_BENCHMARK_RUNS:-5}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUTPUT_DIR/$STAMP.json"

mkdir -p "$OUTPUT_DIR"

measure() {
  url="$1"
  i=0
  total=0
  while [ "$i" -lt "$RUNS" ]; do
    value="$(curl -s -o /dev/null -w '%{time_total}' "$url")"
    total="$(awk "BEGIN {print $total + $value}")"
    i=$((i + 1))
  done
  awk "BEGIN {print $total / $RUNS}"
}

READY="$(curl -sS "$API_BASE/ready")"
METRICS="$(curl -sS "$API_BASE/metrics")"

PERMS_AVG="$(measure "$API_BASE/perms?user=sbingham@shulman-hill.com.uat&object=litify_pm__Intake__c")"
AUTOMATION_AVG="$(measure "$API_BASE/automation?object=Opportunity")"
IMPACT_AVG="$(measure "$API_BASE/impact?field=Opportunity.StageName")"

cat > "$OUT_FILE" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "apiBase": "$API_BASE",
  "runs": $RUNS,
  "ready": $READY,
  "metrics": $METRICS,
  "averagesSeconds": {
    "perms": $PERMS_AVG,
    "automation": $AUTOMATION_AVG,
    "impact": $IMPACT_AVG
  }
}
EOF

echo "phase9 benchmark written: $OUT_FILE"

