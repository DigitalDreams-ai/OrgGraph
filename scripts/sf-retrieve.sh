#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"
SF_VERBOSE="${SF_VERBOSE:-false}"
SF_ALIAS="${SF_ALIAS:-orggraph-sandbox}"
SF_PROJECT_PATH="${SF_PROJECT_PATH:-$ROOT_DIR/data/sf-project}"
SF_MANIFEST_PATH="${SF_MANIFEST_PATH:-$ROOT_DIR/manifest/package.xml}"
SF_WAIT_MINUTES="${SF_WAIT_MINUTES:-15}"

if [ "$SF_VERBOSE" = "true" ]; then
  set -x
fi

case "$SF_PROJECT_PATH" in
  /*) ;;
  *) SF_PROJECT_PATH="$ROOT_DIR/$SF_PROJECT_PATH" ;;
esac

case "$SF_MANIFEST_PATH" in
  /*) ;;
  *) SF_MANIFEST_PATH="$ROOT_DIR/$SF_MANIFEST_PATH" ;;
esac

if ! command -v sf >/dev/null 2>&1; then
  echo "sf CLI not found in PATH"
  exit 1
fi

if [ ! -f "$SF_MANIFEST_PATH" ]; then
  echo "manifest file not found: $SF_MANIFEST_PATH"
  exit 1
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

(
  cd "$SF_PROJECT_PATH"
  sf project retrieve start \
    --manifest "$SF_MANIFEST_PATH" \
    --target-org "$SF_ALIAS" \
    --wait "$SF_WAIT_MINUTES" \
    --json
)
