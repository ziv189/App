#!/usr/bin/env bash
# Regenerate game/project.godot and game/default_bus_layout.tres from tools/pipeline/configure_project.gd.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GODOT="${GODOT:-godot}"
[[ -f "$ROOT/game/project.godot" ]] || printf 'config_version=5\n' > "$ROOT/game/project.godot"
"$GODOT" --headless --path "$ROOT/game" --script "$ROOT/tools/pipeline/configure_project.gd"
