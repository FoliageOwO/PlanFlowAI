#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"
JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
SDK_BUILD_TOOLS="$HOME/Library/Android/sdk/build-tools/37.0.0"

export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

KEYSTORE_PROPS="$ANDROID_DIR/signing/keystore.properties"
KEYSTORE_FILE="$ANDROID_DIR/signing/planflowai-release.jks"

if [[ ! -f "$KEYSTORE_PROPS" || ! -f "$KEYSTORE_FILE" ]]; then
  echo "Missing Android signing files under frontend/android/signing." >&2
  exit 1
fi

cd "$FRONTEND_DIR"

VITE_API_BASE="${VITE_API_BASE:-https://planflowai.xyz/api}" \
VITE_WS_BASE="${VITE_WS_BASE:-wss://planflowai.xyz}" \
npm run build

npx cap sync android

cd "$ANDROID_DIR"
"$JAVA_HOME/bin/java" -version >/dev/null
./gradlew assembleRelease

ZIPALIGN="$SDK_BUILD_TOOLS/zipalign"
APKSIGNER="$SDK_BUILD_TOOLS/apksigner"
UNSIGNED="app/build/outputs/apk/release/app-release-unsigned.apk"
ALIGNED="app/build/outputs/apk/release/planflowai-release-aligned.apk"
SIGNED="app/build/outputs/apk/release/planflowai-release-signed.apk"

rm -f "$ALIGNED" "$SIGNED"
"$ZIPALIGN" -p -f 4 "$UNSIGNED" "$ALIGNED"

STORE_PASS="$(sed -n 's/^storePassword=//p' "$KEYSTORE_PROPS")"
KEY_PASS="$(sed -n 's/^keyPassword=//p' "$KEYSTORE_PROPS")"

"$APKSIGNER" sign \
  --ks "$KEYSTORE_FILE" \
  --ks-key-alias planflowai \
  --ks-pass "pass:$STORE_PASS" \
  --key-pass "pass:$KEY_PASS" \
  --out "$SIGNED" \
  "$ALIGNED"

"$APKSIGNER" verify --verbose "$SIGNED"

echo
echo "Signed APK:"
echo "$ANDROID_DIR/$SIGNED"
