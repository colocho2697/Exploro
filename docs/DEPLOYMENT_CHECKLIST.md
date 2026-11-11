# Production Deployment Checklist — Exploro ($0.00 Architecture)

This document provides the step-by-step verification checklist for deploying the Exploro platform into production, ensuring full alignment with the **Strict Zero-Cost Architecture ($0.00)** and continuous stability.

---

## 1. Environment & Infrastructure Verification

- [ ] **Docker Engine & Docker Compose:**
  - Verify Docker 24+ is installed.
  - Verify host has at least 4 GB RAM and 20 GB free disk space.
- [ ] **PostgreSQL 16 + PostGIS 3.4+:**
  - Spatial extensions loaded: `postgis`, `pg_trgm`, `pgcrypto`.
  - Database migrations applied in sequence:
    1. `01-schema-and-seed.sql`
    2. `02-phase2-catalog.sql`
    3. `03-phase5-experiences.sql`
    4. `04-phase6-trips.sql`
    5. `05-phase7-admin.sql`
  - Run `VACUUM ANALYZE;` post-migration.
- [ ] **Redis 7 Cache:**
  - Configured with `maxmemory-policy allkeys-lru` and persistent AOF.
  - Latency check: `redis-cli ping` returns `PONG` in $< 2\text{ ms}$.
- [ ] **MinIO S3-Compatible Storage:**
  - Bucket `exploro-media` created and read policy verified for public image delivery.
- [ ] **Python AI Engine (`services/ai-engine`):**
  - Container health check `/health` returns `200 OK`.
  - Local Ollama / lightweight model container linked via internal network.

---

## 2. Environment Variables & Secrets Validation

| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Production environment flag | `production` |
| `PORT` | API listening port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/exploro_db` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | 256-bit cryptographically random secret | *(64-char hex string)* |
| `INTERNAL_SERVICE_KEY` | Shared secret between API and AI Engine | *(64-char hex string)* |
| `NEXT_PUBLIC_API_URL` | Public API endpoint for Web Client | `https://api.exploro.travel/api/v1` |
| `EXPO_PUBLIC_API_URL` | Public API endpoint for Mobile App | `https://api.exploro.travel/api/v1` |

---

## 3. Application Build & Verification Commands

```powershell
# 1. Clean and install all dependencies
pnpm install --frozen-lockfile

# 2. Run typecheck across all 9 workspaces
pnpm turbo run typecheck

# 3. Run all 155 automated unit & integration tests
pnpm turbo run test
docker exec exploro-ai-engine pytest

# 4. Compile optimized production builds
pnpm turbo run build

# 5. Launch full production stack with Docker Compose
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d
```

---

## 4. Post-Deployment Smoke Tests

- [ ] **Health API:** `curl -f https://api.exploro.travel/api/v1/health` returns `{"status":"ok"}`.
- [ ] **Bootstrap Config:** `curl -f https://api.exploro.travel/api/v1/bootstrap` returns `costPolicy: "ZERO_COST"` and `defaultCurrency: "USD"`.
- [ ] **Vector Map Rendering:** Web and mobile clients render OpenFreeMap / MapLibre vector tiles without tile errors.
- [ ] **Guest Exploration:** Categories and places can be queried without an authentication prompt.
- [ ] **Trip Planner Feature Flag:** Verify `trip_planner_enabled` defaults to `false` for public clients until explicitly enabled in `AdminControlPanel`.
- [ ] **Admin Security:** Verify unauthorized requests to `/admin/*` return `403 Forbidden` and every admin action records in `audit_logs`.

