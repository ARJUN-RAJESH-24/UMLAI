#!/bin/bash
# Netlify build script - injects environment variables

# Create config.js with the API key from environment
if [ -n "$GEMINI_API_KEY" ]; then
  echo "window.UMLAI_CONFIG = { GEMINI_API_KEY: '$GEMINI_API_KEY' };" > public/js/config.js
  echo "✓ API key injected into config.js"
else
  echo "window.UMLAI_CONFIG = { GEMINI_API_KEY: '' };" > public/js/config.js
  echo "⚠ No GEMINI_API_KEY found in environment"
fi
