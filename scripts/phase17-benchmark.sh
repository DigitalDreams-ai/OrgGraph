#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
API_URL="${API_URL:-http://127.0.0.1:3100}"
OUT_PATH="${1:-$ROOT_DIR/artifacts/phase17-benchmark.json}"

mkdir -p "$(dirname "$OUT_PATH")"

now_ms() {
  date +%s%3N
}

measure_ms() {
  start="$(now_ms)"
  if ! sh -c "$1" >/dev/null 2>/dev/null; then
    echo -1
    return 0
  fi
  end="$(now_ms)"
  echo $((end - start))
}

require_ready() {
  curl -fsS "$API_URL/ready" >/dev/null
}

require_ready

ingest_ms="$(measure_ms "curl -fsS -X POST '$API_URL/refresh' -H 'content-type: application/json' -d '{\"mode\":\"incremental\"}'")"
automation_ms="$(measure_ms "curl -fsS '$API_URL/automation?object=Opportunity'")"
impact_ms="$(measure_ms "curl -fsS '$API_URL/impact?field=Opportunity.StageName'")"

ask_response="$(curl -sS -X POST "$API_URL/ask" -H 'content-type: application/json' -d '{"query":"What touches Opportunity.StageName?","traceLevel":"standard"}' || true)"
replay_token="$(echo "$ask_response" | jq -r '.proof.replayToken // empty' 2>/dev/null || true)"
if [ -n "$replay_token" ]; then
  replay_ms="$(measure_ms "curl -fsS -X POST '$API_URL/ask/replay' -H 'content-type: application/json' -d '{\"replayToken\":\"$replay_token\"}'")"
else
  replay_ms="-1"
fi

cat >"$OUT_PATH" <<JSON
{
  "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "apiUrl": "$API_URL",
  "metrics": {
    "ingestIncrementalMs": $ingest_ms,
    "queryAutomationMs": $automation_ms,
    "queryImpactMs": $impact_ms,
    "replayMs": $replay_ms
  }
}
JSON

echo "benchmark artifact written: $OUT_PATH"
