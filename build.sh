#!/bin/bash
# Netlify build script - injects environment variables

# Create config.js with the API key from environment
if [ -n "$GROQ_API_KEY" ]; then
  echo "window.UMLAI_CONFIG = { GEMINI_API_KEY: '$GROQ_API_KEY' };" > public/js/config.js
  echo "✓ Groq API key injected into config.js"
else
  echo "window.UMLAI_CONFIG = { GEMINI_API_KEY: '' };" > public/js/config.js
  echo "⚠ No GROQ_API_KEY found in environment"
fi
