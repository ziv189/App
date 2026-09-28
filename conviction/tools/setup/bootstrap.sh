#!/usr/bin/env bash
# Install and check the CONVICTION toolchain. Safe to re-run: every step skips what's already in place.
#
# Usage: tools/setup/bootstrap.sh [--no-godot]
#
# Tools install under $CONVICTION_TOOLS (default /opt/conviction-tools), with binaries linked into
# $CONVICTION_TOOLS/bin. Pinned versions and checksums live in tools/setup/versions.env.
#
# Godot is built from the official source at a pinned tag. Claude Code cloud sessions can clone public
# GitHub repositories but can't download GitHub release files, and Godot's binaries are only published
# there. The build takes about 20-25 minutes on 4 cores; --no-godot skips it for sessions that don't
# need the engine.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
# shellcheck source=versions.env
source "$HERE/versions.env"

TOOLS="${CONVICTION_TOOLS:-/opt/conviction-tools}"
BIN="$TOOLS/bin"
WANT_GODOT=1
[[ "${1:-}" == "--no-godot" ]] && WANT_GODOT=0

SUDO=""
[[ "$(id -u)" -ne 0 ]] && SUDO="sudo"

log() { printf '[bootstrap %s] %s\n' "$(date -u +%T)" "$*"; }

apt_install() {
  local missing=() pkg
  for pkg in "$@"; do dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg"); done
  ((${#missing[@]})) || return 0
  log "apt: installing ${missing[*]}"
  $SUDO apt-get update -qq
  DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq "${missing[@]}" >/dev/null
}

verify_sha256() {  # file expected-hash
  echo "$2  $1" | sha256sum -c --quiet - || { log "checksum mismatch for $1"; rm -f "$1"; exit 1; }
}

$SUDO mkdir -p "$BIN" "$TOOLS/downloads" "$TOOLS/src"
$SUDO chown -R "$(id -u):$(id -g)" "$TOOLS"

# 1. System packages: software Vulkan and a virtual display for captures, Git LFS, ffmpeg, Blender's runtime libraries.
apt_install git-lfs ffmpeg xvfb mesa-vulkan-drivers vulkan-tools \
  libxrender1 libxxf86vm1 libxfixes3 libxi6 libxkbcommon0 libsm6 libgl1 libegl1

# 2. Blender.
BLENDER_DIR="$TOOLS/blender-$BLENDER_VERSION-linux-x64"
if [[ ! -x "$BLENDER_DIR/blender" ]]; then
  tarball="$TOOLS/downloads/blender-$BLENDER_VERSION-linux-x64.tar.xz"
  log "downloading Blender $BLENDER_VERSION"
  curl -fsSL -o "$tarball" "https://download.blender.org/release/Blender$BLENDER_SERIES/blender-$BLENDER_VERSION-linux-x64.tar.xz"
  verify_sha256 "$tarball" "$BLENDER_SHA256"
  tar -xf "$tarball" -C "$TOOLS"
  rm -f "$tarball"
fi
ln -sfn "$BLENDER_DIR/blender" "$BIN/blender"

# 3. MPFB, installed as a Blender extension.
MPFB_DIR="$HOME/.config/blender/$BLENDER_SERIES/extensions/user_default/mpfb"
if [[ ! -f "$MPFB_DIR/blender_manifest.toml" ]] || ! grep -q "version = \"$MPFB_VERSION\"" "$MPFB_DIR/blender_manifest.toml"; then
  zip="$TOOLS/downloads/mpfb-$MPFB_VERSION.zip"
  log "downloading MPFB $MPFB_VERSION"
  curl -fsSL -o "$zip" "https://extensions.blender.org/download/sha256:$MPFB_SHA256/add-on-mpfb-v$MPFB_VERSION.zip"
  verify_sha256 "$zip" "$MPFB_SHA256"
  "$BIN/blender" -b --factory-startup -c extension install-file -r user_default -e "$zip" >/dev/null
  rm -f "$zip"
fi

# 4. Godot, built from source.
GODOT_DIR="$TOOLS/godot-$GODOT_TAG"
godot_ok() { [[ -x "$GODOT_DIR/godot" ]] && "$GODOT_DIR/godot" --headless --version 2>/dev/null | grep -q "${GODOT_TAG/-/.}.*${GODOT_COMMIT:0:9}"; }
if ((WANT_GODOT)) && ! godot_ok; then
  apt_install build-essential pkg-config libx11-dev libxcursor-dev libxinerama-dev libgl1-mesa-dev \
    libglu1-mesa-dev libasound2-dev libpulse-dev libudev-dev libxi-dev libxrandr-dev libwayland-dev python3-venv
  if [[ ! -x "$TOOLS/venv/bin/scons" ]]; then
    python3 -m venv "$TOOLS/venv"
    "$TOOLS/venv/bin/pip" install -q "scons==$SCONS_VERSION"
  fi
  src="$TOOLS/src/godot-$GODOT_TAG"
  if [[ ! -d "$src/.git" ]]; then
    log "cloning Godot $GODOT_TAG"
    GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 --branch "$GODOT_TAG" https://github.com/godotengine/godot "$src"
  fi
  head="$(git -C "$src" rev-parse HEAD)"
  [[ "$head" == "$GODOT_COMMIT" ]] || { log "Godot source is at $head, expected $GODOT_COMMIT"; exit 1; }
  log "building the Godot editor (about 20-25 minutes on 4 cores)"
  (cd "$src" && "$TOOLS/venv/bin/scons" platform=linuxbsd target=editor -j"$(nproc)" debug_symbols=no progress=no >"$TOOLS/godot-build.log" 2>&1) \
    || { log "Godot build failed; see $TOOLS/godot-build.log"; exit 1; }
  mkdir -p "$GODOT_DIR"
  cp "$src/bin/godot.linuxbsd.editor.x86_64" "$GODOT_DIR/godot"
  godot_ok || { log "the built Godot binary doesn't report $GODOT_TAG ($GODOT_COMMIT)"; exit 1; }
fi
((WANT_GODOT)) && ln -sfn "$GODOT_DIR/godot" "$BIN/godot"

# 5. Repository settings: point git at the versioned hooks folder, then install Git LFS. LFS writes its
#    hooks into that folder, where they're committed alongside the project's pre-commit hook.
REPO="$(git -C "$ROOT" rev-parse --show-toplevel)"
git -C "$REPO" config core.hooksPath "$(realpath --relative-to="$REPO" "$ROOT/tools/githooks")"
git -C "$REPO" lfs install --local >/dev/null

# 6. Report.
log "toolchain ready; add $BIN to PATH"
printf '  %-8s %s\n' \
  godot "$( ((WANT_GODOT)) && "$BIN/godot" --headless --version 2>/dev/null | tail -1 || echo skipped)" \
  blender "$("$BIN/blender" -b --factory-startup --version 2>/dev/null | head -1)" \
  mpfb "$(grep -m1 '^version' "$MPFB_DIR/blender_manifest.toml" | cut -d'"' -f2)" \
  git-lfs "$(git lfs version | cut -d' ' -f1)" \
  ffmpeg "$(ffmpeg -version | head -1 | cut -d' ' -f3)" \
  vulkan "$(vulkaninfo --summary 2>/dev/null | grep -m1 deviceName | sed 's/.*= //')"
