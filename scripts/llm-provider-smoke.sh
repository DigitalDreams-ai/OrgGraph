#!/usr/bin/env sh
set -eu

PROVIDER="${1:-anthropic}"
if [ "$PROVIDER" != "anthropic" ] && [ "$PROVIDER" != "openai" ]; then
  echo "usage: $0 <anthropic|openai>" >&2
  exit 2
fi

API_BASE="${API_BASE:-http://127.0.0.1:3100}"
PAYLOAD=$(cat <<EOF
{"query":"What touches Opportunity.StageName?","mode":"llm_assist","llm":{"provider":"$PROVIDER"}}
EOF
)

RESP="$(curl -sS -X POST "$API_BASE/ask" -H 'content-type: application/json' -d "$PAYLOAD")"

echo "$RESP" | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8");
const body = JSON.parse(raw);
const llm = body.llm || {};
console.log(JSON.stringify({
  mode: body.mode,
  provider: llm.provider,
  used: llm.used,
  model: llm.model || null,
  fallbackReason: llm.fallbackReason || null
}, null, 2));
'
