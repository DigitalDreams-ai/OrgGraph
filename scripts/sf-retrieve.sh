#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"
SF_VERBOSE="${SF_VERBOSE:-false}"
SF_ALIAS="${SF_ALIAS:-orgumented-sandbox}"
SF_PROJECT_PATH="${SF_PROJECT_PATH:-$ROOT_DIR/data/sf-project}"
SF_RETRIEVE_SELECTORS="${SF_RETRIEVE_SELECTORS:-CustomObject,Flow,ApexClass,ApexTrigger,PermissionSet,Profile,PermissionSetGroup,CustomPermission,ConnectedApp}"
SF_WAIT_MINUTES="${SF_WAIT_MINUTES:-15}"

if [ "$SF_VERBOSE" = "true" ]; then
  set -x
fi

case "$SF_PROJECT_PATH" in
  /*) ;;
  *) SF_PROJECT_PATH="$ROOT_DIR/$SF_PROJECT_PATH" ;;
esac

if ! command -v sf >/dev/null 2>&1; then
  echo "sf CLI not found in PATH"
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

set -- \
  project retrieve start \
  --target-org "$SF_ALIAS" \
  --wait "$SF_WAIT_MINUTES" \
  --json

OLD_IFS=$IFS
IFS=','
for selector in $SF_RETRIEVE_SELECTORS; do
  trimmed="$(echo "$selector" | tr -d '[:space:]')"
  if [ -n "$trimmed" ]; then
    set -- "$@" --metadata "$trimmed"
  fi
done
IFS=$OLD_IFS

if [ "$#" -le 8 ]; then
  echo "no metadata selectors resolved. Set SF_RETRIEVE_SELECTORS"
  exit 1
fi

(
  cd "$SF_PROJECT_PATH"
  sf "$@"
)
