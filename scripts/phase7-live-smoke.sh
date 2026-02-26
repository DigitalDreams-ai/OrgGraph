#!/bin/sh
set -eu

API_BASE="${ORGGRAPH_API_BASE:-http://127.0.0.1:3100}"
USER_EMAIL="${ORGGRAPH_SMOKE_USER:-sbingham@shulman-hill.com.uat}"
OBJECT_API="${ORGGRAPH_SMOKE_OBJECT:-litify_pm__Intake__c}"
FIELD_API="${ORGGRAPH_SMOKE_FIELD:-Opportunity.StageName}"
ARTIFACT_DIR="${ORGGRAPH_SMOKE_ARTIFACT_DIR:-artifacts/phase7-live-smoke}"

mkdir -p "$ARTIFACT_DIR"

notify() {
  status="$1"
  message="$2"
  if [ -x "./scripts/phase8-alert-hook.sh" ]; then
    ./scripts/phase8-alert-hook.sh "$status" "$message" || true
  fi
}
trap 'notify "error" "phase7 live smoke failed"' INT TERM HUP

curl -sS "$API_BASE/ready" > "$ARTIFACT_DIR/ready.json"
curl -sS "$API_BASE/perms?user=$USER_EMAIL&object=$OBJECT_API" > "$ARTIFACT_DIR/perms.json"
curl -sS "$API_BASE/automation?object=Opportunity&strict=true" > "$ARTIFACT_DIR/automation.json"
curl -sS "$API_BASE/impact?field=$FIELD_API&strict=true&debug=true" > "$ARTIFACT_DIR/impact.json"
curl -sS -X POST "$API_BASE/ask" \
  -H 'content-type: application/json' \
  -d "{\"query\":\"What touches $FIELD_API?\"}" > "$ARTIFACT_DIR/ask.json"

echo "{\"status\":\"passed\",\"artifactDir\":\"$ARTIFACT_DIR\"}" > "$ARTIFACT_DIR/result.json"
notify "ok" "phase7 live smoke passed"
echo "phase7 live smoke passed"
