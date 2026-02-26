#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
FIXTURES_PATH="${PHASE12_FIXTURES_PATH:-fixtures/permissions}"

curl -sS -X POST "$API_BASE/refresh" \
  -H 'content-type: application/json' \
  -d "{\"mode\":\"full\",\"fixturesPath\":\"$FIXTURES_PATH\"}" >/dev/null

run_case() {
  query="$1"
  trace_level="${2:-standard}"
  ask_json="$(curl -sS -X POST "$API_BASE/ask" -H 'content-type: application/json' -d "{\"query\":\"$query\",\"traceLevel\":\"$trace_level\",\"mode\":\"deterministic\"}")"
  replay_token="$(printf '%s' "$ask_json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.proof.replayToken);});")"

  replay_json="$(curl -sS -X POST "$API_BASE/ask/replay" -H 'content-type: application/json' -d "{\"replayToken\":\"$replay_token\"}")"
  matched="$(printf '%s' "$replay_json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(String(j.matched));});")"
  core_matched="$(printf '%s' "$replay_json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(String(j.corePayloadMatched));});")"

  if [ "$matched" != "true" ] || [ "$core_matched" != "true" ]; then
    echo "replay regression failed for query: $query"
    echo "$replay_json"
    exit 1
  fi
}

run_case "Can jane@example.com edit object Case?" compact
run_case "What touches Opportunity.StageName?" standard
run_case "What is the release risk impact on Opportunity.StageName and can jane@example.com edit object Case?" full

echo "phase12 replay regression passed"
