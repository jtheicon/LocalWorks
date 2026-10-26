#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="/var/www/localworks"

cd "$APP_ROOT"
git fetch origin
git checkout main
git pull --ff-only origin main

cd "$APP_ROOT/backend"
npm ci --no-audit --no-fund --maxsockets=1
npm run build

cd "$APP_ROOT/frontend"
npm ci --no-audit --no-fund --maxsockets=1
unset VITE_API_URL
npm run build
test -s dist/index.html

cd "$APP_ROOT/backend"
if pm2 describe localworks-api >/dev/null 2>&1; then
  pm2 delete localworks-api
fi
pm2 start npm --name localworks-api -- run start:prod
pm2 save

if ! curl --fail --silent --retry 15 --retry-connrefused --retry-delay 2 \
  -o /dev/null http://127.0.0.1:8920/api/application-health; then
  echo "API did not become healthy on port 8920. Recent PM2 logs:" >&2
  pm2 logs localworks-api --lines 50 --nostream >&2
  exit 1
fi

sudo nginx -t
curl --fail --silent --show-error \
  -o /dev/null http://127.0.0.1/api/application-health

sudo rsync -a --delete "$APP_ROOT/frontend/dist/" "$SITE_ROOT/"
sudo systemctl reload nginx

curl --fail --silent --show-error \
  -o /dev/null -w 'Website: %{http_code}\n' http://127.0.0.1/
curl --fail --silent --show-error \
  -o /dev/null -w 'API via Nginx: %{http_code}\n' \
  http://127.0.0.1/api/application-health
