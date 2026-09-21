# CampusHub — Production Deployment & Infrastructure Runbook

**Deployment Date**: September 21, 2026  
**Repository**: [https://github.com/yashhh-max/campushub](https://github.com/yashhh-max/campushub)  
**Status**: Ready for Cloud Linking (GitHub Repository Live; Local Production Validation 100% Passed)

---

## 1. Overview & Target Architecture
CampusHub is architected for modern decoupled production deployment:
- **Frontend**: Next.js 16 (Turbopack) hosted on **Vercel** or containerized via Docker.
- **Backend API & WebSockets**: Django 5.1 + Channels 4.3 running ASGI on **Daphne**, hosted on **Railway**, **Render**, or **AWS ECS**.
- **Database**: Managed **PostgreSQL 16**.
- **Cache & Channel Layer**: Managed **Redis 7** (Upstash, AWS ElastiCache, or Railway Redis).

```
[Client Browsers / Mobile Viewports]
                 │
      ┌──────────┴──────────┐
      │ (HTTPS / WSS)       │
      ▼                     ▼
[Vercel CDN Edge]     [Railway / Cloud PaaS]
(Next.js 16 App)      (Daphne ASGI Gateway)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      [Managed Postgres 16]        [Managed Redis 7]
      (Row-Level Locks)            (Channel Layer & Cache)
```

---

## 2. Platform Cloud Deployment

The repository is published on GitHub at `https://github.com/yashhh-max/campushub`.

### 2.1 Backend Deployment on Render + Neon + Upstash/Render Key Value
1. **Database (Neon PostgreSQL)**:
   - Create project on [Neon Console](https://console.neon.tech).
   - Copy connection string: `postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require`.
2. **Redis Cache & Channels (Upstash Redis or Render Key Value)**:
   - Create database on [Upstash Console](https://console.upstash.com) or Render Key Value.
   - Copy Redis TLS connection string: `rediss://default:<password>@<endpoint>.upstash.io:6379`.
3. **Render Web Service**:
   - Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service** (or use the included `render.yaml` Blueprint).
   - Connect repository `https://github.com/yashhh-max/campushub`.
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python manage.py migrate && python manage.py seed_demo && daphne -b 0.0.0.0 -p $PORT campushub.asgi:application`
   - **Environment Variables**:
     ```env
     DEBUG=False
     SECRET_KEY=<generate-secure-random-64-char-string>
     ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
     CORS_ALLOWED_ORIGINS=https://frontend-psi-roan-84.vercel.app
     CSRF_TRUSTED_ORIGINS=https://frontend-psi-roan-84.vercel.app,https://*.onrender.com
     USE_REDIS_CHANNEL_LAYER=True
     DATABASE_URL=postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require
     REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379
     ALLOWED_STUDENT_EMAIL_DOMAINS=*
     ```

### 2.2 Backend Deployment on Railway (Legacy/Alternative)
1. **Create Project**: Go to [Railway.app](https://railway.app), select **New Project** → **Deploy from GitHub repo** → select `yashhh-max/campushub`.
2. **Set Root Directory**: Select `/backend` if prompted, or configure build context.
3. **Provision Managed PostgreSQL**: Click **+ New Service** → **Database** → **PostgreSQL**.
4. **Provision Managed Redis**: Click **+ New Service** → **Database** → **Redis**.
5. **Configure Production Environment Variables** in Railway service settings:
   ```env
   DEBUG=False
   SECRET_KEY=<generate-64-char-random-key>
   ALLOWED_HOSTS=.railway.app,your-domain.com
   CSRF_TRUSTED_ORIGINS=https://frontend-psi-roan-84.vercel.app,https://*.railway.app
   CORS_ALLOWED_ORIGINS=https://frontend-psi-roan-84.vercel.app
   USE_REDIS_CHANNEL_LAYER=True
   REDIS_URL=${{Redis.REDIS_URL}}
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
6. **Start Command**:
   ```bash
   python manage.py migrate && python manage.py seed_demo && daphne -b 0.0.0.0 -p $PORT campushub.asgi:application
   ```

### 2.2 Frontend Deployment on Vercel
1. **Import Repository**: Go to [Vercel Dashboard](https://vercel.com/new) → Import `yashhh-max/campushub`.
2. **Root Directory**: Select `frontend`.
3. **Framework Preset**: Next.js (detected automatically).
4. **Configure Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://<your-backend>.railway.app
   NEXT_PUBLIC_WS_URL=wss://<your-backend>.railway.app
   ```
5. **Deploy**: Builds using Next.js Turbopack compiler.

---

## 3. Docker Multi-Container Deployment (Local / VPS)

For self-hosted Linux VPS (Ubuntu, Debian) or local Docker Desktop environments:

```bash
# 1. Clone repository
git clone https://github.com/yashhh-max/campushub.git
cd campushub

# 2. Configure production environment
cp backend/.env.example backend/.env

# 3. Build and spin up containers in background
docker compose up -d --build

# 4. Run database migrations and seed demo data
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_demo

# 5. Verify service health
docker compose ps
curl http://localhost:8000/api/health/
```

| Service | Container | Internal Port | Host Port |
|---|---|---|---|
| `db` | `campushub_db` | 5432 | 5432 |
| `redis` | `campushub_redis` | 6379 | 6379 |
| `backend` | `campushub_backend` | 8000 | 8000 |
| `frontend` | `campushub_frontend` | 3000 | 3000 |

---

## 4. Pre-Flight Production Verification Status

| Check | Expected | Local Status | Cloud Status |
|---|---|---|---|
| **Django System Check** | 0 errors | Passed (0 issues) | Ready |
| **Database Migrations** | Clean | Passed (`No changes detected`) | Ready |
| **Backend Test Suite** | 100% pass | 77/77 Passed (`OK`) | Ready |
| **Frontend Lint** | 0 errors/warnings | Passed (`0 errors, 0 warnings`) | Ready |
| **Frontend Production Build** | 17/17 routes | Passed (Turbopack) | Ready |
| **Health Probe (`/api/health/`)** | `status: healthy` | Verified (`200 OK`) | Pending Cloud Link |
| **Ping Probe (`/api/health/ping/`)**| `status: pong` | Verified (`200 OK`) | Pending Cloud Link |
| **Security Headers** | Strict CSP, X-Frame | Implemented & Passed | Pending HTTPS Domain |
| **Docker Compose** | Config Valid | Configured in `docker-compose.yml` | Requires Docker Host |

---

## 5. Deployment Blockers & Resolution Actions

1. **Vercel Cloud Deployment**:
   - *Status*: Blocked by missing cloud credentials.
   - *Detail*: Vercel CLI reports unauthenticated (`VERCEL_TOKEN` not configured in environment).
   - *Resolution*: User can import `https://github.com/yashhh-max/campushub` directly via [Vercel](https://vercel.com/new) with one click.

2. **Railway Cloud Deployment**:
   - *Status*: Blocked by missing cloud credentials.
   - *Detail*: Railway CLI has no active login token in this environment.
   - *Resolution*: User can connect `https://github.com/yashhh-max/campushub` on [Railway](https://railway.app/new) and provision Postgres + Redis.

3. **Local Docker Execution**:
   - *Status*: Blocked by host environment limitations.
   - *Detail*: Docker CLI is not installed on the current Windows host (`docker: The term 'docker' is not recognized`).
   - *Resolution*: Requires installing Docker Desktop on Windows or running on a Linux VPS with Docker Engine.
