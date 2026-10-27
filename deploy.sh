#!/usr/bin/env bash
# LocalWorks production deploy — run on the Linux server from the repository root:
#   bash ./deploy.sh
set -Eeuo pipefail

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="/var/www/localworks"
API_PORT=8920
PM2_NAME="localworks-api"

echo "==> LocalWorks deploy"
echo "    App root: $APP_ROOT"
echo "    Site root: $SITE_ROOT"
echo "    API port: $API_PORT (set PORT in backend/.env if different and adjust this script)"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd git
require_cmd node
require_cmd npm
require_cmd pm2
require_cmd curl
require_cmd rsync
require_cmd sudo

if [[ ! -f "$APP_ROOT/backend/.env" ]]; then
  echo "Missing $APP_ROOT/backend/.env on this server." >&2
  echo "Copy backend/.env.example to backend/.env and set production secrets (not committed to git)." >&2
  exit 1
fi

cd "$APP_ROOT"
echo "==> Git: fetch and pull origin/main"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Backend: install, compile"
cd "$APP_ROOT/backend"
mkdir -p uploads/resumes uploads/permits uploads/profile uploads/reports uploads/workerJobsCompleted
npm ci --no-audit --no-fund --maxsockets=1
npm run build

echo "==> Frontend: install, build (same-origin API — VITE_API_URL unset)"
cd "$APP_ROOT/frontend"
npm ci --no-audit --no-fund --maxsockets=1
unset VITE_API_URL
npm run build
test -s dist/index.html

echo "==> PM2: restart API"
cd "$APP_ROOT/backend"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 delete "$PM2_NAME"
fi
pm2 start npm --name "$PM2_NAME" --cwd "$APP_ROOT/backend" -- run start:prod
pm2 save

echo "==> Health: API on 127.0.0.1:${API_PORT}"
if ! curl --fail --silent --retry 15 --retry-connrefused --retry-delay 2 \
  -o /dev/null "http://127.0.0.1:${API_PORT}/api/application-health"; then
  echo "API did not become healthy. Recent PM2 logs:" >&2
  pm2 logs "$PM2_NAME" --lines 50 --nostream >&2
  exit 1
fi

echo "==> Smoke: sign-up upload limits (new deploys)"
curl --fail --silent --show-error \
  -o /dev/null "http://127.0.0.1:${API_PORT}/api/auth/signup/upload-limits"

echo "==> Frontend: publish to ${SITE_ROOT}"
sudo mkdir -p "$SITE_ROOT"
sudo rsync -a --delete "$APP_ROOT/frontend/dist/" "$SITE_ROOT/"

echo "==> Nginx: test and reload"
sudo nginx -t
curl --fail --silent --show-error \
  -o /dev/null "http://127.0.0.1/api/application-health"

sudo systemctl reload nginx

echo "==> Public checks (via nginx)"
curl --fail --silent --show-error \
  -o /dev/null -w 'Website: %{http_code}\n' http://127.0.0.1/
curl --fail --silent --show-error \
  -o /dev/null -w 'API via Nginx: %{http_code}\n' \
  http://127.0.0.1/api/application-health

echo ""
echo "Deploy finished successfully."
echo "Reminder: backend/.env on this server is not updated by git — add new keys from backend/.env.example when needed, then re-run this script."
