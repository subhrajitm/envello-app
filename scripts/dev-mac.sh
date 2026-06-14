#!/usr/bin/env bash
# macOS dev launcher — builds the Rust binary, wraps it in a signed .app
# bundle so TCC grants microphone/speech-recognition permissions, then opens it.
#
# Usage: npm run dev:mac
#
# The Angular dev server must be running (npm run dev / nx serve desktop).
# This script only handles the Tauri/Rust side.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$ROOT/src-tauri"
APP_DIR="/tmp/Envello.app"
BINARY="$TAURI_DIR/target/debug/envello"

echo "▶ Building Rust binary..."
(cd "$TAURI_DIR" && cargo build 2>&1)

echo "▶ Assembling .app bundle..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
cp "$BINARY" "$APP_DIR/Contents/MacOS/envello"

# Build Info.plist with required TCC usage description keys
python3 - "$TAURI_DIR/Info.plist" <<'EOF'
import plistlib, sys
base = {}
try:
    with open(sys.argv[1], "rb") as f:
        base = plistlib.load(f)
except Exception:
    pass

bundle = {
    "CFBundleIdentifier": "com.envello.app",
    "CFBundleName": "Envello",
    "CFBundleExecutable": "envello",
    "CFBundlePackageType": "APPL",
    "CFBundleVersion": base.get("CFBundleVersion", "0.1.0"),
    "NSMicrophoneUsageDescription": base.get(
        "NSMicrophoneUsageDescription",
        "Envello uses the microphone for voice input and speech recognition.",
    ),
    "NSSpeechRecognitionUsageDescription": base.get(
        "NSSpeechRecognitionUsageDescription",
        "Envello uses speech recognition to convert your voice into text while dictating notes and tasks.",
    ),
}
with open("/tmp/Envello.app/Contents/Info.plist", "wb") as f:
    plistlib.dump(bundle, f)
print("  Info.plist written")
EOF

echo "▶ Signing bundle with entitlements..."
codesign -s - \
  --entitlements "$TAURI_DIR/entitlements.plist" \
  --force \
  --options runtime \
  --deep \
  "$APP_DIR"

echo "▶ Launching Envello.app..."
open "$APP_DIR"

echo "✓ Done. App launched. Ctrl+hold in the window to activate voice input."
