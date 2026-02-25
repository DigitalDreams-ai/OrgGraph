#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"
SF_BASE_URL="${SF_BASE_URL:-https://test.salesforce.com}"
SF_LOGIN_DOMAIN="${SF_LOGIN_DOMAIN:-$SF_BASE_URL}"
SF_LOGIN_DOMAIN="${SF_LOGIN_DOMAIN%/}"
SF_CLIENT_ID="${SF_CLIENT_ID:-}"
SF_CLIENT_SECRET="${SF_CLIENT_SECRET:-}"
SF_REDIRECT_URI="${SF_REDIRECT_URI:-http://localhost/callback}"
SF_AUTH_CODE_PATH="${SF_AUTH_CODE_PATH:-$ROOT_DIR/.secrets/sf-auth-code.txt}"
SF_TOKEN_STORE_PATH="${SF_TOKEN_STORE_PATH:-$ROOT_DIR/.secrets/sf-oauth-token.json}"

if [ -z "$SF_CLIENT_ID" ] || [ -z "$SF_CLIENT_SECRET" ]; then
  echo "SF_CLIENT_ID and SF_CLIENT_SECRET are required"
  exit 1
fi

if [ ! -f "$SF_AUTH_CODE_PATH" ]; then
  echo "Auth code file not found: $SF_AUTH_CODE_PATH"
  exit 1
fi

AUTH_CODE="$(tr -d '\n\r' < "$SF_AUTH_CODE_PATH")"
if [ -z "$AUTH_CODE" ]; then
  echo "Auth code file is empty: $SF_AUTH_CODE_PATH"
  exit 1
fi

mkdir -p "$(dirname "$SF_TOKEN_STORE_PATH")"

RESPONSE_FILE="$(mktemp)"
HTTP_CODE="$(curl -sS -w '%{http_code}' -o "$RESPONSE_FILE" -X POST "$SF_LOGIN_DOMAIN/services/oauth2/token" \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=authorization_code \
  --data-urlencode "client_id=$SF_CLIENT_ID" \
  --data-urlencode "client_secret=$SF_CLIENT_SECRET" \
  --data-urlencode "redirect_uri=$SF_REDIRECT_URI" \
  --data-urlencode "code=$AUTH_CODE")"

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "OAuth token exchange failed with HTTP $HTTP_CODE"
  cat "$RESPONSE_FILE"
  rm -f "$RESPONSE_FILE"
  exit 1
fi

node - <<'NODE' "$RESPONSE_FILE" "$SF_TOKEN_STORE_PATH"
const fs = require('node:fs');
const [responsePath, outputPath] = process.argv.slice(2);
const raw = fs.readFileSync(responsePath, 'utf8');
const json = JSON.parse(raw);
if (!json.access_token || !json.instance_url) {
  throw new Error('OAuth response missing access_token or instance_url');
}
if (!json.refresh_token) {
  throw new Error('OAuth response missing refresh_token; ensure refresh_token scope is enabled');
}
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      instance_url: json.instance_url,
      issued_at: new Date().toISOString()
    },
    null,
    2
  ) + '\n',
  'utf8'
);
NODE

rm -f "$RESPONSE_FILE"

echo "Token response saved to $SF_TOKEN_STORE_PATH"
