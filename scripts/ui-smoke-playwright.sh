#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://127.0.0.1:3101}"
OUT_DIR="${2:-artifacts}"
mkdir -p "$OUT_DIR"

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

assert_html_token "Orgumented" "Orgumented"
assert_html_token "Org Sessions" "Org Sessions"
assert_html_token "Org Browser" "Org Browser"
assert_html_token "Refresh & Build" "Refresh (&amp;|&) Build"
assert_html_token "Explain & Analyze" "Explain (&amp;|&) Analyze"
assert_html_token "Ask" "Ask"
assert_html_token "Proofs & History" "Proofs (&amp;|&) History"
assert_html_token "Settings & Diagnostics" "Settings (&amp;|&) Diagnostics"

# browser-level screenshot proof via local Playwright
SCREENSHOT_FILE="ui-smoke-playwright.png"
npx -y playwright@1.58.2 screenshot --device="Desktop Chrome" "$BASE_URL" "$OUT_DIR/$SCREENSHOT_FILE"

if [ ! -s "$OUT_DIR/$SCREENSHOT_FILE" ]; then
  echo "screenshot artifact missing or empty"
  exit 1
fi

echo "ui smoke passed"
echo "artifacts: $OUT_DIR/$SCREENSHOT_FILE, $HTML_PATH"
