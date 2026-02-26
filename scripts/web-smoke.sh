#!/bin/sh
set -eu

BASE_URL="${WEB_SMOKE_BASE:-http://127.0.0.1:3101}"
ARTIFACT_DIR="${WEB_SMOKE_ARTIFACT_DIR:-artifacts}"
DEFAULT_FIXTURES_PATH="fixtures/permissions"
if [ -d "data/sf-project/force-app/main/default" ]; then
  DEFAULT_FIXTURES_PATH="data/sf-project/force-app/main/default"
fi
WEB_SMOKE_FIXTURES_PATH="${WEB_SMOKE_FIXTURES_PATH:-$DEFAULT_FIXTURES_PATH}"
WEB_SMOKE_REFRESH_MODE="${WEB_SMOKE_REFRESH_MODE:-incremental}"
mkdir -p "$ARTIFACT_DIR"

health_code="$(curl -sS -o "$ARTIFACT_DIR/web-health.json" -w '%{http_code}' "$BASE_URL/api/health")"
for _ in $(seq 1 20); do
  health_code="$(curl -sS -o "$ARTIFACT_DIR/web-health.json" -w '%{http_code}' "$BASE_URL/api/health" || true)"
  if [ "$health_code" = "200" ]; then
    break
  fi
  sleep 1
done
if [ "$health_code" != "200" ]; then
  echo "web health check failed: $health_code"
  exit 1
fi

for _ in $(seq 1 25); do
  ready_code="$(curl -sS -o "$ARTIFACT_DIR/web-ready.json" -w '%{http_code}' "$BASE_URL/api/ready" || true)"
  if [ "$ready_code" = "200" ]; then
    break
  fi
  sleep 1
done
if [ "$ready_code" != "200" ]; then
  echo "web ready check failed: $ready_code"
  exit 1
fi

run_query() {
  kind="$1"
  payload="$2"
  out="$ARTIFACT_DIR/web-query-${kind}.json"
  code="$(curl -sS -o "$out" -w '%{http_code}' -X POST "$BASE_URL/api/query" -H 'content-type: application/json' -d "{\"kind\":\"$kind\",\"payload\":$payload}")"
  if [ "$code" != "200" ] && [ "$code" != "201" ]; then
    echo "query $kind failed with HTTP $code"
    cat "$out"
    exit 1
  fi
}

run_query refresh "{\"mode\":\"$WEB_SMOKE_REFRESH_MODE\",\"fixturesPath\":\"$WEB_SMOKE_FIXTURES_PATH\"}"
run_query perms '{"user":"jane@example.com","object":"Case","field":"Case.Status"}'
run_query automation '{"object":"Opportunity"}'
run_query impact '{"field":"Opportunity.StageName"}'
run_query ask '{"query":"What touches Opportunity.StageName?","maxCitations":5}'

echo '{"status":"passed"}' > "$ARTIFACT_DIR/web-smoke-result.json"
echo 'web smoke passed'
