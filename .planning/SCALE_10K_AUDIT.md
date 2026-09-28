# KPRIT CampusHub — 10,000 Concurrent Users Architecture Audit & Scale Plan

**Date**: September 28, 2026  
**Auditor**: Principal Infrastructure & Systems Architect  
**Target Concurrency**: 10,000 Concurrent Active Student Sessions  
**Target Reliability**: 99.9% Uptime, Error Rate < 1%, p95 Read Latency < 500ms, p95 Write Latency < 1000ms  

---

## 1. Concurrency Math & Traffic Modeling

10,000 concurrent students does NOT mean 10,000 HTTP requests per second continuously.
In actual collegiate web application usage:
- **Active Browsing & Navigation**: ~10%–20% of users are clicking, browsing, or filtering at any given second.
- **Average Think Time**: 4–8 seconds between clicks/page navigations.
- **Expected HTTP Request Throughput**:
  - Normal Peak: **1,250 – 1,800 requests/second**
  - Instantaneous Surge Peak (e.g., Placement registration rush / Hackathon RSVP opens): **2,500 – 3,500 requests/second**
- **Persistent WebSocket Connections**:
  - **10,000 persistent TCP connections** maintained concurrently by Daphne ASGI.
  - Heartbeat ping interval: every 30 seconds (~333 ping-pongs/second across the fleet).

---

## 2. Identified System Bottlenecks (Audit Findings)

| Tier | Component | Current Implementation | Bottleneck at 10,000 Users | Architectural Remedy |
| :--- | :--- | :--- | :--- | :--- |
| **App Server** | Daphne ASGI | Single worker process on port 8000 | Python GIL and CPU saturation around 1,500 req/s | Multi-instance Daphne cluster (4–8 worker replicas) with Nginx `least_conn` distribution |
| **Database** | PostgreSQL | Direct connections (`conn_max_age=600`) | Connection pool exhaustion beyond 100–300 simultaneous clients (`FATAL: remaining slots reserved`) | PgBouncer transaction-mode connection pooling (`max_client_conn=10000`, `default_pool_size=50`) |
| **Database Queries**| ORM Serializers | N+1 queries in `ClubSerializer` and `EventSerializer` | Up to 60–80 SQL queries per page load; 800,000 queries per second during surges | Query annotations (`Count()`, `select_related`, `prefetch_related`) reducing queries from 60+ to 1–2 |
| **Caching** | Application Reads | No Redis view caching | Every student view re-executes queries against PostgreSQL | Redis-backed caching for public events, clubs, announcements, opportunities (30s–120s TTL) with signal-based cache invalidation |
| **Async Tasks** | Notifications & Email | Synchronous SMTP and synchronous broadcast in HTTP thread | Blocking I/O (100ms–2000ms per email) locks up web worker threads | Celery worker cluster with Redis broker for asynchronous email, push notifications, and broadcast fanout |
| **Real-Time** | Channels / WS | JWT database lookup on every WS handshake | 10,000 simultaneous reconnects hit PostgreSQL with 10,000 queries | Redis caching for user JWT claims with 300s TTL + RedisChannelLayer |
| **Reverse Proxy** | Nginx | Single upstream, 30r/s rate limit per IP | NAT gateway IP false-positive blocks; file descriptor starvation | Multi-upstream load balancer, worker connections tuned to 16,384, nofile to 65,535, recalibrated burst buffers |
| **Frontend** | Next.js 16 | Standard client fetching without request deduplication | Window refocus causes duplicate bursts across open tabs | SWR/client request deduplication (`dedupingInterval=10000`), memoization, and static route pre-rendering |

---

## 3. High-Availability Target Architecture Diagram

```
                              INTERNET (10,000 Concurrent Students)
                                                │
                                                ▼
                           Cloudflare CDN / WAF / Edge Caching
                                                │
                                                ▼
                       High-Availability Nginx Load Balancer
                       (epoll, 16384 worker connections, HTTP/2)
                                                │
            ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
            ▼                   ▼                               ▼                   ▼
      Daphne App 1        Daphne App 2                    Daphne App 3        Daphne App 4
      (Port 8001)         (Port 8002)                     (Port 8003)         (Port 8004)
            │                   │                               │                   │
            └─────────┬─────────┴───────────────┬───────────────┴─────────┬─────────┘
                      │                         │                         │
                      ▼                         ▼                         ▼
             PgBouncer Pooler            Redis 7 Cluster          Celery Worker Fleet
          (10,000 client conns)       (Channel Layer + Cache)    (Email, Push, Reports)
                      │                         │                         │
                      ▼                         └─────────────────────────┘
             PostgreSQL 16 Primary
           (Row locks + Read Replica)
```

---

## 4. Execution Phases Roadmap (Phases 1 – 23)

- **Phase 1**: Horizontal Application Scaling (Stateless Daphne, Redis channel layer)
- **Phase 2**: Load Balancer (Nginx multi-instance upstream, health checks, HTTP/2, WS upgrade)
- **Phase 3**: CDN & Static Asset Scaling (Cache-Control, Gzip/Brotli, media isolation)
- **Phase 4**: Next.js Performance & Request Deduplication
- **Phase 5**: API Performance & N+1 Query Elimination
- **Phase 6**: Redis Intelligent Caching Layer with Invalidation Signals
- **Phase 7**: PostgreSQL Connection Pooling & Scaling (PgBouncer)
- **Phase 8**: Database Indexing for High-Traffic Queries
- **Phase 9**: Celery Background Processing Architecture
- **Phase 10**: WebSocket & Real-Time Connection Scaling
- **Phase 11**: Nginx & Edge Performance Tuning
- **Phase 12**: WAF, Rate Limiting & DDoS Defense
- **Phase 13**: Horizontal Autoscaling Rules & Thresholds
- **Phase 14**: Observability & Deep Health Telemetry
- **Phase 15 & 16**: Realistic Graduated Load Testing (Locust: 100 -> 10,000 Concurrency)
- **Phase 17**: Acceptance Criteria Verification
- **Phase 18**: Controlled Failure & Recovery Testing
- **Phase 19**: Enterprise Documentation Suite
- **Phase 20**: Production Docker Multi-Replica Orchestration
- **Phase 21**: Cloud Infrastructure Sizing & Cost Projections
- **Phase 22**: Comprehensive Security Regression Audit
- **Phase 23**: Final Executive Validation Report
