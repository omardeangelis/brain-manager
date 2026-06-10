#!/usr/bin/env bash
#
# install.sh — install the init-brain skill into your Claude Code skills directory.
#
# By default this creates a SYMLINK so `git pull` in this repo keeps the skill
# up to date. Pass --copy to install an independent copy instead.
#
# Usage:
#   ./install.sh            # symlink into the detected skills dir
#   ./install.sh --copy     # copy instead of symlink
#   ./install.sh --force    # overwrite an existing init-brain install
#   ./install.sh --dir DIR  # install into a specific skills directory

set -euo pipefail

SKILL_NAME="init-brain"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$REPO_DIR/skills/$SKILL_NAME"

MODE="symlink"
FORCE=0
DEST_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --copy)  MODE="copy" ;;
    --force) FORCE=1 ;;
    --dir)   shift; DEST_DIR="${1:-}" ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ ! -f "$SRC/SKILL.md" ]; then
  echo "Error: skill source not found at $SRC" >&2
  echo "Run this script from inside the brain-manager repo." >&2
  exit 1
fi

# Build the CLI so the skill's local-repo fallback (dist/bin.js) works.
if command -v npm >/dev/null 2>&1; then
  echo "Building the brain CLI..."
  (cd "$REPO_DIR" && npm install --silent && npm run build --silent) \
    || echo "WARN: CLI build failed — the skill will fall back to npx brain-manager" >&2
else
  echo "WARN: npm not found — the skill will fall back to npx brain-manager" >&2
fi

# Pick a destination skills directory if not given.
if [ -z "$DEST_DIR" ]; then
  if   [ -d "$HOME/.agents/skills" ]; then DEST_DIR="$HOME/.agents/skills"
  elif [ -d "$HOME/.claude/skills" ]; then DEST_DIR="$HOME/.claude/skills"
  else DEST_DIR="$HOME/.claude/skills"
  fi
fi
mkdir -p "$DEST_DIR"

DEST="$DEST_DIR/$SKILL_NAME"

if [ -e "$DEST" ] || [ -L "$DEST" ]; then
  if [ "$FORCE" -eq 1 ]; then
    rm -rf "$DEST"
  else
    echo "Already installed at $DEST"
    echo "Re-run with --force to overwrite."
    exit 0
  fi
fi

if [ "$MODE" = "copy" ]; then
  cp -RL "$SRC" "$DEST"
  echo "Copied $SKILL_NAME -> $DEST"
else
  ln -s "$SRC" "$DEST"
  echo "Linked $SKILL_NAME -> $DEST  (-> $SRC)"
fi

echo "Done. Run /init-brain in any project to bootstrap its brain."
