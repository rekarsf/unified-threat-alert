#!/bin/bash
# Run from anywhere: bash /path/to/repo/deploy/start.sh
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

pm2 delete uta-api 2>/dev/null || true

SOC_DATA_FILE="$REPO_DIR/deploy/soc-auth-data.json" \
PORT=8080 \
pm2 start node \
  --name uta-api \
  -- --enable-source-maps "$REPO_DIR/deploy/api/index.mjs"

pm2 save
echo ""
echo "API server started on port 8080."
echo "Logs: pm2 logs uta-api"
