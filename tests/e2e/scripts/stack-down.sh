#!/usr/bin/env bash
# stack-down.sh — stop the disposable e2e stack (keeps volumes; see
# stack-reset.sh for a full wipe to a pristine DB).
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.test.yml --env-file .env.test --project-name ol-e2e down --timeout 20 --remove-orphans
echo "[stack] stopped (volumes kept: mongo-data, ol-data, gb-data)"
