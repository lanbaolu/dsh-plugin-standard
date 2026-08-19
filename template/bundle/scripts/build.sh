#!/usr/bin/env bash
# Build: compile src/ → lib/. Uses local TypeScript from devDependencies.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -x "node_modules/.bin/tsc" ]; then
  TSC="node_modules/.bin/tsc"
elif command -v tsc >/dev/null 2>&1; then
  TSC="tsc"
else
  echo "build: tsc not found (run npm install first)" >&2
  exit 1
fi

echo "=== Compiling src → lib ==="
"$TSC" -p tsconfig.json
echo "=== Build complete ==="
echo "Next: node scripts/verify-plugin.mjs ."
