#!/bin/bash
# StakeMind full-stack boot: MongoDB + API server + Next.js client, in one command.
#
#   ./scripts/start-stack.sh
#   npm run dev:stack
#
# Idempotent: any component already running (Mongo on :27017, server on :5000,
# client on :3000) is left untouched and only the missing pieces are started.
# Server and client run in the foreground — Ctrl+C stops them together.
#
# Requires root node_modules (npm install) and Docker for MongoDB
# (see scripts/start-mongo.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d "$ROOT/node_modules/.bin" ]; then
  echo "❌ Root node_modules not found. Run: npm install" >&2
  exit 1
fi

# Anchored pattern (same as start-mongo.sh) so ":27017 " can't false-match
# a longer port like :127017.
port_open() {
  ss -tln 2>/dev/null | grep -Eq "[:.]$1 "
}

# Give a freshly-started / still-booting service a few seconds to come up
# before concluding it isn't running — avoids a duplicate-boot EADDRINUSE on
# :5000 (nodemon) and :3000 (first `next dev` compile can take 10s+).
service_up() {
  local url="$1" timeout="$2"
  for _ in 1 2 3 4 5; do
    if curl -sf -m "$timeout" -o /dev/null "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

echo "🚀 StakeMind full-stack boot"
echo "============================"

# 1) MongoDB (port 27017)
if port_open 27017; then
  echo "✅ MongoDB already running on :27017"
else
  echo "📦 Starting MongoDB via Docker..."
  bash "$ROOT/scripts/start-mongo.sh"
fi

# 2) Build the list of services that still need to start
CMDS=()
if service_up http://localhost:5000/health 2; then
  echo "✅ API server already running on :5000"
else
  echo "🚀 Will start API server on :5000 (nodemon, hot reload)"
  CMDS+=("npm run dev --prefix server")
fi

if service_up http://localhost:3000/ 3; then
  echo "✅ Client already running on :3000"
else
  echo "🚀 Will start client on :3000 (next dev)"
  CMDS+=("npm run dev --prefix client")
fi

if [ "${#CMDS[@]}" -eq 0 ]; then
  echo ""
  echo "🎉 Everything is already running: Mongo :27017, API :5000, Client :3000"
  exit 0
fi

echo ""
echo "▶️  Starting services (Ctrl+C to stop)..."

# Prefer the repo's installed concurrently; fall back to npx (array form so
# the fallback is tokenized correctly instead of exec'd as one argv string).
if [ -x "$ROOT/node_modules/.bin/concurrently" ]; then
  CONCURRENTLY=("$ROOT/node_modules/.bin/concurrently")
else
  CONCURRENTLY=(npx -y concurrently)
fi

"${CONCURRENTLY[@]}" -n SERVER,CLIENT -c blue,green "${CMDS[@]}" &
CPID=$!
trap 'echo; echo "🛑 Stopping services..."; kill "$CPID" 2>/dev/null; exit 0' INT TERM
wait "$CPID"
