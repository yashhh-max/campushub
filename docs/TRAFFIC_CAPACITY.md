# KPRIT CAMPUSHUB — TRAFFIC CAPACITY & BENCHMARK AUDIT

## 1. Core Capacity Principles

In high-concurrency campus systems engineering:
$$\text{10,000 Concurrent Users} \neq \text{10,000 Requests/Second}$$

A student user does not click every single millisecond. The application workload consists of:
1. **Active Browsing & Reading**: Students view event descriptions, read club guidelines, and view announcements with an average human think time of **3 to 8 seconds**.
2. **Persistent Idle State**: 10,000 students keep persistent WebSocket connections open to receive real-time notifications (`/ws/notifications/`) and ping heartbeats every 25 seconds.
3. **Realistic Throughput Conversion**:
   $$\text{Normal Peak Throughput} = \frac{10,000 \text{ Users}}{5.5 \text{s Mean Think Time}} \approx \mathbf{1,818 \text{ Requests/Second}}$$
   $$\text{Sudden Surge Burst (Morning Login / Results Release)} = \frac{10,000 \text{ Users}}{3.0 \text{s Peak Think Time}} \approx \mathbf{3,333 \text{ Requests/Second}}$$

---

## 2. Definitive Capacity Separation

### A. Target Capacity (Institutional Goal)
- **Target Concurrent Students**: 10,000 simultaneous authenticated sessions
- **Target WebSocket Connections**: 10,000 persistent connections
- **Target Peak Throughput**: ~2,500 – 3,500 req/s
- **Target Read Latency**: p95 < 500 ms
- **Target Write Latency**: p95 < 1,000 ms
- **Target System Error Rate**: < 1.0%

### B. Tested Capacity (Locally Demonstrated on Single-Node Daphne & Locust)
- **Tested Concurrent Students**: Demonstrated up to **100–250 concurrent users** on a single Windows Daphne development process before TCP backlog saturation.
- **Peak Tested Local Single-Worker Throughput**: **260.34 requests/sec** (Locust)
- **Peak Tested API Read Latency (with Redis Caching & Annotations)**:
  - Median Latency (p50): **18 – 31 ms**
  - 95th Percentile (p95): **140 – 250 ms**
  - 99th Percentile (p99): **320 – 690 ms**
  - Error Rate: **0.00%** on optimized endpoints
- **WebSocket Handshake Latency**:
  - p50: **110.0 ms – 236.5 ms**
  - Ping/Pong Latency: **1.1 ms** (Redis-backed channel layer)
  - Drop Rate: **0.0%**

### C. Theoretical Multi-Replica Production Capacity (Clustered & Load-Balanced)
- **Clustered Backend Instances**: 4 to 8 Daphne ASGI replicas behind Nginx HA
- **Connection Pooler**: PgBouncer (2,048 client connections mapped to 50 Postgres connections)
- **Database Engine**: PostgreSQL 16 on 4–8 vCPU / 16–32GB RAM
- **Theoretical Multi-Node Throughput**:
  $$\text{Capacity} = 4 \text{ Replicas} \times 450 \text{ req/s} = \mathbf{1,800 \text{ req/s sustained}}$$
  $$\text{Surge Burst} = 8 \text{ Replicas} \times 450 \text{ req/s} = \mathbf{3,600 \text{ req/s burst}}$$
- **WebSocket Connection Ceiling**:
  $$4 \text{ Daphne Replicas} \times 2,500 \text{ connections/replica} = \mathbf{10,000 \text{ Persistent WebSockets}}$$
- **Predicted p95 Latency under Cluster**: **< 250 ms**

---

## 3. Bottleneck Analysis & Remediations Applied

1. **N+1 Serializer Elimination**:
   - `ClubSerializer` and `EventSerializer` previously executed 80–120 SQL queries per page.
   - Replaced with database annotations (`annotate(...)`) and pre-batched user RSVP/membership sets: reduced to **2 queries per page**.
2. **Redis Query & Counter Caching**:
   - Navbar notification badges cached in Redis (`user_unread_notif_<id>`), reducing DB traffic by 10,000 queries/min.
   - Public event/club/announcement signals invalidate cache automatically upon admin edits.
3. **Asynchronous Background Processing**:
   - Celery 5+ handles emails and bulk broadcasts asynchronously, decoupling HTTP threads from slow SMTP handshakes.
4. **WebSocket Connection Storm Shielding**:
   - User authentication cached in Redis (`ws_user_auth_<id>`), preventing 10,000 simultaneous SQL queries during reconnect bursts.
5. **Nginx Connection Pooling & Rate Limiting**:
   - `least_conn` distribution across multiple Daphne instances.
   - Upstream keepalive of 128 connections.
   - Calibrated burst rate limits (150 r/s API, 25 r/s Auth).
