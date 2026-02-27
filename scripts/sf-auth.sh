#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"
SF_VERBOSE="${SF_VERBOSE:-false}"
SF_ALIAS="${SF_ALIAS:-orgumented-sandbox}"
SF_BASE_URL="${SF_BASE_URL:-https://test.salesforce.com}"
SF_INTERACTIVE_LOGIN="${SF_INTERACTIVE_LOGIN:-false}"

if [ "$SF_VERBOSE" = "true" ]; then
  set -x
fi

if ! command -v sf >/dev/null 2>&1; then
  echo "sf CLI not found in PATH"
  exit 1
fi

if [ "$SF_INTERACTIVE_LOGIN" = "true" ]; then
  sf org login web \
    --alias "$SF_ALIAS" \
    --instance-url "$SF_BASE_URL" \
    --set-default
fi

if sf org display --target-org "$SF_ALIAS" --json >/dev/null 2>&1; then
  echo "sf keychain session ready for alias: $SF_ALIAS"
  exit 0
fi

echo "No authenticated org found for alias '$SF_ALIAS'."
echo "Authenticate first using Salesforce CLI keychain in this runtime:"
echo "  sf org login web --alias $SF_ALIAS --instance-url $SF_BASE_URL --set-default"
exit 1
