# Estado del Proyecto — Exploro

**Última actualización:** 2026-11-11  
**Fase Actual:** FASE 6 — Planificador de Viajes — Oculto bajo Feature Flag (✅ Completada y Verificada al 100%)  
**Siguiente Fase:** FASE 7 — Modo «Soy Local» y Micro-Comunidades *(En espera de validación del propietario para iniciar)*

---

## 1. Estado de la Infraestructura Local (Costo Cero `$0.00`)

Todos los servicios contenedorizados están activos y saludables (`Up (healthy)`):

| Contenedor / Servicio | Imagen / Tecnología | Puerto Local | Estado |
| :--- | :--- | :--- | :--- |
| **`exploro-postgres-postgis`** | PostgreSQL 16 + PostGIS 3.7.0 + `pg_trgm` | `:5432` | ✅ `Up (healthy)` — 23 tablas incluyendo `trips`, `trip_days`, `trip_items` y `feature_flags` (`trip_planner_enabled = false`) |
| **`exploro-redis`** | Redis 7 Alpine | `:6379` | ✅ `Up (healthy)` — Caché geoespacial, recomendaciones y colas activas |
| **`exploro-minio-s3`** | MinIO S3-Compatible Object Storage | `:9000` / `:9001` | ✅ `Up (healthy)` — Almacenamiento multimedia `$0` |
| **`exploro-ai-engine`** | Python 3.12 + FastAPI (en Docker) | `:8000` | ✅ `Up (healthy)` — 8/8 pruebas `pytest` superadas |

---

## 2. Estado de Paquetes y Aplicaciones del Monorepositorio (`pnpm` + `Turborepo`)

| Paquete / Aplicación | Ubicación | Compilación (`build` / `typecheck`) | Pruebas Automatizadas (`test`) |
| :--- | :--- | :--- | :--- |
| **`@exploro/config`** | `packages/config` | ✅ OK | N/A |
| **`@exploro/shared-types`** | `packages/shared-types` | ✅ OK | ✅ Verificado en consumidores |
| **`@exploro/validation`** | `packages/validation` | ✅ OK | ✅ 19 / 19 pruebas unitarias pasando |
| **`@exploro/business-rules`** | `packages/business-rules` | ✅ OK | ✅ 27 / 27 pruebas unitarias pasando |
| **`@exploro/api-client`** | `packages/api-client` | ✅ OK | ✅ 4 / 4 pruebas unitarias pasando |
| **`@exploro/api`** (Backend NestJS) | `apps/api` | ✅ OK | ✅ 59 / 59 pruebas de integración E2E (Fases 1 a 6) pasando |
| **`@exploro/web`** (Next.js Viajero) | `apps/web` | ✅ OK (`next build` producción — 128 kB First Load JS) | ✅ 4 / 4 pruebas pasando |
| **`@exploro/mobile`** (Expo Android/iOS) | `apps/mobile` | ✅ OK (`tsc -p tsconfig.json`) | ✅ 10 / 10 pruebas pasando |
| **`@exploro/admin`** (Gobernanza) | `apps/admin` | ✅ OK | ✅ 2 / 2 pruebas pasando |
| **`ai-engine`** (FastAPI en Docker) | `services/ai-engine` | ✅ OK | ✅ 8 / 8 pruebas `pytest` pasando |
| **TOTAL** | **Pipeline Global** | **✅ 12/12 Tareas de Typecheck & 8/8 Build Exitosas** | **✅ 133 / 133 Pruebas Pasando (100% Green)** |

---

## 3. Cumplimiento de Criterios de Aceptación de la Fase 6

- [x] **Aislamiento Estricto por Feature Flag (Paso 6.1)**:
  - Bandera en base de datos: `feature_flags.key = 'trip_planner_enabled'` con valor `false`.
  - Guardia NestJS `TripsFeatureFlagGuard`: bloquea con HTTP 403 Forbidden a usuarios públicos sin cabeceras internas.
  - Bypass exclusivo para pruebas internas mediante cabecera `x-exploro-internal: true`.
- [x] **Modelo de Datos y Traslados PostGIS ($0.00)**:
  - Tablas `trips`, `trip_days` y `trip_items` aplicadas en migración `04-phase6-trips.sql`.
  - Cálculo de distancias y tiempos entre actividades consecutivas mediante PostGIS `ST_Distance(p1.location, p2.location)` esférico.
- [x] **Motor de Planificación Asistida Determinista (Paso 6.2 y 6.3)**:
  - `POST /trips/assisted-plan`: Asignación lógica de actividades para Mañana (Turismo/Naturaleza), Almuerzo (Comida), Tarde (Turismo) y Cena (Comida) basada en puntuaciones verificables y sin alucinaciones.
- [x] **Clasificación de Alternativas en 3 Niveles (Paso 6.4)**:
  - Nivel 1 (`VERY_SIMILAR`): Misma categoría, distancia $\le 2.5\text{ km}$, duración similar ($\le 45\text{ min}$).
  - Nivel 2 (`RELATED_EXPERIENCE`): Experiencias complementarias en la misma zona ($\le 6\text{ km}$).
  - Nivel 3 (`REQUIRES_ADJUSTMENTS`): Lugares que demandan mayor tiempo de traslado o reprogramación.
- [x] **Reorganización Inteligente con Explicaciones y Sin Mutación Unilateral (Paso 6.6)**:
  - `POST /trips/:id/items/:itemId/reorganize-preview`: Calcula desplazamientos acumulados hacia adelante, detalla el motivo y alerta si excede el límite del día (`scheduleOverflowsDay`).
  - No modifica la base de datos hasta que el usuario confirma explícitamente vía `POST /trips/:id/apply-reorganization`.
- [x] **Experiencia Visual en Web y Móvil**:
  - Web: `TripPlannerPanel.tsx` integrado en `page.tsx` con tabs de días, visualización de actividades con distancias, modal de alternativas en 3 niveles y previsualización de reacomodo de horarios.
  - Mobile: Pestaña `🗺️ Viajes` en `App.tsx`, conmutador de cabecera interna para testing, modal de alternativas clasificadas en 3 niveles y modal interactivo de reorganización.
- [x] **Verificación Global y Puerta de Calidad**:
  - 133 pruebas automatizadas pasando al 100% sin costo de APIs externas ($0.00).
