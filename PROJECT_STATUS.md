# Estado del Proyecto — Exploro

**Última actualización:** 2026-11-11  
**Fase Actual:** FASE 7 — Administración y Control (✅ Completada y Verificada al 100%)  
**Siguiente Fase:** FASE 8 — Pruebas, Optimización y Lanzamiento *(En espera de validación del propietario para iniciar)*

---

## 1. Estado de la Infraestructura Local (Costo Cero `$0.00`)

Todos los servicios contenedorizados están activos y saludables (`Up (healthy)`):

| Contenedor / Servicio | Imagen / Tecnología | Puerto Local | Estado |
| :--- | :--- | :--- | :--- |
| **`exploro-postgres-postgis`** | PostgreSQL 16 + PostGIS 3.7.0 + `pg_trgm` | `:5432` | ✅ `Up (healthy)` — 28 tablas incluyendo `content_reports`, `processing_errors`, `ai_models_config`, `audit_logs`, `trips` y `feature_flags` |
| **`exploro-redis`** | Redis 7 Alpine | `:6379` | ✅ `Up (healthy)` — Caché geoespacial, recomendaciones y colas activas |
| **`exploro-minio-s3`** | MinIO S3-Compatible Object Storage | `:9000` / `:9001` | ✅ `Up (healthy)` — Almacenamiento multimedia `$0` |
| **`exploro-ai-engine`** | Python 3.12 + FastAPI (en Docker) | `:8000` | ✅ `Up (healthy)` — 8/8 pruebas `pytest` superadas |

---

## 2. Estado de Paquetes y Aplicaciones del Monorepositorio (`pnpm` + `Turborepo`)

| Paquete / Aplicación | Ubicación | Compilación (`build` / `typecheck`) | Pruebas Automatizadas (`test`) |
| :--- | :--- | :--- | :--- |
| **`@exploro/config`** | `packages/config` | ✅ OK | N/A |
| **`@exploro/shared-types`** | `packages/shared-types` | ✅ OK | ✅ Verificado en consumidores |
| **`@exploro/validation`** | `packages/validation` | ✅ OK | ✅ 24 / 24 pruebas unitarias pasando |
| **`@exploro/business-rules`** | `packages/business-rules` | ✅ OK | ✅ 30 / 30 pruebas unitarias pasando |
| **`@exploro/api-client`** | `packages/api-client` | ✅ OK | ✅ 5 / 5 pruebas unitarias pasando |
| **`@exploro/api`** (Backend NestJS) | `apps/api` | ✅ OK | ✅ 69 / 69 pruebas de integración E2E (Fases 1 a 7) pasando |
| **`@exploro/web`** (Next.js Viajero + Admin) | `apps/web` | ✅ OK (`next build` producción — 133 kB First Load JS) | ✅ 4 / 4 pruebas pasando |
| **`@exploro/mobile`** (Expo Android/iOS) | `apps/mobile` | ✅ OK (`tsc -p tsconfig.json`) | ✅ 10 / 10 pruebas pasando |
| **`@exploro/admin`** (Gobernanza y Control) | `apps/admin` | ✅ OK | ✅ 5 / 5 pruebas pasando |
| **`ai-engine`** (FastAPI en Docker) | `services/ai-engine` | ✅ OK | ✅ 8 / 8 pruebas `pytest` pasando |
| **TOTAL** | **Pipeline Global** | **✅ 13/13 Tareas de Typecheck & 9/9 Build Exitosas** | **✅ 147 / 147 Pruebas Monorepo + 8 Pytest = 155 Pruebas (100% Green)** |

---

## 3. Cumplimiento de Criterios de Aceptación de la Fase 7

- [x] **Auditoría Inmutable y Obligatoria (`audit_logs`)**:
  - Toda modificación administrativa sobre usuarios, lugares, evidencias, opiniones, reportes o feature flags exige un motivo de al menos 10 caracteres (`validateAdminAuditRequest`).
  - Registro de `actor_user_id`, `entity_type`, `entity_id`, `action`, `previous_state`, `new_state` y `reason` en PostgreSQL.
- [x] **Inmutabilidad Absoluta de Testimonios y Evidencias**:
  - Regla `assertContentImmutability`: Prohibición estricta de alteraciones silenciosas o edición de texto redactado por usuarios o capturado de fuentes externas.
  - Los administradores y moderadores únicamente pueden alternar estados de moderación (`PUBLISHED`, `FLAGGED`, `REJECTED`, `DISPUTED`).
- [x] **Segmentación RBAC Estricta**:
  - Usuarios estándar (`TRAVELER`): Rechazados con HTTP 403 Forbidden en cualquier ruta `/admin/*`.
  - Moderadores (`MODERATOR`): Autorizados para moderar opiniones y evidencias y gestionar reportes, pero estrictamente bloqueados de alterar roles de usuarios o conmutar feature flags.
  - Administradores (`ADMIN`): Control total con auditoría obligatoria.
- [x] **Corrección de Metadatos y Georreferenciación de Lugares**:
  - `PATCH /admin/places/:placeId`: Actualiza coordenadas espaciales PostGIS `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` con registro en auditoría.
- [x] **Feature Flags en Caliente (Hot-Reload)**:
  - `PATCH /admin/feature-flags/:key`: Alternancia dinámica auditada que altera inmediatamente las respuestas y guardias de la API sin requerir reinicios de servidor.
- [x] **Reportes Comunitarios de Contenido**:
  - `POST /reports`: Cualquier usuario autenticado puede emitir reportes sobre lugares, opiniones o evidencias.
  - `PATCH /admin/reports/:reportId`: Resolución o desestimación por moderadores/administradores con notas de resolución obligatorias.
- [x] **Supervisión de Modelos de IA Locales ($0.00)**:
  - Tabla `ai_models_config` e interfaz para gestionar hiperparámetros locales (Ollama) sin costos por token.
- [x] **Panel Web Administrativo Integrado**:
  - `apps/web/src/components/AdminControlPanel.tsx`: Interfaz interactiva para Administradores con pestañas de Métricas, Feature Flags, Reportes Comunitarios, Auditoría Inmutable, Modelos de IA y Errores de Ingesta.
