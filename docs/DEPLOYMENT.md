# CampusHub — Production Deployment & Infrastructure Runbook

## 1. Overview
CampusHub is architected for modern decoupled deployment:
- **Frontend**: Next.js 16 (Turbopack) hosted on **Vercel** or containerized via Docker.
- **Backend API & WebSockets**: Django 5.1 + Channels 4.3 running ASGI on **Daphne**, hosted on **Railway**, **Render**, or **AWS ECS / DigitalOcean App Platform**.
- **Database**: Managed **PostgreSQL 16**.
- **Cache & Channel Layer**: Managed **Redis 7** (Upstash, AWS ElastiCache, or Railway Redis).

---

## 2. Docker Compose Deployment (Local / Self-Hosted VPS)

To launch the full four-container production stack (Postgres + Redis + Daphne Backend + Next.js Frontend):

```bash
# 1. Clone repository
git clone https://github.com/your-org/campushub.git
cd campushub

# 2. Configure production environment
cp backend/.env.example backend/.env
# Edit backend/.env with your production SECRET_KEY and ALLOWED_HOSTS

# 3. Build and spin up containers in background
docker compose up -d --build

# 4. Run database migrations and seed demo data
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_demo

# 5. Verify service health
docker compose ps
curl http://localhost:8000/api/health/
```

---

## 3. Platform Cloud Deployment

### 3.1 Backend Deployment on Railway
1. **Create Railway Project**: Select **New Project** → **Deploy from GitHub repo**.
2. **Add Managed PostgreSQL**: Add database service; copy `DATABASE_URL`.
3. **Add Managed Redis**: Add Redis service; copy `REDIS_URL`.
4. **Set Environment Variables**:
   ```env
   DEBUG=False
   SECRET_KEY=<generated-64-character-random-key>
   ALLOWED_HOSTS=.railway.app,campushub.edu
   CSRF_TRUSTED_ORIGINS=https://campushub.vercel.app,https://*.railway.app
   CORS_ALLOWED_ORIGINS=https://campushub.vercel.app
   USE_REDIS_CHANNEL_LAYER=True
   REDIS_URL=${{Redis.REDIS_URL}}
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
5. **Start Command**:
   ```bash
   python manage.py migrate && daphne -b 0.0.0.0 -p $PORT campushub.asgi:application
   ```

### 3.2 Frontend Deployment on Vercel
1. **Import Repository**: Connect GitHub repo in Vercel dashboard. Root directory: `./frontend`.
2. **Framework Preset**: Next.js.
3. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
   ```
4. **Deploy**: Automatic build and CDN edge distribution.

---

## 4. Pre-Flight Production Verification Checklist

- [x] `DEBUG=False` strictly enforced in production.
- [x] Security headers active (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- [x] HSTS enabled with secure cookies over HTTPS.
- [x] Daphne ASGI handling HTTP and WebSocket routes seamlessly.
- [x] Database migrations up to date (`python manage.py makemigrations --check`).
- [x] Health probe responding `200 OK` with `"status": "healthy"`.
- [x] CORS and CSRF trusted origins restricted strictly to client domain.
