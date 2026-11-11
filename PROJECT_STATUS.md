# Estado del Proyecto — Exploro

**Última actualización:** 2026-11-11  
**Fase Actual:** FASE 2 — Sistema de Descubrimiento (✅ Completada y Verificada al 100%)  
**Siguiente Fase:** FASE 3 — Integración de Mapas y Fuentes *(En espera de revisión y aprobación del propietario para iniciar)*

---

## 1. Estado de la Infraestructura Local (Costo Cero `$0.00`)

Todos los servicios contenedorizados están activos y saludables (`Up (healthy)`):

| Contenedor / Servicio | Imagen / Tecnología | Puerto Local | Estado |
| :--- | :--- | :--- | :--- |
| **`exploro-postgres-postgis`** | PostgreSQL 16 + PostGIS 3.7.0 + `pg_trgm` | `:5432` | ✅ `Up (healthy)` — 18 tablas + semillas EE. UU. (13 lugares, actividades y evidencias) |
| **`exploro-redis`** | Redis 7 Alpine | `:6379` | ✅ `Up (healthy)` — Caché y colas activas |
| **`exploro-minio-s3`** | MinIO S3-Compatible Object Storage | `:9000` / `:9001` | ✅ `Up (healthy)` — Almacenamiento multimedia `$0` |
| **`exploro-ai-engine`** | Python 3.12 + FastAPI (en Docker) | `:8000` | ✅ `Up (healthy)` — 4/4 pruebas `pytest` superadas |

---

## 2. Estado de Paquetes y Aplicaciones del Monorepositorio (`pnpm` + `Turborepo`)

| Paquete / Aplicación | Ubicación | Compilación (`build` / `typecheck`) | Pruebas Automatizadas (`test`) |
| :--- | :--- | :--- | :--- |
| **`@exploro/config`** | `packages/config` | ✅ OK | N/A |
| **`@exploro/shared-types`** | `packages/shared-types` | ✅ OK | ✅ Verificado en consumidores |
| **`@exploro/validation`** | `packages/validation` | ✅ OK | ✅ 8 / 8 pruebas unitarias pasando |
| **`@exploro/business-rules`** | `packages/business-rules` | ✅ OK | ✅ 11 / 11 pruebas unitarias pasando |
| **`@exploro/api-client`** | `packages/api-client` | ✅ OK | ✅ 2 / 2 pruebas unitarias pasando |
| **`@exploro/api`** (Backend NestJS) | `apps/api` | ✅ OK | ✅ 26 / 26 pruebas de integración E2E (PostGIS + Redis) pasando |
| **`@exploro/web`** (Next.js Viajero) | `apps/web` | ✅ OK (`next build` producción) | ✅ 4 / 4 pruebas pasando |
| **`@exploro/mobile`** (Expo Android/iOS) | `apps/mobile` | ✅ OK (`tsc -p tsconfig.json`) | ✅ 6 / 6 pruebas pasando |
| **`@exploro/admin`** (Gobernanza) | `apps/admin` | ✅ OK | ✅ 2 / 2 pruebas pasando |
| **`ai-engine`** (FastAPI en Docker) | `services/ai-engine` | ✅ Imagen Docker construida | ✅ 4 / 4 pruebas `pytest` pasando |
| **TOTAL** | **Pipeline Global** | **✅ 23/23 Tareas de Turborepo** | **✅ 61 / 61 Pruebas Pasando (100% Green)** |

---

## 3. Cumplimiento de Criterios de Aceptación de la Fase 2

- [x] **Catálogo con Transparencia de Evidencia (Principios #1 y #2)**:
  - 13 lugares verificados cubriendo New York, Miami, Los Angeles, Chicago, Austin, San Francisco y Orlando.
  - Indicador `is_demo_data = true` para diferenciar datos demostrativos de evidencias auditables reales.
  - Eliminación de imágenes sin verificar (`image_url = null`) y etiquetas explícitas de precio no confirmado (`(sin verificar)`).
- [x] **Reglas de Negocio Puras y Motor de Descubrimiento (`@exploro/business-rules`)**:
  - Evaluación presupuestaria sin asumir barato lo desconocido (`evaluateBudgetFit`).
  - Motor determinista pseudoaleatorio (Mulberry32) para selección diversa por categorías en «Sorpréndeme».
  - Estimación de tiempos de traslado basados en distancia.
- [x] **Búsqueda Espacial y Catálogo en Backend (`apps/api`)**:
  - Consultas espaciales PostGIS (`ST_DWithin`, `ST_Distance`) con soporte de radio y modo `unbounded=true`.
  - Ordenamiento por recomendación, distancia y nombre.
  - Scoring dinámico (+10 categorías favoritas, -15 exceso de presupuesto).
  - Endpoint `POST /discover/surprise-me` con banderas de `budgetFit` y `timeFit`.
- [x] **Biblioteca de Usuario Aislada (`apps/api`)**:
  - Favoritos idempotentes (`POST`, `GET`, `DELETE /favorites/:placeId`).
  - Colecciones con nombre único por usuario, descripción, visibilidad y adición/eliminación de ítems.
- [x] **Experiencia Web Interactiva (`apps/web`)**:
  - Mapa vector gratuito MapLibre GL (OpenFreeMap Liberty) sin costos de Google Maps API.
  - Filtros avanzados de texto, ciudad, categoría, radio y ordenamiento.
  - Modales de detalle con actividades, horarios y evidencias.
  - Interfaz de «Sorpréndeme» y panel de Biblioteca (Favoritos y Colecciones).
- [x] **Experiencia Móvil Completa (`apps/mobile`)**:
  - Búsqueda en tiempo real, selector horizontal de ciudades US y chips de categorías.
  - Modales interactivos de «Sorpréndeme» y «Detalle de Lugar» con actividades y fuentes.
  - Gestión inmutable de favoritos locales y filtros por pestaña.
  - Formateo de distancias en unidades EE. UU. (pies bajo 0.1 mi, millas por encima).
- [x] **Verificación Global**:
  - `pnpm turbo run build typecheck test` completado con éxito (23/23 tareas exitosas, 0 errores).

---

## 4. Errores Pendientes

- **Ninguno.** Todos los paquetes compilan sin errores (`0 errors`) y el 100% de las suites de prueba están en verde.

---

## 5. Siguiente Paso Exacto

- Presentar el diagnóstico y cierre de la **Fase 2** al propietario del proyecto.
- Solicitar aprobación formal para iniciar la **Fase 3 — Integración de Mapas y Fuentes** (integración de vector tiles de OpenFreeMap / OSM en mobile/web, sincronización de fuentes abiertas como OpenStreetMap / Overpass API o datos locales sin costo, geocodificación gratuita con Nominatim y motor de evidencias).
