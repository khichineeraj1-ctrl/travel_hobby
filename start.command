#!/bin/bash
# Double-click me (macOS) to run bhatko locally.
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js isn't installed. Get the LTS version from https://nodejs.org, then double-click this again."
  read -r -p "Press Enter to close…"; exit 1
fi
if [ ! -d node_modules ]; then
  echo "First run — installing dependencies (takes a minute)…"
  npm install || { read -r -p "Install failed. Press Enter to close…"; exit 1; }
fi
echo ""
echo "  Site:   http://localhost:3030"
echo "  Admin:  http://localhost:3030/admin   (password is in .env.local)"
echo ""
( sleep 5; open "http://localhost:3030" ) &
npm run dev
