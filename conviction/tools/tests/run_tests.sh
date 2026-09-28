#!/usr/bin/env bash
# Run every project test and lint. Exits non-zero if any fails. Godot tests need `godot` on PATH (tools/setup/bootstrap.sh).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GODOT="${GODOT:-godot}"
failed=0

run() {  # name command...
  if "${@:2}"; then echo "ok   $1"; else echo "FAIL $1"; failed=1; fi
}

run "lint: script structure" python3 "$ROOT/tools/lint/script_structure.py"
for test in "$ROOT"/tools/tests/test_*.gd; do
  run "godot: $(basename "$test" .gd)" "$GODOT" --headless --path "$ROOT/game" --script "$test"
done
exit $failed
