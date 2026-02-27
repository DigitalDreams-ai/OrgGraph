#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://127.0.0.1:3101}"
OUT_DIR="${2:-artifacts}"
mkdir -p "$OUT_DIR"

CONTAINER_BASE_URL="$BASE_URL"
case "$BASE_URL" in
  http://127.0.0.1:*|http://localhost:*)
    CONTAINER_BASE_URL="$(printf '%s' "$BASE_URL" | sed 's#127.0.0.1#host.docker.internal#; s#localhost#host.docker.internal#')"
    ;;
esac

# quick static sanity against rendered markup
HTML_PATH="$OUT_DIR/ui-smoke-page.html"
curl -fsSL "$BASE_URL" > "$HTML_PATH"

assert_html_token() {
  label="$1"
  pattern="$2"
  if ! grep -Eq "$pattern" "$HTML_PATH"; then
    echo "missing expected token in rendered html: $label"
    exit 1
  fi
}

assert_html_token "Mission Control" "Mission Control"
assert_html_token "Connect" "Connect"
assert_html_token "Org Browser" "Org Browser"
assert_html_token "Refresh & Build" "Refresh (&amp;|&) Build"
assert_html_token "Analyze" "Analyze"
assert_html_token "Ask" "Ask"
assert_html_token "Proofs & Metrics" "Proofs (&amp;|&) Metrics"
assert_html_token "System" "System"

# browser-level screenshot proof via Playwright Docker image
SCREENSHOT_FILE="ui-smoke-playwright.png"
docker run --rm \
  --add-host host.docker.internal:host-gateway \
  -e BASE_URL="$CONTAINER_BASE_URL" \
  -v "$PWD/$OUT_DIR":/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.58.2-noble \
  sh -lc "npx -y playwright@1.58.2 screenshot --device='Desktop Chrome' \"\$BASE_URL\" '$SCREENSHOT_FILE'"

if [ ! -s "$OUT_DIR/$SCREENSHOT_FILE" ]; then
  echo "screenshot artifact missing or empty"
  exit 1
fi

echo "ui smoke passed"
echo "artifacts: $OUT_DIR/$SCREENSHOT_FILE, $HTML_PATH"
