# Estado del Proyecto — Exploro

**Última actualización:** 2026-11-11  
**Fase Actual:** FASE 3 — Integración de Mapas y Fuentes (✅ Completada y Verificada al 100%)  
**Siguiente Fase:** FASE 4 — Motor de Inteligencia y Recomendaciones *(En espera de revisión y aprobación del propietario para iniciar)*

---

## 1. Estado de la Infraestructura Local (Costo Cero `$0.00`)

Todos los servicios contenedorizados están activos y saludables (`Up (healthy)`):

| Contenedor / Servicio | Imagen / Tecnología | Puerto Local | Estado |
| :--- | :--- | :--- | :--- |
| **`exploro-postgres-postgis`** | PostgreSQL 16 + PostGIS 3.7.0 + `pg_trgm` | `:5432` | ✅ `Up (healthy)` — 18 tablas + semillas EE. UU. (13 lugares, actividades, fuentes y evidencias) |
| **`exploro-redis`** | Redis 7 Alpine | `:6379` | ✅ `Up (healthy)` — Caché geoespacial y colas activas |
| **`exploro-minio-s3`** | MinIO S3-Compatible Object Storage | `:9000` / `:9001` | ✅ `Up (healthy)` — Almacenamiento multimedia `$0` |
| **`exploro-ai-engine`** | Python 3.12 + FastAPI (en Docker) | `:8000` | ✅ `Up (healthy)` — 4/4 pruebas `pytest` superadas |

---

## 2. Estado de Paquetes y Aplicaciones del Monorepositorio (`pnpm` + `Turborepo`)

| Paquete / Aplicación | Ubicación | Compilación (`build` / `typecheck`) | Pruebas Automatizadas (`test`) |
| :--- | :--- | :--- | :--- |
| **`@exploro/config`** | `packages/config` | ✅ OK | N/A |
| **`@exploro/shared-types`** | `packages/shared-types` | ✅ OK | ✅ Verificado en consumidores |
| **`@exploro/validation`** | `packages/validation` | ✅ OK | ✅ 11 / 11 pruebas unitarias pasando |
| **`@exploro/business-rules`** | `packages/business-rules` | ✅ OK | ✅ 16 / 16 pruebas unitarias pasando |
| **`@exploro/api-client`** | `packages/api-client` | ✅ OK | ✅ 2 / 2 pruebas unitarias pasando |
| **`@exploro/api`** (Backend NestJS) | `apps/api` | ✅ OK | ✅ 36 / 36 pruebas de integración E2E (PostGIS + Redis) pasando |
| **`@exploro/web`** (Next.js Viajero) | `apps/web` | ✅ OK (`next build` producción) | ✅ 4 / 4 pruebas pasando |
| **`@exploro/mobile`** (Expo Android/iOS) | `apps/mobile` | ✅ OK (`tsc -p tsconfig.json`) | ✅ 7 / 7 pruebas pasando |
| **`@exploro/admin`** (Gobernanza) | `apps/admin` | ✅ OK | ✅ 2 / 2 pruebas pasando |
| **`ai-engine`** (FastAPI en Docker) | `services/ai-engine` | ✅ Imagen Docker construida | ✅ 4 / 4 pruebas `pytest` pasando |
| **TOTAL** | **Pipeline Global** | **✅ 23/23 Tareas de Turborepo** | **✅ 82 / 82 Pruebas Pasando (100% Green)** |

---

## 3. Cumplimiento de Criterios de Aceptación de la Fase 3

- [x] **Servicios Geoespaciales Costo Cero (`apps/api/src/modules/geo/`)**:
  - `GET /geo/autocomplete`: Búsqueda de prefijos y similitud trigram (`pg_trgm`) en PostGIS sobre ciudades y lugares en EE. UU., con caché en Redis.
  - `GET /geo/reverse`: Geocodificación inversa mediante operador de distancia espacial `<->` de PostGIS con caché en Redis.
  - `POST /geo/route`: Cálculo determinista de rutas (distancia, duración en modos `driving` / `walking` / `cycling`, pasos paso a paso y geometría GeoJSON `LineString`).
- [x] **Gestión y Sincronización de Fuentes (`apps/api/src/modules/sources/`)**:
  - `GET /sources`: Listado de fuentes autorizadas con contadores de evidencias.
  - `POST /sources`: Registro controlado de fuentes con validación de código único y tipo de fuente (`OFFICIAL_OPEN_DATA`, `EDITORIAL_BLOG`, `COMMUNITY_FORUM`, `SOCIAL_MEDIA`, `DIRECT_PARTNER`).
  - `POST /sources/:id/sync`: Pipeline de sincronización que genera evidencias con hash determinista (`content_hash`) para evitar duplicaciones.
- [x] **Ingestión de Evidencias Auditables (`apps/api/src/modules/evidences/`)**:
  - `GET /places/:placeId/evidences`: Listado de evidencias ordenadas por confianza y fecha.
  - `POST /evidences`: Ingesta con deduplicación por hash SHA-256 / FNV-1a y recálculo automático del score determinista del lugar en `place_scores`.
- [x] **Normalización y Deduplicación Segura (`packages/business-rules` y `apps/api/src/modules/normalization/`)**:
  - `normalizePlaceName`: Normalización estricta eliminando puntuación, acentos y sufijos corporativos (`llc`, `inc`, `restaurant`).
  - `calculateTrigramSimilarity`: Coeficiente Sørensen-Dice TypeScript puro concordante con `pg_trgm`.
  - `evaluatePlaceDuplicate`: Clasificación estricta: `<25m` & `>=0.90` -> `AUTO_MERGE`; `<250m` & `>=0.65` o `<500m` & `>=0.85` -> `MANUAL_REVIEW`. Nunca se fusiona en caso de duda (evita falsos positivos).
  - `GET /normalization/duplicates`: Detección espacial PostGIS `ST_DWithin` + `pg_trgm` de candidatos.
- [x] **Experiencia de Usuario en Web y Mobile (`apps/web` y `apps/mobile`)**:
  - Web: Trazado dinámico de rutas en MapLibre GL con GeoJSON `LineString`, autocompletado en tiempo real en la barra de búsqueda y botón "Trazar ruta" en detalle de lugar.
  - Mobile: Autocompletado en tiempo real debajo de la barra de búsqueda, modal de ruta ("🚗 Cómo llegar") con indicaciones paso a paso, distancias en millas y duraciones estimadas, y visualización de evidencias auditables.
- [x] **Verificación Global**:
  - `pnpm turbo run build typecheck test` completado con éxito (23/23 tareas exitosas, 0 errores, 82/82 pruebas aprobadas).

---

## 4. Errores Pendientes

- **Ninguno.** Todos los paquetes compilan sin errores (`0 errors`) y el 100% de las suites de prueba están en verde.

---

## 5. Siguiente Paso Exacto

- Presentar el diagnóstico y cierre de la **Fase 3** al propietario del proyecto.
- Solicitar aprobación formal para iniciar la **Fase 4 — Motor de Inteligencia y Recomendaciones** (Extracción de aspectos en Python/FastAPI con modelo local, Motor de Ranking determinista + explicable, Guardián anti-alucinaciones, métricas de costo IA $0.00).
