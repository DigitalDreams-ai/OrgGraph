#!/bin/sh
set -eu

ROOT_DIR="$(env CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"

SF_BASE_URL="${SF_BASE_URL:-https://test.salesforce.com}"
SF_BASE_URL="${SF_BASE_URL%/}"
SF_CLIENT_ID="${SF_CLIENT_ID:-}"
SF_REDIRECT_URI="${SF_REDIRECT_URI:-http://localhost/callback}"
SF_OAUTH_STATE="${SF_OAUTH_STATE:-orggraph-sandbox}"

if [ -z "$SF_CLIENT_ID" ]; then
  echo "SF_CLIENT_ID is required"
  exit 1
fi

ENC_REDIRECT_URI="$(node -p "encodeURIComponent(process.argv[1])" "$SF_REDIRECT_URI")"
ENC_STATE="$(node -p "encodeURIComponent(process.argv[1])" "$SF_OAUTH_STATE")"

URL="$SF_BASE_URL/services/oauth2/authorize?response_type=code&client_id=$SF_CLIENT_ID&redirect_uri=$ENC_REDIRECT_URI&state=$ENC_STATE"

echo "$URL"
