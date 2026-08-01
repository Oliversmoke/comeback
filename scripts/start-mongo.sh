#!/bin/bash
# Start the persistent MongoDB container used by the StakeMind server.
#
# Runs MongoDB 7 in Docker with a named volume (stakemind-mongo-data) so all
# data survives container and server restarts. The server reads the connection
# string from server/.env (MONGODB_URI=mongodb://127.0.0.1:27017/stakemind).
#
# Usage:  ./scripts/start-mongo.sh
set -e

CONTAINER_NAME=stakemind-mongo
VOLUME_NAME=stakemind-mongo-data
PORT=27017

# Fail fast if the port is already taken by something that isn't our container.
# NOTE: the 1g memory cap + 0.5g WiredTiger cache is DELIBERATE — this dev box
# only has ~1.7Gi available. Don't bump it without checking free memory.
if ss -tln 2>/dev/null | grep -Eq "[:.]$PORT "; then
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "✅ '$CONTAINER_NAME' is already running on port $PORT."
    exit 0
  fi
  echo "❌ Port $PORT is already in use by another process. Free it or change PORT in $0." >&2
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "ℹ️  Found existing container '$CONTAINER_NAME' — starting it. Verify its config matches"
  echo "   this script (volume: $VOLUME_NAME, port: $PORT) with: docker inspect $CONTAINER_NAME"
  docker start "$CONTAINER_NAME" >/dev/null
else
  echo "🚀 Creating '$CONTAINER_NAME' (MongoDB 7, persistent volume '$VOLUME_NAME')..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$PORT:27017" \
    -v "$VOLUME_NAME:/data/db" \
    --memory 1g \
    mongo:7 \
    --wiredTigerCacheSizeGB 0.5 >/dev/null
fi

echo "⏳ Waiting for mongod to accept connections on 127.0.0.1:$PORT..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" mongosh --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; then
    echo "✅ MongoDB ready (after ~${i}s). URI: mongodb://127.0.0.1:$PORT/stakemind"
    exit 0
  fi
  sleep 1
done

echo "❌ MongoDB did not become ready in time. Check: docker logs $CONTAINER_NAME" >&2
exit 1
