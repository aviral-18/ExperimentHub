# Deployment & Setup

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # optional — sane defaults exist
uvicorn app.main:app --reload --port 8010
```

On first boot with an empty database the app auto-creates tables and seeds a demo
workspace (`demo@experimentos.io` / `demo1234`). To (re)seed manually:

```bash
python -m app.seed
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, proxies /api → :8010
```

Point at a different backend port:

```bash
VITE_API_TARGET=http://127.0.0.1:8000 npm run dev
```

---

## Configuration (`backend/.env`)

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./experimentos.db` | Postgres: `postgresql+psycopg://user:pass@host:5432/db` |
| `SECRET_KEY` | dev placeholder | **Set a strong secret in production** (`python -c "import secrets;print(secrets.token_hex(32))"`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT lifetime |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |
| `ANTHROPIC_API_KEY` | _(empty)_ | If set, the AI analyst uses Claude to polish prose; otherwise the deterministic engine is used |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Model id for the optional LLM path |

---

## Switching to PostgreSQL

```bash
# 1. Create a database, then:
export DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/experimentos"
pip install "psycopg[binary]"        # add the driver
uvicorn app.main:app --port 8010     # tables auto-create; seed runs on empty DB
```

No model changes are needed — the SQLAlchemy schema is database-agnostic.

---

## Production build

**Frontend** (static bundle):

```bash
cd frontend
npm run build            # → dist/
npm run preview          # serve the build locally
```

Serve `frontend/dist/` from any static host / CDN and route `/api/*` to the
backend (reverse proxy). Example nginx:

```nginx
location / {
    root /var/www/experimentos/dist;
    try_files $uri /index.html;         # SPA fallback
}
location /api/ {
    proxy_pass http://127.0.0.1:8010;
    proxy_set_header Host $host;
}
```

**Backend** (production server):

```bash
pip install gunicorn
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8010
```

---

## Docker (reference)

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn","app.main:app","-k","uvicorn.workers.UvicornWorker","-w","4","-b","0.0.0.0:8010"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# add the nginx config above
```

---

## Production checklist

- [ ] Strong `SECRET_KEY`
- [ ] `DATABASE_URL` → managed PostgreSQL; run behind connection pooling
- [ ] Restrict `CORS_ORIGINS` to your real frontend origin
- [ ] Serve over HTTPS; store the JWT in a secure context
- [ ] Add Alembic migrations before schema changes in production
- [ ] Put the run endpoint behind a job queue if simulating very large populations
