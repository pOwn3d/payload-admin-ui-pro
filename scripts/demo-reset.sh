#!/bin/bash
# Demo reset script — resets the database and re-seeds for a clean demo
# Usage: cron 0 0 * * * /path/to/demo-reset.sh
# Expects DEMO_DIR to be set to the demo project directory

set -e

DEMO_DIR="${DEMO_DIR:-/Users/pown3d/Downloads/my-project}"
DB_FILE="$DEMO_DIR/demo.db"

echo "$(date) — Starting demo reset..."

# 1. Stop the running server (if using PM2)
# pm2 stop demo 2>/dev/null || true

# 2. Remove the database
if [ -f "$DB_FILE" ]; then
  rm -f "$DB_FILE"
  echo "  Removed database"
fi

# Also check for data/*.db
find "$DEMO_DIR" -name "*.db" -not -path "*/node_modules/*" -exec rm -f {} \;
echo "  Cleaned all .db files"

# 3. Re-seed via Payload API
cd "$DEMO_DIR"

# Start temp server for seeding
export NODE_ENV=development
pnpm dev &
SERVER_PID=$!

# Wait for server to be ready
echo "  Waiting for server..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/users 2>/dev/null | grep -q "200\|401"; then
    break
  fi
  sleep 2
done

# Trigger seed
echo "  Triggering seed..."
curl -s http://localhost:3000/next/seed > /dev/null 2>&1

# Create demo admin account
echo "  Creating demo admin..."
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@admin.com","password":"demo1234","name":"Demo Admin"}' \
  > /dev/null 2>&1

# Stop temp server
kill $SERVER_PID 2>/dev/null || true

# 4. Restart production server
# pm2 restart demo 2>/dev/null || true

echo "$(date) — Demo reset complete"
