#!/usr/bin/env bash
# Prove the toolchain works: Godot renders a Forward+ frame on this machine, and MPFB creates a human in Blender.
# Writes the results to reports/phase0/environment.md and the rendered frame to reports/phase0/smoke_render.png.
# Usage: tools/setup/smoke_test.sh   (after tools/setup/bootstrap.sh)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN="${CONVICTION_TOOLS:-/opt/conviction-tools}/bin"
OUT="$ROOT/reports/phase0"
mkdir -p "$OUT"

t0=$(date +%s.%N)
render_log=$(xvfb-run -a -s "-screen 0 1280x720x24" "$BIN/godot" --path "$ROOT/tools/setup/smoke" \
  --rendering-driver vulkan --resolution 1280x720 --script res://smoke.gd -- "$OUT/smoke_render.png" 2>&1)
t1=$(date +%s.%N)
smoke_line=$(grep '^smoke:' <<<"$render_log" || true)
[[ -n "$smoke_line" && -s "$OUT/smoke_render.png" ]] || { echo "$render_log"; echo "smoke_test: Godot render failed"; exit 1; }

mpfb_line=$("$BIN/blender" -b --factory-startup -P "$ROOT/tools/setup/smoke/mpfb_smoke.py" 2>&1 | grep '^mpfb_smoke:')
[[ "$mpfb_line" == *created* ]] || { echo "$mpfb_line"; echo "smoke_test: MPFB check failed"; exit 1; }

{
  echo "# Phase 0: environment report"
  echo
  echo "Generated $(date -u '+%Y-%m-%d %H:%M UTC') by \`tools/setup/smoke_test.sh\`."
  echo
  echo "## Machine"
  echo
  echo "- OS: $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "- CPUs: $(nproc); RAM: $(free -g | awk '/^Mem:/{print $2}') GB; GPU: none (software rendering)"
  echo "- Vulkan device: $(vulkaninfo --summary 2>/dev/null | grep -m1 deviceName | sed 's/.*= //')"
  echo
  echo "## Toolchain"
  echo
  echo "- Godot: $("$BIN/godot" --headless --version 2>/dev/null | tail -1)"
  echo "- Blender: $("$BIN/blender" -b --factory-startup --version 2>/dev/null | head -1)"
  echo "- MPFB: $(grep -m1 '^version' "$HOME/.config/blender/"*/extensions/user_default/mpfb/blender_manifest.toml | cut -d'"' -f2)"
  echo "- Git LFS: $(git lfs version | cut -d' ' -f1)"
  echo "- ffmpeg: $(ffmpeg -version | head -1 | cut -d' ' -f3)"
  echo
  echo "## Checks"
  echo
  echo "- Godot Forward+ render under Xvfb: \`$smoke_line\`"
  printf -- '- Render wall time, including engine start-up and 12 frames: %.1f s\n' "$(echo "$t1 - $t0" | bc)"
  echo "- MPFB: \`$mpfb_line\`"
  echo
  echo "![Smoke render](smoke_render.png)"
} > "$OUT/environment.md"
cat "$OUT/environment.md"
