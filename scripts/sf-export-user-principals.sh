#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
. "$ROOT_DIR/scripts/load-dotenv.sh"

SF_ALIAS="${SF_ALIAS:-orgumented-sandbox}"
USER_PROFILE_MAP_PATH="${USER_PROFILE_MAP_PATH:-data/sf-user-principals.json}"

case "$USER_PROFILE_MAP_PATH" in
  /*) OUTPUT_PATH="$USER_PROFILE_MAP_PATH" ;;
  *) OUTPUT_PATH="$ROOT_DIR/$USER_PROFILE_MAP_PATH" ;;
esac

if ! command -v sf >/dev/null 2>&1; then
  echo "sf CLI not found in PATH"
  exit 1
fi

TMP_USERS="$(mktemp)"
TMP_PROFILES="$(mktemp)"
TMP_PSA="$(mktemp)"
trap 'rm -f "$TMP_USERS" "$TMP_PROFILES" "$TMP_PSA"' EXIT

sf data query \
  --target-org "$SF_ALIAS" \
  --query "SELECT Username, ProfileId FROM User WHERE IsActive = true" \
  --json > "$TMP_USERS"

sf data query \
  --target-org "$SF_ALIAS" \
  --query "SELECT Id, Name FROM Profile" \
  --json > "$TMP_PROFILES"

sf data query \
  --target-org "$SF_ALIAS" \
  --query "SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment" \
  --json > "$TMP_PSA"

mkdir -p "$(dirname "$OUTPUT_PATH")"

node - <<'NODE' "$TMP_USERS" "$TMP_PROFILES" "$TMP_PSA" "$OUTPUT_PATH"
const fs = require('node:fs');
const [usersPath, profilesPath, psaPath, outputPath] = process.argv.slice(2);

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
const psa = JSON.parse(fs.readFileSync(psaPath, 'utf8'));

const byUser = new Map();
const profileById = new Map();
const unresolvedProfileIds = new Set();

const profileRecords = profiles.result?.records ?? [];
for (const row of profileRecords) {
  const id = String(row.Id || '').trim();
  const name = String(row.Name || '').trim();
  if (!id || !name) continue;
  profileById.set(id, name);
}

const userRecords = users.result?.records ?? [];
for (const row of userRecords) {
  const username = String(row.Username || '').trim().toLowerCase();
  const profileId = String(row.ProfileId || '').trim();
  const profileName = profileById.get(profileId) || profileId;
  if (profileId && !profileById.has(profileId)) {
    unresolvedProfileIds.add(profileId);
  }
  if (!username) continue;
  if (!byUser.has(username)) byUser.set(username, []);
  if (profileName && !byUser.get(username).includes(profileName)) {
    byUser.get(username).push(profileName);
  }
}

const psaRecords = psa.result?.records ?? [];
for (const row of psaRecords) {
  const username = String(row.Assignee?.Username || '').trim().toLowerCase();
  const permName = String(row.PermissionSet?.Name || '').trim();
  if (!username || !permName) continue;
  if (!byUser.has(username)) byUser.set(username, []);
  if (!byUser.get(username).includes(permName)) {
    byUser.get(username).push(permName);
  }
}

const sortedUsers = [...byUser.keys()].sort((a, b) => a.localeCompare(b));
const output = {};
for (const username of sortedUsers) {
  const principals = byUser
    .get(username)
    .filter((x) => typeof x === 'string' && x.trim().length > 0)
    .sort((a, b) => a.localeCompare(b));
  if (principals.length > 0) {
    output[username] = principals;
  }
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Wrote ${Object.keys(output).length} users to ${outputPath}`);
if (unresolvedProfileIds.size > 0) {
  const sample = [...unresolvedProfileIds].slice(0, 5).join(', ');
  console.error(
    `Warning: ${unresolvedProfileIds.size} users had unresolved ProfileId values (sample: ${sample})`
  );
}
NODE
