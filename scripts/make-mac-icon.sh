#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_ICON="$ROOT_DIR/stamps/Chew.png"
BUILD_DIR="$ROOT_DIR/build"
PNG_DIR="$BUILD_DIR/icon-pngs"
TARGET_ICNS="$BUILD_DIR/icon.icns"
TARGET_ICO="$BUILD_DIR/icon.ico"
TARGET_PNG="$BUILD_DIR/icon.png"
MASTER_ICON="$BUILD_DIR/icon-master.png"
ICON_GEN_BIN="$ROOT_DIR/node_modules/.bin/icon-gen"

if [[ ! -f "$SOURCE_ICON" ]]; then
  echo "Missing source icon: $SOURCE_ICON" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"
rm -rf "$PNG_DIR"
rm -rf "$BUILD_DIR/icon.iconset"
mkdir -p "$PNG_DIR"

sips -z 1024 1024 "$SOURCE_ICON" --out "$MASTER_ICON" >/dev/null
cp "$MASTER_ICON" "$TARGET_PNG"

if [[ ! -x "$ICON_GEN_BIN" ]]; then
  echo "Missing icon-gen binary: $ICON_GEN_BIN" >&2
  exit 1
fi

sips -z 16 16 "$MASTER_ICON" --out "$PNG_DIR/16.png" >/dev/null
sips -z 24 24 "$MASTER_ICON" --out "$PNG_DIR/24.png" >/dev/null
sips -z 32 32 "$MASTER_ICON" --out "$PNG_DIR/32.png" >/dev/null
sips -z 48 48 "$MASTER_ICON" --out "$PNG_DIR/48.png" >/dev/null
sips -z 64 64 "$MASTER_ICON" --out "$PNG_DIR/64.png" >/dev/null
sips -z 128 128 "$MASTER_ICON" --out "$PNG_DIR/128.png" >/dev/null
sips -z 192 192 "$MASTER_ICON" --out "$PNG_DIR/192.png" >/dev/null
sips -z 256 256 "$MASTER_ICON" --out "$PNG_DIR/256.png" >/dev/null
sips -z 512 512 "$MASTER_ICON" --out "$PNG_DIR/512.png" >/dev/null
cp "$MASTER_ICON" "$PNG_DIR/1024.png"

"$ICON_GEN_BIN" \
  --input "$PNG_DIR" \
  --output "$BUILD_DIR" \
  --ico \
  --ico-name icon \
  --icns \
  --icns-name icon

echo "Created $TARGET_ICNS"
echo "Created $TARGET_ICO"
