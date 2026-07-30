#!/usr/bin/env bash
# Smoke-test Google Play API credentials (Fastlane).
# Usage: from repo root or android/
#   ./android/scripts/play-auth-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEY="${PLAY_STORE_JSON_KEY:-$ROOT/secrets/play-store-service-account.json}"
if [[ ! -f "$KEY" ]]; then
  echo "Missing $KEY" >&2
  echo "Copy your Play service-account JSON there (gitignored)." >&2
  exit 1
fi

export PLAY_STORE_JSON_KEY="$KEY"
export PLAY_PACKAGE_NAME="${PLAY_PACKAGE_NAME:-net.busyproxy.app}"

if ! command -v fastlane >/dev/null 2>&1; then
  echo "fastlane not found. Install: brew install fastlane" >&2
  exit 1
fi

echo "→ play_whoami"
fastlane play_whoami
echo "→ play_auth"
fastlane play_auth
echo "→ play_tracks"
fastlane play_tracks || true
echo "✓ Play credential smoke finished"
