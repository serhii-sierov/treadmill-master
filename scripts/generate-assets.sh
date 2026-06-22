#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/source"
OUT="$ROOT/assets/images"

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert is required (brew install librsvg)" >&2
  exit 1
fi

mkdir -p "$OUT"

render() {
  local input="$1"
  local output="$2"
  local size="$3"
  rsvg-convert -w "$size" -h "$size" "$input" -o "$output"
  echo "Wrote $output (${size}x${size})"
}

render "$SRC/icon.svg" "$OUT/icon.png" 1024
render "$SRC/android-foreground.svg" "$OUT/android-icon-foreground.png" 512
render "$SRC/android-background.svg" "$OUT/android-icon-background.png" 512
render "$SRC/android-monochrome.svg" "$OUT/android-icon-monochrome.png" 432
render "$SRC/splash-icon.svg" "$OUT/splash-icon.png" 512
render "$SRC/favicon.svg" "$OUT/favicon.png" 48

echo "Done. Brand assets generated from assets/source/*.svg"
