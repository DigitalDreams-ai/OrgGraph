#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

SF_AUTH_MODE="${SF_AUTH_MODE:-sfdx_url}"
SF_ALIAS="${SF_ALIAS:-orggraph-sandbox}"
SF_PROJECT_PATH="${SF_PROJECT_PATH:-$ROOT_DIR/data/sf-project}"

mkdir -p "$SF_PROJECT_PATH"

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

if [ "$SF_AUTH_MODE" = "jwt" ]; then
  SF_CLIENT_ID="${SF_CLIENT_ID:-}"
  SF_JWT_KEY_PATH="${SF_JWT_KEY_PATH:-}"
  SF_USERNAME="${SF_USERNAME:-}"
  SF_INSTANCE_URL="${SF_INSTANCE_URL:-https://test.salesforce.com}"

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
    --instance-url "$SF_INSTANCE_URL" \
    --alias "$SF_ALIAS" \
    --set-default \
    --json
  exit 0
fi

echo "Unsupported SF_AUTH_MODE: $SF_AUTH_MODE"
exit 1
