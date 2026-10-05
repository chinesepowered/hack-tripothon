#!/usr/bin/env bash
# Shrinks Tripo GLBs for the web: textures resized to 1024 and re-encoded as WebP
# (EXT_texture_webp, supported by three.js GLTFLoader). Geometry, skins and animations untouched.
# Usage: GLTF=path/to/gltf-transform scripts/optimize-assets.sh
set -euo pipefail
GLTF=${GLTF:-npx -y @gltf-transform/cli@4}
for f in public/assets/*.glb; do
  tmp="${f%.glb}.tmp.glb"
  $GLTF resize "$f" "$tmp" --width 1024 --height 1024 >/dev/null
  $GLTF webp "$tmp" "$tmp" --quality 90 >/dev/null
  before=$(stat -c %s "$f"); after=$(stat -c %s "$tmp")
  mv "$tmp" "$f"
  echo "$(basename "$f"): $((before / 1024)) KB -> $((after / 1024)) KB"
done
