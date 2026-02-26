#!/bin/sh
set -eu

API_BASE="${ORGUMENTED_API_BASE:-http://127.0.0.1:3100}"
SNAPSHOT_DIR="${ORGUMENTED_SNAPSHOT_DIR:-data/validation/snapshots}"
MAX_DROP_PCT="${ORGUMENTED_MAX_DROP_PCT:-30}"

notify() {
  status="$1"
  message="$2"
  if [ -x "./scripts/phase8-alert-hook.sh" ]; then
    ./scripts/phase8-alert-hook.sh "$status" "$message" || true
  fi
}

CURRENT_READY="$(mktemp)"
trap 'rm -f "$CURRENT_READY"' EXIT
curl -sS "$API_BASE/ready" > "$CURRENT_READY"

BASELINE_READY="$SNAPSHOT_DIR/latest-ready.json"
if [ ! -f "$BASELINE_READY" ]; then
  echo "no baseline snapshot at $BASELINE_READY"
  echo "run: ./scripts/phase7-capture-snapshot.sh"
  exit 1
fi

node - <<'NODE' "$BASELINE_READY" "$CURRENT_READY" "$MAX_DROP_PCT"
const fs = require('node:fs');
const [baselinePath, currentPath, maxDropRaw] = process.argv.slice(2);
const maxDrop = Number(maxDropRaw);

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

const bNodes = Number(baseline.checks?.db?.nodeCount || 0);
const bEdges = Number(baseline.checks?.db?.edgeCount || 0);
const cNodes = Number(current.checks?.db?.nodeCount || 0);
const cEdges = Number(current.checks?.db?.edgeCount || 0);

const nodeDropPct = bNodes > 0 ? ((bNodes - cNodes) / bNodes) * 100 : 0;
const edgeDropPct = bEdges > 0 ? ((bEdges - cEdges) / bEdges) * 100 : 0;

const summary = {
  baseline: { nodeCount: bNodes, edgeCount: bEdges },
  current: { nodeCount: cNodes, edgeCount: cEdges },
  drops: { nodeDropPct: Number(nodeDropPct.toFixed(2)), edgeDropPct: Number(edgeDropPct.toFixed(2)) },
  maxDropPct: maxDrop
};
console.log(JSON.stringify(summary, null, 2));

if (nodeDropPct > maxDrop || edgeDropPct > maxDrop) {
  process.exit(1);
}
NODE

notify "ok" "phase7 regression check passed"
echo "phase7 regression check passed"
