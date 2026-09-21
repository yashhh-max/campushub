# CampusHub — Live Production Deployment & Smoke Test Report

**Execution Timestamp**: September 21, 2026  
**Auditor**: CampusHub Autonomous DevOps & QA Engine  
**GitHub Repository**: [https://github.com/yashhh-max/campushub](https://github.com/yashhh-max/campushub) (Branch: `master`, Commit: `8ab83f1`)  
**Deployment Tooling**: Vercel CLI (v59.23.2), Railway CLI (v5.58.0), Playwright Headless Browser

---

## 1. Verified Cloud Production URLs

- **Frontend Production URL**: [**https://frontend-psi-roan-84.vercel.app**](https://frontend-psi-roan-84.vercel.app)
  - **Platform**: Vercel Edge Network (`bom1` edge node)
  - **Deployment ID**: `dpl_4sVsk16QJnCtvMdgcQ3XZJ4qLnex`
  - **HTTP Status**: `HTTP/1.1 200 OK`
  - **SSL/TLS**: Valid HTTPS (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`)
  - **Renderer**: Next.js 16.3.5 Turbopack Static Prerender + React 19
- **Backend Production URL**: *Not Deployed (Blocked by Railway trial expiration)*
- **Local Tested Backend**: `http://localhost:8000` (HTTP 200 OK, SQLite development mode)

---

## 2. Infrastructure & Service Status

| Service Component | Target Provider | Verification Status | Actual Detected State / Error |
|---|---|---|---|
| **Source Code & CI/CD** | GitHub | **LIVE (100%)** | Synced at `https://github.com/yashhh-max/campushub`. |
| **Frontend CDN** | Vercel | **LIVE (100%)** | Serving production bundle at `https://frontend-psi-roan-84.vercel.app`. |
| **Backend ASGI** | Railway | **BLOCKED** | CLI Error: `Your trial has expired. Please select a plan to continue using Railway.` |
| **Database** | Managed PostgreSQL 16 | **BLOCKED** | Provisioning blocked on Railway due to trial status; local uses SQLite. |
| **Channel Layer / Cache** | Managed Redis 7 / Valkey | **BLOCKED** | Redis provisioning blocked on Railway; local uses `InMemoryChannelLayer`. |
| **WebSockets (WSS)** | Daphne ASGI | **BLOCKED** | Blocked pending live backend deployment. |

---

## 3. Live Playwright Browser Audit (Executed against `https://frontend-psi-roan-84.vercel.app`)

### 3.1 Desktop Layout (1440x900)
- **Status**: **PASSED**
- **Verified Elements**:
  - Full navigation bar with brand icon and links (`Events`, `Clubs`, `Tickets`, `Dashboard`, `Announcements`).
  - Hero banner: *"Your Campus. Your Community. All in One Hub."*
  - CTA action buttons: `Explore Events`, `Browse Clubs`, `Demo Login`.
  - Academic stats strip: 14,800+ Active Students, 120+ Registered Clubs, 250+ Events Hosted.
  - Architecture badge pills: Next.js 16, Django 5.1, Daphne, Redis 7, PostgreSQL, Vector QR.

### 3.2 Tablet Layout (768x1024)
- **Status**: **PASSED**
- **Verified Elements**:
  - 2x2 responsive statistics grid.
  - Adaptive hero padding and full touch target sizing.
  - Zero horizontal overflow.

### 3.3 Mobile Layout (375x812 & 390x844)
- **Status**: **PASSED**
- **Verified Elements**:
  - Compact header with collapsible hamburger navigation menu.
  - Vertically stacked CTAs.
  - Clean responsive typography.

### 3.4 Direct URL Navigation & Sub-Pages
- `/login`: **Rendered Cleanly** (Sign In form, email field, JWT action button, demo credentials helper).
- `/events`: **Rendered Cleanly** (Filter pills: Tech, Career, Arts, Social, Academic, Sports). Correctly surfaces a graceful error banner (`Failed to fetch`) when backend API is unreachable.

---

## 4. Cloud Backend Deployment Blocker Detail

When attempting to initialize the backend and provision managed services via Railway CLI:
1. `npx @railway/cli init --name campushub`:
   ```text
   Your trial has expired. Please select a plan to continue using Railway.
   ```
2. `npx @railway/cli add --database postgres`:
   ```text
   Failed to add PostgreSQL: Your trial has expired. Please select a plan to continue using Railway.
   ```

Because Railway's free trial period for your account has lapsed, Railway requires selecting a plan (such as Railway Hobby $5/mo or adding billing credits) before it permits provisioning new services or databases through its API/CLI.

---

## 5. Next Steps to Complete 100% Full-Stack Production

1. **Activate Railway or Alternative Backend**:
   - Go to [railway.app/pricing](https://railway.app/pricing) to activate a plan, OR
   - Deploy `yashhh-max/campushub` on [Render](https://render.com) (free PostgreSQL + Web Service) or [Fly.io](https://fly.io).
2. **Wire Environment Variables in Vercel**:
   - Once your backend is live (e.g. `https://campushub-api.up.railway.app`), open [Vercel Dashboard](https://vercel.com/yashhh-maxs-projects/frontend/settings/environment-variables).
   - Set:
     - `NEXT_PUBLIC_API_URL` = `https://campushub-api.up.railway.app`
     - `NEXT_PUBLIC_WS_URL` = `wss://campushub-api.up.railway.app`
   - Trigger a redeploy on Vercel.
3. **Run Final Smoke Test**:
   - Run the Playwright test suite against the live connected domains.
