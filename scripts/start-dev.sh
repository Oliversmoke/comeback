#!/bin/bash
set -e

echo "🚀 comeback.ai Development Environment"
echo "======================================"

# Check for MongoDB
if command -v mongosh &> /dev/null; then
  echo "📦 MongoDB CLI found"
elif command -v mongod &> /dev/null; then
  echo "📦 MongoDB found"
else
  echo "⚠️  MongoDB not detected. The app will use an in-memory MongoDB fallback."
fi

# Install dependencies
echo "📦 Installing server dependencies..."
cd "$(dirname "$0")/../server" && npm install

echo "📦 Installing client dependencies..."
cd "$(dirname "$0")/../client" && npm install

# Start both services
echo ""
echo "✅ Starting development servers..."
echo "   Server: http://localhost:5000"
echo "   Client: http://localhost:3000"
echo ""

cd "$(dirname "$0")/.."
npx concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "cyan,green" \
  "cd server && npm run dev" \
  "cd client && npm run dev"
