# Estado del Proyecto — Exploro

**Última actualización:** 2026-11-11  
**Fase Actual:** FASE 5 — Sistema de Experiencias Propias (✅ Completada y Verificada al 100%)  
**Siguiente Fase:** FASE 6 — Planificador de Viajes (Oculto bajo Feature Flag) *(En espera de revisión y aprobación del propietario para iniciar)*

---

## 1. Estado de la Infraestructura Local (Costo Cero `$0.00`)

Todos los servicios contenedorizados están activos y saludables (`Up (healthy)`):

| Contenedor / Servicio | Imagen / Tecnología | Puerto Local | Estado |
| :--- | :--- | :--- | :--- |
| **`exploro-postgres-postgis`** | PostgreSQL 16 + PostGIS 3.7.0 + `pg_trgm` | `:5432` | ✅ `Up (healthy)` — 20 tablas + esquema de experiencias (`activity_logs`, `user_reviews`) y fuente nativa `EXPLORO_NATIVE` |
| **`exploro-redis`** | Redis 7 Alpine | `:6379` | ✅ `Up (healthy)` — Caché geoespacial, recomendaciones y colas activas |
| **`exploro-minio-s3`** | MinIO S3-Compatible Object Storage | `:9000` / `:9001` | ✅ `Up (healthy)` — Almacenamiento multimedia `$0` |
| **`exploro-ai-engine`** | Python 3.12 + FastAPI (en Docker) | `:8000` | ✅ `Up (healthy)` — 8/8 pruebas `pytest` superadas |

---

## 2. Estado de Paquetes y Aplicaciones del Monorepositorio (`pnpm` + `Turborepo`)

| Paquete / Aplicación | Ubicación | Compilación (`build` / `typecheck`) | Pruebas Automatizadas (`test`) |
| :--- | :--- | :--- | :--- |
| **`@exploro/config`** | `packages/config` | ✅ OK | N/A |
| **`@exploro/shared-types`** | `packages/shared-types` | ✅ OK | ✅ Verificado en consumidores |
| **`@exploro/validation`** | `packages/validation` | ✅ OK | ✅ 16 / 16 pruebas unitarias pasando |
| **`@exploro/business-rules`** | `packages/business-rules` | ✅ OK | ✅ 24 / 24 pruebas unitarias pasando |
| **`@exploro/api-client`** | `packages/api-client` | ✅ OK | ✅ 3 / 3 pruebas unitarias pasando |
| **`@exploro/api`** (Backend NestJS) | `apps/api` | ✅ OK | ✅ 49 / 49 pruebas de integración E2E (PostGIS + Redis + Experiences) pasando |
| **`@exploro/web`** (Next.js Viajero) | `apps/web` | ✅ OK (`next build` producción) | ✅ 4 / 4 pruebas pasando |
| **`@exploro/mobile`** (Expo Android/iOS) | `apps/mobile` | ✅ OK (`tsc -p tsconfig.json`) | ✅ 9 / 9 pruebas pasando |
| **`@exploro/admin`** (Gobernanza) | `apps/admin` | ✅ OK | ✅ 2 / 2 pruebas pasando |
| **`ai-engine`** (FastAPI en Docker) | `services/ai-engine` | ✅ OK | ✅ 8 / 8 pruebas `pytest` pasando |
| **TOTAL** | **Pipeline Global** | **✅ 23/23 Tareas de Turborepo** | **✅ 115 / 115 Pruebas Pasando (100% Green)** |

---

## 3. Cumplimiento de Criterios de Aceptación de la Fase 5

- [x] **Flujo «Comenzar actividad» (`apps/api` & `activity_logs`)**:
  - `POST /experiences/start`: Registra el inicio de actividad con usuario autenticado, lugar, título de actividad, hora de inicio y estado `STARTED` (`verification_method = 'NONE'`, `is_verified_visit = false`).
  - `GET /experiences/active`: Permite recuperar en tiempo real la actividad en progreso del usuario.
- [x] **Verificación Opcional de Visita (GPS y Códigos QR)**:
  - `POST /experiences/:id/verify-visit`:
    - Comprobación esférica Haversine y PostGIS `ST_DWithin` contra las coordenadas reales del lugar ($\le 100\text{ m}$).
    - Validación de códigos QR oficiales del lugar (`EXPLORO-QR-<slug>`).
    - Regla inquebrantable respetada: el simple inicio no prueba la visita física; únicamente tras superar la comprobación de proximidad o QR se actualiza a `is_verified_visit = TRUE`.
- [x] **Cuestionarios Cortos Adaptados por Categoría (Sin formularios largos)**:
  - Restaurantes: Calidad y sabor (1-5), atención (1-5), relación calidad-precio, gasto en USD, plato recomendado, si volvería y comentario libre.
  - Turismo: Si valió la pena, tiempo invertido, accesibilidad, gasto en USD, recomendación y qué debería saber otro visitante.
- [x] **Integración Inmutable al Ranking Determinista**:
  - `POST /experiences/:id/complete`: Almacena la opinión en `user_reviews` e ingesta automáticamente una evidencia en `evidences` con `source_code = 'EXPLORO_NATIVE'`.
  - Bono determinista de confianza en ranking: $1.35\times$ para visitas verificadas (confianza 0.95) y $1.15\times$ para opiniones no verificadas (confianza 0.75).
  - Recálculo inmediato de `place_scores` incrementando `total_native_reviews`.
- [x] **Experiencia Visual en Web y Móvil**:
  - Web (`PlaceDetail.tsx`): Botón para iniciar actividad, banner activo con estado de verificación, botón de geolocalización GPS vía navegador, modal de cuestionario adaptado y lista de opiniones comunitarias con badge `[✓ Visita Verificada]`.
  - Mobile (`App.tsx`): Tarjeta de experiencia propia en modal, verificación de proximidad por coordenadas, selector de estrellas y lista de testimonios nativos.
- [x] **Verificación Global y Puerta de Calidad**:
  - `pnpm turbo run build typecheck test` superado con 23/23 tareas exitosas.
  - 115 pruebas automatizadas pasando al 100% sin costo de APIs externas ($0.00).
