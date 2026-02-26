#!/bin/sh
set -eu

API_BASE="${ORGGRAPH_API_BASE:-http://127.0.0.1:3100}"
CONCURRENCY="${PHASE12_REPLAY_CONCURRENCY:-8}"
REQUESTS="${PHASE12_REPLAY_REQUESTS:-40}"

ask_json="$(curl -sS -X POST "$API_BASE/ask" -H 'content-type: application/json' -d '{"query":"What touches Opportunity.StageName?","traceLevel":"standard","mode":"deterministic"}')"
replay_token="$(printf '%s' "$ask_json" | node -e "let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>{const j=JSON.parse(s);process.stdout.write(j.proof.replayToken);});")"

fail_flag="$(mktemp)"
rm -f "$fail_flag"

run_one() {
  body="$(curl -sS -X POST "$API_BASE/ask/replay" -H 'content-type: application/json' -d "{\"replayToken\":\"$replay_token\"}")"
  ok="$(printf '%s' "$body" | node -e "let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>{const j=JSON.parse(s);process.stdout.write(String(j.matched && j.corePayloadMatched));});")"
  if [ "$ok" != "true" ]; then
    echo "$body"
    echo "fail" > "$fail_flag"
  fi
}

n=1
while [ "$n" -le "$REQUESTS" ]; do
  run_one &
  if [ $((n % CONCURRENCY)) -eq 0 ]; then
    wait
  fi
  n=$((n + 1))
done
wait

if [ -f "$fail_flag" ]; then
  echo "phase12 replay load failed"
  rm -f "$fail_flag"
  exit 1
fi

rm -f "$fail_flag"
echo "phase12 replay load passed (requests=$REQUESTS concurrency=$CONCURRENCY)"
