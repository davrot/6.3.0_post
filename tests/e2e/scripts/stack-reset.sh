#!/usr/bin/env bash
# stack-reset.sh — WIPE all test-stack state (DB + data dirs + secrets) and
# bring a pristine stack up again. Use between CI runs / after schema drift.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env.test ]; then
  docker compose -f docker-compose.test.yml --env-file .env.test --project-name ol-e2e down --volumes --timeout 20 --remove-orphans
fi
rm -f .env.test
bash scripts/stack-up.sh
