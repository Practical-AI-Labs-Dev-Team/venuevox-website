#!/usr/bin/env bash
# Vercel build step: inject VAPI_PUBLIC_KEY into script.js at deploy time.
# If the env var isn't set the placeholder stays and the live demo
# gracefully shows a "not configured" fallback instead of breaking.
set -e

if [ -n "$VAPI_PUBLIC_KEY" ]; then
  sed -i "s|VAPI_PUBLIC_KEY_PLACEHOLDER|$VAPI_PUBLIC_KEY|g" script.js
  echo "Vapi public key injected into script.js"
else
  echo "VAPI_PUBLIC_KEY not set — live demo will show fallback message."
fi
