#!/usr/bin/env bash
set -euo pipefail

# Builds an unsigned Release .ipa (MoneyManager-SideStore.ipa) ready to import into SideStore.
# SideStore signs the .ipa directly on your iPhone using your free Personal Apple ID
# and automatically refreshes the 7-day certificate over Wi-Fi.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/app"
BUILD_DIR="$APP_DIR/ios/build-sidestore"
OUT_IPA="$ROOT_DIR/MoneyManager-SideStore.ipa"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: Building the iOS .ipa requires macOS with Xcode installed."
  echo "Run this script on your Mac ('npm run build:ipa'), or push to GitHub to run the included GitHub Actions macOS workflow (.github/workflows/build-ios-ipa.yml)."
  exit 1
fi

echo "==> 1/4: Embedding production Web UI into iPhone LAN server..."
cd "$ROOT_DIR"
npm run build:web-embed

echo "==> 2/4: Generating native iOS project (expo prebuild)..."
cd "$APP_DIR"
CI=1 npx expo prebuild --platform ios

WORKSPACE="$(ls -d "$APP_DIR"/ios/*.xcworkspace | head -n 1)"
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"

echo "==> 3/4: Compiling Release iOS app ($SCHEME) without Xcode code signing (SideStore signs on device)..."
rm -rf "$BUILD_DIR"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath "$BUILD_DIR" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  AD_HOC_CODE_SIGNING_ALLOWED=YES \
  build

APP_BUNDLE="$(find "$BUILD_DIR/Build/Products/Release-iphoneos" -maxdepth 1 -name "*.app" | head -n 1)"
if [[ -z "$APP_BUNDLE" || ! -d "$APP_BUNDLE" ]]; then
  echo "Error: Could not find compiled .app bundle."
  exit 1
fi

echo "==> 4/4: Packaging $APP_BUNDLE into $OUT_IPA..."
rm -rf "$BUILD_DIR/Payload" "$OUT_IPA"
mkdir -p "$BUILD_DIR/Payload"
cp -R "$APP_BUNDLE" "$BUILD_DIR/Payload/"
(
  cd "$BUILD_DIR"
  zip -qry "$OUT_IPA" Payload
)

echo ""
echo "✅ Success! Created SideStore-ready IPA at:"
echo "   $OUT_IPA"
echo ""
echo "Next step: AirDrop or save MoneyManager-SideStore.ipa to the Files app on your iPhone, then open SideStore -> My Apps -> (+) to install it."
