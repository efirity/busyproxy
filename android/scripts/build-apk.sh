#!/usr/bin/env bash
# Build a sideload-ready BusyProxy debug APK and copy it to stable paths.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "JAVA_HOME not usable: $JAVA_HOME" >&2
  exit 1
fi
if [[ ! -d "$ANDROID_HOME" ]]; then
  echo "ANDROID_HOME missing: $ANDROID_HOME" >&2
  exit 1
fi

printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties

echo "→ assembleDebug"
./gradlew :app:assembleDebug --quiet

SRC="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$SRC" ]]; then
  echo "APK not found at $SRC" >&2
  exit 1
fi

VERSION="$(grep -E 'versionName\s*=' app/build.gradle.kts | head -1 | sed -E 's/.*"([^"]+)".*/\1/')"
STAMP="$(date +%Y%m%d)"
NAME="BusyProxy-${VERSION}-debug.apk"
STABLE="BusyProxy-latest-debug.apk"

OUT_REPO="$REPO/artifacts/apk"
OUT_LOCAL="$ROOT/dist"
mkdir -p "$OUT_REPO" "$OUT_LOCAL"

cp -f "$SRC" "$OUT_REPO/$NAME"
cp -f "$SRC" "$OUT_REPO/$STABLE"
cp -f "$SRC" "$OUT_REPO/BusyProxy-${VERSION}-${STAMP}-debug.apk"
cp -f "$SRC" "$OUT_LOCAL/$STABLE"
cp -f "$SRC" "$OUT_LOCAL/$NAME"

(
  cd "$OUT_REPO"
  shasum -a 256 "$STABLE" > "${STABLE}.sha256"
)

SIZE="$(du -h "$OUT_REPO/$STABLE" | awk '{print $1}')"
PKG="net.busyproxy.app.debug"

echo ""
echo "✓ APK ready ($SIZE)"
echo "  package:  $PKG"
echo "  version:  ${VERSION}-debug"
echo "  latest:   $OUT_REPO/$STABLE"
echo "  dated:    $OUT_REPO/$NAME"
echo "  local:    $OUT_LOCAL/$STABLE"
echo ""
echo "Install (USB debugging):"
echo "  adb install -r \"$OUT_REPO/$STABLE\""
echo "  adb shell am start -n ${PKG}/net.busyproxy.app.MainActivity"
echo ""
echo "Or copy the APK to any phone and open it (allow install from this source)."
