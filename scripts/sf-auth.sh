#!/bin/sh
set -eu

ROOT_DIR="$(env CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"
SF_VERBOSE="${SF_VERBOSE:-false}"

SF_AUTH_MODE="${SF_AUTH_MODE:-oauth_refresh_token}"
SF_ALIAS="${SF_ALIAS:-orggraph-sandbox}"
SF_PROJECT_PATH="${SF_PROJECT_PATH:-$ROOT_DIR/data/sf-project}"

if [ "$SF_VERBOSE" = "true" ]; then
  set -x
fi

mkdir -p "$SF_PROJECT_PATH"
mkdir -p "$SF_PROJECT_PATH/force-app"

if [ ! -f "$SF_PROJECT_PATH/sfdx-project.json" ]; then
  cat > "$SF_PROJECT_PATH/sfdx-project.json" << 'JSON'
{
  "packageDirectories": [{ "path": "force-app", "default": true }],
  "namespace": "",
  "sfdcLoginUrl": "https://test.salesforce.com",
  "sourceApiVersion": "61.0"
}
JSON
fi

if ! command -v sf >/dev/null 2>&1; then
  echo "sf CLI not found in PATH"
  exit 1
fi

if [ "$SF_AUTH_MODE" = "sfdx_url" ]; then
  SF_AUTH_URL_PATH="${SF_AUTH_URL_PATH:-$ROOT_DIR/.secrets/sandbox.sfdx-url.txt}"
  if [ ! -f "$SF_AUTH_URL_PATH" ]; then
    echo "SFDX auth URL file not found: $SF_AUTH_URL_PATH"
    exit 1
  fi

  sf org login sfdx-url \
    --sfdx-url-file "$SF_AUTH_URL_PATH" \
    --alias "$SF_ALIAS" \
    --set-default \
    --json
  exit 0
fi

if [ "$SF_AUTH_MODE" = "oauth_refresh_token" ]; then
  SF_BASE_URL="${SF_BASE_URL:-https://test.salesforce.com}"
  SF_BASE_URL="${SF_BASE_URL%/}"
  SF_CLIENT_ID="${SF_CLIENT_ID:-}"
  SF_CLIENT_SECRET="${SF_CLIENT_SECRET:-}"
  SF_REDIRECT_URI="${SF_REDIRECT_URI:-http://localhost/callback}"
  SF_TOKEN_STORE_PATH="${SF_TOKEN_STORE_PATH:-$ROOT_DIR/.secrets/sf-oauth-token.json}"

  if [ -z "$SF_CLIENT_ID" ] || [ -z "$SF_CLIENT_SECRET" ] || [ -z "$SF_REDIRECT_URI" ]; then
    echo "oauth_refresh_token mode requires SF_CLIENT_ID, SF_CLIENT_SECRET, SF_REDIRECT_URI"
    exit 1
  fi

  if [ ! -f "$SF_TOKEN_STORE_PATH" ]; then
    "$ROOT_DIR/scripts/sf-oauth-token-exchange.sh"
  fi

  REFRESH_TOKEN="$(node - <<'NODE' "$SF_TOKEN_STORE_PATH"
const fs = require('node:fs');
const tokenPath = process.argv[2];
const json = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
process.stdout.write(json.refresh_token || '');
NODE
)"

  if [ -z "$REFRESH_TOKEN" ]; then
    echo "refresh_token missing from token store: $SF_TOKEN_STORE_PATH"
    exit 1
  fi

  RESPONSE_FILE="$(mktemp)"
  HTTP_CODE="$(curl -sS -w '%{http_code}' -o "$RESPONSE_FILE" -X POST "$SF_BASE_URL/services/oauth2/token" \
    -H 'content-type: application/x-www-form-urlencoded' \
    --data-urlencode grant_type=refresh_token \
    --data-urlencode "client_id=$SF_CLIENT_ID" \
    --data-urlencode "client_secret=$SF_CLIENT_SECRET" \
    --data-urlencode "refresh_token=$REFRESH_TOKEN")"

  if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
    echo "OAuth refresh failed with HTTP $HTTP_CODE"
    cat "$RESPONSE_FILE"
    rm -f "$RESPONSE_FILE"
    exit 1
  fi

  TOKENS="$(node - <<'NODE' "$RESPONSE_FILE"
const fs = require('node:fs');
const responsePath = process.argv[2];
const json = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
if (!json.access_token || !json.instance_url) {
  throw new Error('OAuth refresh response missing access_token or instance_url');
}
process.stdout.write(`${json.access_token}\n${json.instance_url}`);
NODE
)"
  rm -f "$RESPONSE_FILE"

  ACCESS_TOKEN="$(printf '%s' "$TOKENS" | sed -n '1p')"
  INSTANCE_URL="$(printf '%s' "$TOKENS" | sed -n '2p')"

  node - <<'NODE' "$SF_TOKEN_STORE_PATH" "$ACCESS_TOKEN" "$INSTANCE_URL"
const fs = require('node:fs');
const [tokenPath, accessToken, instanceUrl] = process.argv.slice(2);
const json = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
json.access_token = accessToken;
json.instance_url = instanceUrl;
json.issued_at = new Date().toISOString();
fs.writeFileSync(tokenPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
NODE

  SF_ACCESS_TOKEN="$ACCESS_TOKEN" sf org login access-token \
    --instance-url "$INSTANCE_URL" \
    --alias "$SF_ALIAS" \
    --set-default \
    --no-prompt \
    --json
  exit 0
fi

if [ "$SF_AUTH_MODE" = "jwt" ]; then
  SF_BASE_URL="${SF_BASE_URL:-https://test.salesforce.com}"
  SF_BASE_URL="${SF_BASE_URL%/}"
  SF_CLIENT_ID="${SF_CLIENT_ID:-}"
  SF_JWT_KEY_PATH="${SF_JWT_KEY_PATH:-}"
  SF_USERNAME="${SF_USERNAME:-}"

  if [ -z "$SF_CLIENT_ID" ] || [ -z "$SF_JWT_KEY_PATH" ] || [ -z "$SF_USERNAME" ]; then
    echo "JWT mode requires SF_CLIENT_ID, SF_JWT_KEY_PATH, SF_USERNAME"
    exit 1
  fi

  if [ ! -f "$SF_JWT_KEY_PATH" ]; then
    echo "JWT key file not found: $SF_JWT_KEY_PATH"
    exit 1
  fi

  sf org login jwt \
    --client-id "$SF_CLIENT_ID" \
    --jwt-key-file "$SF_JWT_KEY_PATH" \
    --username "$SF_USERNAME" \
    --instance-url "$SF_BASE_URL" \
    --alias "$SF_ALIAS" \
    --set-default \
    --json
  exit 0
fi

echo "Unsupported SF_AUTH_MODE: $SF_AUTH_MODE"
exit 1
