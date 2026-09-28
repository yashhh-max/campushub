# KPRIT CAMPUSHUB — PRODUCTION SIZING & INFRASTRUCTURE SPECIFICATION (10,000 USERS)

## 1. Multi-Tier Capacity & Resource Sizing Matrix

| Component | Pilot Baseline (2,500 Users) | Normal Production (10,000 Users) | Peak Surge (Results / Placement Rush) |
| :--- | :--- | :--- | :--- |
| **CDN / Edge** | Cloudflare Free / Standard | Cloudflare Pro / Business + WAF | Cloudflare Enterprise DDoS Shield |
| **Edge WAF** | Basic OWASP Rules | Managed WAF, Rate Limiting (150 r/s) | Aggressive Bot & Burst Shielding |
| **Load Balancer** | Single Nginx Reverse Proxy | Dual HA Nginx / Cloud ALB (Active-Passive) | Cloud ALB with autoscaled Target Groups |
| **Frontend Tier** | 1 Node.js SSR Container (1 vCPU, 1GB) | 2 Next.js Replicas (2 vCPU, 2GB each) | 4 Next.js Replicas (2 vCPU, 4GB each) |
| **Backend ASGI Tier** | 1 Daphne Process (2 vCPU, 2GB) | **4 Daphne Replicas** (2 vCPU, 4GB each) | **8 Daphne Replicas** (2 vCPU, 4GB each) |
| **Connection Pooler** | Direct ORM connections | **PgBouncer** (1 vCPU, 512MB, 2,048 client conns) | **PgBouncer** (2 vCPU, 1GB, 4,096 client conns) |
| **PostgreSQL Database** | 2 vCPU, 4GB RAM, 50GB SSD | **4 vCPU, 16GB RAM, 250GB NVMe SSD** | **8 vCPU, 32GB RAM, 500GB NVMe + 1 Read Replica** |
| **Redis Cache / Channels** | 1 vCPU, 512MB RAM | **2 vCPU, 4GB RAM (Cluster Mode / Sentinel)** | **4 vCPU, 8GB RAM (Multi-AZ Replicated)** |
| **Celery Workers** | Synchronous fallback | **2 Workers** (2 concurrency each, 1 vCPU, 1GB) | **4 Workers** (4 concurrency each, 2 vCPU, 2GB) |
| **Celery Beat** | Single process (0.5 vCPU) | Dedicated container (0.5 vCPU, 256MB) | Dedicated container (0.5 vCPU, 256MB) |
| **Object Storage** | Local Disk `/media/` | AWS S3 / Azure Blob Storage (250GB) | S3 / Azure Blob + CDN Distribution |
| **Monitoring & Logs** | Local file logs | Prometheus + Grafana + Loki (2 vCPU, 4GB) | Managed Datadog / AWS CloudWatch |
| **Automated Backups** | Daily local pg_dump | Daily automated snapshot + WAL archiving | Point-in-Time Recovery (PITR) + Geo-redundant |

---

## 2. Cloud Provider Equivalents

### Amazon Web Services (AWS)

| Architectural Role | Recommended AWS Service | Instance / Specification |
| :--- | :--- | :--- |
| **DNS & Edge WAF** | Amazon Route 53 + AWS WAF | Managed Common Rule Set + Rate-based rules |
| **Content Delivery Network** | Amazon CloudFront | Price Class 200, Origin Shield enabled |
| **Application Load Balancer** | AWS ALB | HTTP/2, WebSocket, Cross-Zone Load Balancing |
| **Frontend Container Service** | AWS ECS Fargate | 2 tasks x 1 vCPU / 2GB RAM |
| **Backend Application Cluster** | AWS ECS Fargate | 4 tasks x 2 vCPU / 4GB RAM |
| **Database Engine** | Amazon RDS PostgreSQL | `db.r6g.xlarge` (4 vCPU, 32GB RAM), Multi-AZ |
| **Database Pooler** | Amazon RDS Proxy / PgBouncer | Managed connection pooling |
| **Cache & Channel Layer** | Amazon ElastiCache for Redis | `cache.m6g.large` (2 vCPU, 6.38GB RAM) |
| **Background Processing** | AWS ECS Fargate | 2 tasks x 1 vCPU / 2GB RAM |
| **Media / Asset Storage** | Amazon S3 Standard | Versioned bucket with S3 lifecycle policies |

### Microsoft Azure

| Architectural Role | Recommended Azure Service | Instance / Specification |
| :--- | :--- | :--- |
| **Edge Routing & WAF** | Azure Front Door + WAF | Premium Tier with Managed DRS rules |
| **Load Balancing** | Azure Application Gateway v2 | Autoscaling (2–10 instances), WAF enabled |
| **Container Hosting** | Azure Container Apps (ACA) | Frontend: 2 replicas; Backend: 4–8 replicas |
| **Database Engine** | Azure Database for PostgreSQL | Flexible Server `Standard_D4ds_v5` (4 vCPU, 16GB) |
| **In-Memory Cache** | Azure Cache for Redis | Standard C2 (2.5GB RAM) or Premium P1 |
| **Asynchronous Jobs** | Azure Container Apps Jobs / Workers | Consumption plan autoscaled on Redis queue depth |
| **Media Storage** | Azure Blob Storage | Hot tier, Geo-redundant storage (GRS) |

---

## 3. Estimated Monthly Operating Costs (USD)

| Infrastructure Item | Pilot Setup (Monthly) | 10k Production (Monthly) | Peak Surge (Monthly) |
| :--- | :--- | :--- | :--- |
| **Compute (Containers / VMs)** | $45.00 | $220.00 | $440.00 |
| **Managed PostgreSQL** | $35.00 | $160.00 | $320.00 |
| **Managed Redis** | $15.00 | $65.00 | $130.00 |
| **Load Balancer & Network Transfer** | $18.00 | $55.00 | $110.00 |
| **CDN & Edge Security** | $0.00 (Free) | $25.00 | $80.00 |
| **Object Storage (S3 / Blob)** | $5.00 | $15.00 | $35.00 |
| **Logging & Monitoring** | $0.00 | $30.00 | $60.00 |
| **Total Estimated Monthly Cost** | **~$118.00** | **~$570.00** | **~$1,175.00** |
