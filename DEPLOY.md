# Production deploy (GitHub → server)

## Who runs what

| Machine | Role |
|--------|------|
| **Your PC (Windows/macOS)** | Develop, commit, `git push` to GitHub. Uses `backend/.env` locally (not in git). |
| **Linux server (VPS)** | Pulls `main`, runs `bash ./deploy.sh`. Keeps its own `backend/.env` with production secrets. |

Pushing to GitHub updates **code only**. Each server keeps its own `.env` (MongoDB, JWT, Gmail, `GEMINI_API_KEY`, `SIGNUP_DOCUMENT_MAX_MB`, etc.).

## One-time server setup

1. Clone the repo (e.g. under `/home/you/LocalWorks`).
2. Copy env: `cp backend/.env.example backend/.env` and fill production values.
3. Set at minimum: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `APP_URL`, `CORS_ORIGINS`, `EMAIL_*`, `GEMINI_API_KEY`, `PORT=8920`.
4. Install Node.js LTS, `npm`, `pm2` (`npm i -g pm2`), nginx.
5. Point nginx at `/var/www/localworks` and proxy `/api/` to `127.0.0.1:8920` (see [frontend/README.md](frontend/README.md)). Include `proxy_read_timeout 120s;` under `/api/` for sign-up AI polling.
6. `sudo mkdir -p /var/www/localworks`

## Every release

On your dev machine:

```bash
git checkout main
git pull
git push origin main
```

On the **server** (from repo root):

```bash
bash ./deploy.sh
```

The script: pulls `main`, `npm ci` + build backend & frontend, restarts PM2 API, rsyncs frontend to `/var/www/localworks`, reloads nginx, runs health checks.

## After deploy

- Site: your public HTTPS URL  
- API health: `https://your-domain/api/application-health`  
- Sign-up upload limit (optional): `https://your-domain/api/auth/signup/upload-limits`

## Compatibility notes

- **Sign-up CV AI**: upload returns immediately; browser polls `/api/auth/signup/scan/:id` — no 60s nginx timeout on a single upload request (still set `proxy_read_timeout 120s` as backup).
- **Inactivity job**: runs automatically in **production** unless `ACCOUNT_CLEANUP=off`.
- **Upload size**: `SIGNUP_DOCUMENT_MAX_MB` in server `backend/.env` (default 5); restart API after changing.
