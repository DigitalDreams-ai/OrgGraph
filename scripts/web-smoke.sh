#!/bin/sh
set -eu

UI_BASE_URL="${WEB_SMOKE_UI_BASE:-${WEB_SMOKE_BASE:-http://127.0.0.1:3101}}"
API_BASE_URL="${WEB_SMOKE_API_BASE:-${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}}"
ARTIFACT_DIR="${WEB_SMOKE_ARTIFACT_DIR:-artifacts}"
DEFAULT_FIXTURES_PATH="fixtures/permissions"
if [ "${WEB_SMOKE_USE_SF_PROJECT:-0}" = "1" ] && [ -d "data/sf-project/force-app/main/default" ]; then
  DEFAULT_FIXTURES_PATH="data/sf-project/force-app/main/default"
fi
WEB_SMOKE_FIXTURES_PATH="${WEB_SMOKE_FIXTURES_PATH:-$DEFAULT_FIXTURES_PATH}"
WEB_SMOKE_REFRESH_MODE="${WEB_SMOKE_REFRESH_MODE:-incremental}"
WEB_SMOKE_ENFORCE_NON_FIXTURE="${WEB_SMOKE_ENFORCE_NON_FIXTURE:-0}"
WEB_SMOKE_REFRESH_REBASELINE="${WEB_SMOKE_REFRESH_REBASELINE:-0}"
if [ "${WEB_SMOKE_USE_SF_PROJECT:-0}" = "1" ]; then
  WEB_SMOKE_ENFORCE_NON_FIXTURE=1
  WEB_SMOKE_REFRESH_REBASELINE=1
fi
mkdir -p "$ARTIFACT_DIR"

for _ in $(seq 1 20); do
  ui_code="$(curl -sS -o "$ARTIFACT_DIR/web-ui.html" -w '%{http_code}' "$UI_BASE_URL" || true)"
  health_code="$(curl -sS -o "$ARTIFACT_DIR/web-health.json" -w '%{http_code}' "$API_BASE_URL/health" || true)"
  if [ "$ui_code" = "200" ] && [ "$health_code" = "200" ]; then
    break
  fi
  sleep 1
done
if [ "${ui_code:-0}" != "200" ]; then
  echo "web ui check failed: ${ui_code:-0}"
  exit 1
fi
if [ "$health_code" != "200" ]; then
  echo "web health check failed: $health_code"
  exit 1
fi

for _ in $(seq 1 25); do
  ready_code="$(curl -sS -o "$ARTIFACT_DIR/web-ready.json" -w '%{http_code}' "$API_BASE_URL/ready" || true)"
  if [ "$ready_code" = "200" ]; then
    break
  fi
  sleep 1
done
if [ "$ready_code" != "200" ]; then
  echo "web ready check failed: $ready_code"
  exit 1
fi

run_get() {
  name="$1"
  path="$2"
  out="$ARTIFACT_DIR/web-${name}.json"
  code="$(curl -sS -o "$out" -w '%{http_code}' "$API_BASE_URL$path")"
  if [ "$code" != "200" ]; then
    echo "GET $path failed with HTTP $code"
    cat "$out"
    exit 1
  fi
}

run_post() {
  name="$1"
  path="$2"
  payload="$3"
  out="$ARTIFACT_DIR/web-${name}.json"
  code="$(curl -sS -o "$out" -w '%{http_code}' -X POST "$API_BASE_URL$path" -H 'content-type: application/json' -d "$payload")"
  if [ "$code" != "200" ] && [ "$code" != "201" ]; then
    echo "POST $path failed with HTTP $code"
    cat "$out"
    exit 1
  fi
}

rebaseline_flag="$( [ "$WEB_SMOKE_REFRESH_REBASELINE" = "1" ] && printf true || printf false )"
run_post refresh "/refresh" "{\"mode\":\"$WEB_SMOKE_REFRESH_MODE\",\"fixturesPath\":\"$WEB_SMOKE_FIXTURES_PATH\",\"rebaseline\":$rebaseline_flag}"
if [ "$WEB_SMOKE_ENFORCE_NON_FIXTURE" = "1" ]; then
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    const sourcePath = d?.sourcePath || "";
    if (!sourcePath || sourcePath.includes("/fixtures/permissions")) {
      console.error("expected non-fixture sourcePath in refresh response; got:", sourcePath || "<empty>");
      process.exit(1);
    }
  ' "$ARTIFACT_DIR/web-refresh.json"
fi
run_get org-status "/org/status"
run_get metadata-catalog "/org/metadata/catalog?q=case&limit=200&refresh=true"
run_get perms "/perms?user=jane%40example.com&object=Case&field=Case.Status"
run_get automation "/automation?object=Opportunity"
run_get impact "/impact?field=Opportunity.StageName"
run_post ask "/ask" '{"query":"What touches Opportunity.StageName?","maxCitations":5}'

if [ "${WEB_SMOKE_REQUIRE_ORG_AUTH:-0}" = "1" ]; then
  WEB_SMOKE_ORG_ALIAS="${WEB_SMOKE_ORG_ALIAS:-orgumented-sandbox}"
  run_get org-session "/org/session"
  run_get org-preflight "/org/preflight?alias=$WEB_SMOKE_ORG_ALIAS"
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!d?.ok) {
      console.error("orgPreflight payload.ok is false; fix auth/session before org smoke");
      process.exit(1);
    }
  ' "$ARTIFACT_DIR/web-org-preflight.json"
  run_post org-session-switch "/org/session/switch" "{\"alias\":\"$WEB_SMOKE_ORG_ALIAS\"}"
  run_post org-connect "/org/session/connect" "{\"alias\":\"$WEB_SMOKE_ORG_ALIAS\"}"
  run_get org-status-auth "/org/status"
  run_post org-retrieve "/org/retrieve" '{"runAuth":true,"runRetrieve":false,"autoRefresh":false}'
  run_get metadata-members "/org/metadata/members?type=CustomObject&q=Account&limit=1000&refresh=true"
  run_post metadata-retrieve "/org/metadata/retrieve" '{"selections":[{"type":"CustomObject","members":["Account"]}],"autoRefresh":false}'
  run_post org-session-disconnect "/org/session/disconnect" '{}'
fi

echo '{"status":"passed"}' > "$ARTIFACT_DIR/web-smoke-result.json"
echo 'web smoke passed'
