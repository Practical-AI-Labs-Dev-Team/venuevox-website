#!/usr/bin/env bash
# Vercel build step for the static site. It prepares a clean public output
# directory and injects VAPI_PUBLIC_KEY into the deployed homepage script.
set -euo pipefail

rm -rf dist
mkdir -p dist

cp index.html styles.css script.js favicon.svg dist/
cp -R audio concierge-demo dist/

if [ -n "${VAPI_PUBLIC_KEY:-}" ]; then
  sed -i "s|VAPI_PUBLIC_KEY_PLACEHOLDER|${VAPI_PUBLIC_KEY}|g" dist/script.js
  echo "Vapi public key injected into script.js"
else
  echo "VAPI_PUBLIC_KEY not set — live demo will show fallback message."
fi
