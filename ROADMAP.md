# Hoja de Ruta y Plan de Implementación — Exploro

**Versión:** 1.0.0  
**Metodología:** Desarrollo incremental, modular y validado por fases (sin avance automático sin pruebas ni aprobación).

---

## Resumen de Fases del Proyecto

| Fase | Nombre | Estado | Puerta de Calidad / Entregable |
| :--- | :--- | :--- | :--- |
| **Fase 0** | Análisis del Entorno y Planificación | ✅ **Completada y Aprobada** | Diagnóstico, Arquitectura, Modelo de Datos, Estrategia de Costo Cero (`$0.00`) y Plan aprobados. |
| **Fase 1** | Construcción de los Fundamentos | ✅ **Completada y Validada (29/29 tests)** | Monorepo operativo, Docker (PostGIS+Redis+MinIO+AI Engine), esquema BD inicial EE. UU., Auth JWT + Modo Invitado, UI inicial («Estoy de viaje» / «Soy local — próximamente»). |
| **Fase 2** | Sistema de Descubrimiento | ✅ **Completada y Aprobada (61/61 tests)** | Catálogo completo, Categorías dinámicas, Búsqueda PostGIS con mapa MapLibre `$0`, Tarjetas con evidencias, Favoritos, Colecciones, «Sorpréndeme», Preferencias activables. |
| **Fase 3** | Integración de Mapas y Fuentes | ✅ **Completada y Validada (82/82 tests)** | OpenFreeMap / MapLibre GL `$0`, Autocompletado y Geocodificación PostGIS/Redis, Cálculo de Rutas sin costo, Conectores legales de fuentes, Sistema de Evidencias y Deduplicación segura. |
| **Fase 4** | Motor de Inteligencia y Recomendaciones | ✅ **Completada y Validada (97/97 tests)** | Extracción de aspectos en Python/FastAPI ($0.00), Motor de Ranking determinista + explicable, Guardián anti-alucinaciones, Métricas FinOps de IA. |
| **Fase 5** | Sistema de Experiencias Propias | ✅ **Completada y Validada (115/115 tests)** | Flujo «Comenzar actividad», cuestionarios cortos adaptados (Restaurantes/Turismo), verificación opcional (GPS/QR), integración inmutable al ranking. |
| **Fase 6** | Planificador de Viajes (Oculto) | 🟡 **Lista para Iniciar (Esperando Aprobación)** | Protegido por Feature Flag: itinerarios manuales y asistidos, flexibilidad horaria (0/15/30/60m), edición inteligente en 3 niveles, reorganización con confirmación. |
| **Fase 7** | Administración y Control | ⚪ Pendiente | Panel Admin (`apps/admin`), moderación de evidencias/duplicados, gestión de feature flags y métricas de IA, auditoría inmutable (`audit_logs`). |
| **Fase 8** | Pruebas, Optimización y Lanzamiento | ⚪ Pendiente | Suite completa E2E/Seguridad/Rendimiento, optimización móvil y de costos, compilación Android/iOS/Web y despliegue progresivo. |

---

## Desglose Detallado — FASE 0: Análisis del Entorno y Planificación

### Tarea 0.1 — Inspección del Entorno y Diagnóstico Técnico
- **Objetivo:** Auditar sistema operativo, recursos de hardware, herramientas instaladas y restricciones para el desarrollo de móvil, web, backend, base de datos e IA.
- **Archivos o módulos involucrados:** `PROJECT_STATUS.md`, `DECISIONS.md`, `PENDING_DECISIONS.md`.
- **Dependencias:** Ninguna.
- **Resultado esperado:** Inventario exacto de versiones instaladas (Node.js, Docker, Git, Java) y detección de brechas (activación de `pnpm`, instalación de Python 3.12+ en host, Android SDK).
- **Pruebas:** Verificación por línea de comandos de binarios, demonios de Docker y recursos del sistema.
- **Criterios de aceptación:** Diagnóstico documentado sin alterar archivos existentes (`master_promp.md` preservado e igualado en `MASTER_PROMPT.md`). *(Completado)*

### Tarea 0.2 — Análisis de Requisitos, Reglas de Negocio y Matriz de Riesgos
- **Objetivo:** Traducir el `MASTER_PROMPT.md` en historias de usuario, reglas de negocio verificables, restricciones éticas/legales de fuentes y riesgos técnicos.
- **Archivos o módulos involucrados:** `ARCHITECTURE.md`, `PENDING_DECISIONS.md`.
- **Dependencias:** Tarea 0.1.
- **Resultado esperado:** Reglas de negocio estructuradas, límites de responsabilidad entre IA y motores deterministas, y evaluación de viabilidad legal de conectores (Reddit, TikTok, Facebook, Blogs).
- **Pruebas:** Revisión cruzada contra los 10 principios inquebrantables de la Parte I del `MASTER_PROMPT.md`.
- **Criterios de aceptación:** Cobertura del 100% de las fases y restricciones del documento maestro. *(Completado)*

### Tarea 0.3 — Diseño de Arquitectura, Modelo de Datos y Contratos de API
- **Objetivo:** Diseñar los diagramas de arquitectura general, módulos, despliegue, secuencia y ERD espacial con PostGIS.
- **Archivos o módulos involucrados:** `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `TESTING.md`.
- **Dependencias:** Tarea 0.2.
- **Resultado esperado:** Diagramas Mermaid válidos, esquema de entidades con separación de datos propios vs. terceros y contratos REST/internos documentados.
- **Pruebas:** Validación de sintaxis de diagramas y consistencia entre entidades de BD y endpoints de API.
- **Criterios de aceptación:** Documentos técnicos listos para revisión y aprobación del propietario. *(Completado)*

### Tarea 0.4 — Estrategia de Control de Costos (FinOps) y Validación con el Propietario
- **Objetivo:** Documentar los costos potenciales de Google Maps, IA, S3, servidores y builds móviles junto con sus mitigaciones técnicas y alternativas económicas.
- **Archivos o módulos involucrados:** `ARCHITECTURE.md`, `DECISIONS.md`, `PENDING_DECISIONS.md`.
- **Dependencias:** Tarea 0.3.
- **Resultado esperado:** Tabla de control de costos aprobada y respuestas a las decisiones pendientes de negocio/entorno.
- **Pruebas:** Validación explícita del usuario antes de pasar a Fase 1.
- **Criterios de aceptación:** Aprobación formal del propietario del proyecto para iniciar la Fase 1. *(Completado y Aprobado)*

---

## Desglose Detallado — FASE 1: Construcción de los Fundamentos (✅ Completada)

> **Estado:** Todas las tareas de la Fase 1 han sido implementadas, probadas (`23/23` tareas de Turborepo y `29/29` pruebas automatizadas) y documentadas.

### Tarea 1.1 — Preparación de Herramientas del Entorno Local e Inicialización Git
- **Objetivo:** Asegurar que el entorno cuente con `git` inicializado, `pnpm` activado vía Corepack, Python 3.12+ disponible (o contenedorizado) y variables de entorno base.
- **Archivos o módulos involucrados:** `.gitignore`, `.nvmrc`, `.editorconfig`, `scripts/check-env.ps1`.
- **Dependencias:** Aprobación de Fase 0.
- **Resultado esperado:** Repositorio Git inicializado y script de verificación de entorno ejecutándose en verde.
- **Pruebas:** Ejecución de `pnpm --version`, `docker compose version` y `scripts/check-env.ps1`.
- **Criterios de aceptación:** Todas las herramientas base del monorepo responden correctamente sin errores.

### Tarea 1.2 — Configuración del Monorepositorio (`pnpm` + `Turborepo`) y Paquetes Compartidos
- **Objetivo:** Crear la estructura raíz del monorepo y los paquetes compartidos (`@exploro/config`, `@exploro/shared-types`, `@exploro/validation`, `@exploro/business-rules`, `@exploro/api-client`).
- **Archivos o módulos involucrados:**
  - `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
  - `packages/config/*`
  - `packages/shared-types/src/*`
  - `packages/validation/src/*`
  - `packages/business-rules/src/*`
  - `packages/api-client/src/*`
- **Dependencias:** Tarea 1.1.
- **Resultado esperado:** Paquetes compartidos compilando en TypeScript estricto y exportando tipos, esquemas Zod y reglas iniciales (ej. validación de modalidad `TRAVELER` vs `LOCAL`).
- **Pruebas:** Pruebas unitarias con Vitest/Jest en `packages/validation` y `packages/business-rules`; `pnpm turbo run typecheck test`.
- **Criterios de aceptación:** `typecheck`, `lint` y `test` pasan al 100% en todos los paquetes compartidos.

### Tarea 1.3 — Infraestructura Local con Docker Compose (PostGIS, Redis, MinIO)
- **Objetivo:** Configurar y levantar los servicios de datos locales en contenedores aislados con volúmenes persistentes y healthchecks.
- **Archivos o módulos involucrados:**
  - `infrastructure/docker/docker-compose.yml`
  - `infrastructure/database/init/01-extensions.sql` (`postgis`, `pg_trgm`, `pgcrypto`)
  - `.env.example`
- **Dependencias:** Tarea 1.1.
- **Resultado esperado:** Contenedores de PostgreSQL 16 + PostGIS 3.4, Redis 7 y MinIO (S3 compatible) corriendo y saludables (`healthy`).
- **Pruebas:** Consulta SQL de prueba verificando `SELECT PostGIS_Full_Version();`, `PING` en Redis y verificación de bucket en MinIO.
- **Criterios de aceptación:** Todos los servicios de infraestructura levantan con un solo comando y superan los healthchecks sin credenciales hardcodeadas en código.

### Tarea 1.4 — Esquema Inicial de Base de Datos, Índices Espaciales y Semillas (Seeds)
- **Objetivo:** Implementar las migraciones versionadas para las 14 entidades iniciales de la Fase 1 y cargar datos semilla verificables (países, ciudades iniciales, categorías y subcategorías oficiales).
- **Archivos o módulos involucrados:**
  - `apps/api/prisma/schema.prisma` (o migraciones SQL versionadas)
  - `apps/api/prisma/migrations/*`
  - `apps/api/prisma/seed.ts`
- **Dependencias:** Tarea 1.2, Tarea 1.3.
- **Resultado esperado:** Tablas creadas (`users`, `user_preferences`, `countries`, `cities`, `destinations`, `categories`, `subcategories`, `places`, `establishments`, `activities`, `sources`, `evidences`, `favorites`, `collections`, `audit_logs`, `feature_flags`) con índices `GIST` y `GIN`.
- **Pruebas:** Pruebas de integración de base de datos verificando restricciones de integridad referencial, unicidad y consultas espaciales `ST_DWithin`.
- **Criterios de aceptación:** Migraciones reversibles/aplicables limpiamente y semillas cargadas con las categorías obligatorias (`Comida`, `Turismo` y sus 7 subcategorías, `Entretenimiento`, `Actividades`, `Eventos`, `Compras`).

### Tarea 1.5 — Backend Principal (`apps/api` en NestJS) + Autenticación y Modo Invitado
- **Objetivo:** Construir el núcleo del servidor NestJS con Swagger/OpenAPI, manejo global de errores, logs estructurados, healthchecks y el módulo completo de Autenticación + Perfil + Preferencias.
- **Archivos o módulos involucrados:**
  - `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
  - `apps/api/src/modules/health/*`
  - `apps/api/src/modules/auth/*` (Registro, Login, Logout, Refresh, Recuperación, Guard opcional de invitado)
  - `apps/api/src/modules/users/*`
  - `apps/api/src/modules/categories/*`
- **Dependencias:** Tarea 1.2, Tarea 1.4.
- **Resultado esperado:** API REST documentada en `/api/docs`, permitiendo explorar categorías y bootstrap sin cuenta, y registrarse/iniciar sesión de forma segura con Argon2id y JWT.
- **Pruebas:** Pruebas unitarias y pruebas E2E con Supertest cubriendo registro, login, acceso sin cuenta (guest), rotación de token, rate limiting y rechazo de credenciales inválidas.
- **Criterios de aceptación:** Cobertura de pruebas en módulos de Auth y Health, Swagger operativo y cero vulnerabilidades de exposición de secretos.

### Tarea 1.6 — Esqueleto del Microservicio de IA (`services/ai-engine` en Python + FastAPI)
- **Objetivo:** Configurar el servicio independiente en Python + FastAPI con capa de abstracción de proveedores de IA (`LLMProviderPort`), endpoint de salud y autenticación interna.
- **Archivos o módulos involucrados:**
  - `services/ai-engine/app/main.py`
  - `services/ai-engine/app/core/config.py`
  - `services/ai-engine/app/providers/base.py`
  - `services/ai-engine/tests/test_health.py`
  - `services/ai-engine/Dockerfile`
- **Dependencias:** Tarea 1.3.
- **Resultado esperado:** Servicio FastAPI operativo y comunicado con el backend principal.
- **Pruebas:** Ejecución de `pytest` validando `/health` y la interfaz de abstracción de proveedores.
- **Criterios de aceptación:** Servicio responde con latencia < 50ms en healthcheck y valida correctamente la clave de servicio interno.

### Tarea 1.7 — Aplicación Web Inicial (`apps/web` en Next.js)
- **Objetivo:** Crear la aplicación web para viajeros conectada al backend y a los paquetes compartidos, implementando la pantalla de selección de modalidad («Estoy de viaje» activo vs. «Soy local — próximamente» deshabilitado) y la vista visual de categorías principales.
- **Archivos o módulos involucrados:**
  - `apps/web/src/app/page.tsx` (Selección de modalidad)
  - `apps/web/src/app/explore/page.tsx` (Categorías principales tras elegir «Estoy de viaje»)
  - `apps/web/src/app/auth/*` (Acceso opcional)
  - `apps/web/src/components/*`
- **Dependencias:** Tarea 1.2, Tarea 1.5.
- **Resultado esperado:** Experiencia web rápida, moderna y accesible que no muestra recomendaciones antes de elegir modalidad, bloquea funcionalmente «Soy local» con etiqueta clara de «Próximamente» y carga categorías reales desde el backend.
- **Pruebas:** Pruebas de componentes y flujo de navegación inicial (selección de modalidad -> visualización de categorías + subcategorías de Turismo).
- **Criterios de aceptación:** Compilación limpia (`next build`), diseño moderno orientado a viajeros y cumplimiento estricto de los requisitos de navegación de la Parte V.

### Tarea 1.8 — Aplicación Móvil Inicial (`apps/mobile` en React Native + Expo)
- **Objetivo:** Configurar el proyecto móvil con Expo (preparado para Development Builds en Android e iOS), navegación tipada, almacenamiento local seguro y la misma experiencia inicial («Estoy de viaje» / «Soy local — próximamente» -> Categorías principales).
- **Archivos o módulos involucrados:**
  - `apps/mobile/app.config.ts`
  - `apps/mobile/src/app/*` (Expo Router / React Navigation)
  - `apps/mobile/src/screens/ModeSelectionScreen.tsx`
  - `apps/mobile/src/screens/CategoriesScreen.tsx`
- **Dependencias:** Tarea 1.2, Tarea 1.5.
- **Resultado esperado:** Aplicación móvil nativa fluida consumiendo `@exploro/shared-types` y `@exploro/api-client`, lista para ejecutarse en Android y con configuración iOS válida.
- **Pruebas:** Pruebas unitarias de pantallas/estado con Jest + React Native Testing Library y verificación de compilación/prebuild.
- **Criterios de aceptación:** Todos los criterios de aceptación de la Fase 1 del `MASTER_PROMPT.md` verificados y documentados en `TESTING.md` y `PROJECT_STATUS.md`.

---

## Desglose Detallado — FASE 2: Sistema de Descubrimiento (✅ Completada)

> **Estado:** Todas las tareas de la Fase 2 han sido implementadas, verificadas al 100% (`23/23` tareas de Turborepo, `57/57` pruebas JS/TS automatizadas, y build de producción de Next.js y Expo limpios).

### Tarea 2.1 — Esquema y Semillas del Catálogo Real de EE. UU. con Indicadores de Evidencia
- **Objetivo:** Extender el modelo de base de datos con flag `is_demo_data` en lugares y evidencias, poblar 13 lugares verificados en las principales ciudades de EE. UU. (NYC, Miami, Los Angeles, Chicago, Austin, San Francisco, Orlando) con actividades, duraciones y snippets de evidencias.
- **Archivos involucrados:** `infrastructure/database/init/02-phase2-catalog.sql`.
- **Criterios de aceptación:** Lugares sin fotos inventadas (`image_url = NULL` para demos), precios `UNVERIFIED` etiquetados explícitamente, codificación UTF-8 pura. *(Completado)*

### Tarea 2.2 — Reglas de Negocio de Filtrado, Ordenamiento y Presupuesto
- **Objetivo:** Implementar la lógica pura de evaluación presupuestaria (`evaluateBudgetFit`), ordenamiento jerárquico (`placeSortBySchema`), estimación de tiempos de viaje y algoritmo de selección determinista/pseudoaleatorio para "Sorpréndeme".
- **Archivos involucrados:** `packages/business-rules/src/*`, `packages/validation/src/*`, `packages/shared-types/src/*`.
- **Criterios de aceptación:** Cobertura de pruebas unitarias al 100% (11/11 en business-rules, 8/8 en validation). Precios desconocidos nunca se asumen baratos. *(Completado)*

### Tarea 2.3 — Módulo de Catálogo y Búsqueda Espacial en Backend (`apps/api`)
- **Objetivo:** Implementar `CatalogService` y `CatalogController` con consultas espaciales en PostGIS (`ST_DWithin`, `ST_Distance`), soporte de radio acotado vs `unbounded`, scoring dinámico según preferencias del usuario y endpoint `POST /discover/surprise-me`.
- **Archivos involucrados:** `apps/api/src/modules/catalog/*`.
- **Criterios de aceptación:** Búsquedas por texto, categoría, ciudad, coordenadas y ordenamiento funcional. 19 pruebas de integración e2e pasando en `phase2.integration.test.ts`. *(Completado)*

### Tarea 2.4 — Módulo de Biblioteca de Usuario (Favoritos y Colecciones)
- **Objetivo:** Implementar `LibraryService` y `LibraryController` para la gestión idempotente de favoritos y colecciones personalizadas (creación, edición, eliminación de colecciones e items) con aislamiento estricto por usuario autenticado.
- **Archivos involucrados:** `apps/api/src/modules/library/*`.
- **Criterios de aceptación:** Control de propiedad de recursos, nombres únicos de colección por usuario, tests de integración e2e cubriendo flujos completos. *(Completado)*

### Tarea 2.5 — Cliente de API Tipado (`@exploro/api-client`)
- **Objetivo:** Proveer métodos tipados para el nuevo conjunto de endpoints: `surpriseMe`, `listFavorites`, `addFavorite`, `removeFavorite`, `listCollections`, `createCollection`, `getCollection`, `deleteCollection`, `addCollectionItem`, `removeCollectionItem` y `getPlaceBySlug`.
- **Archivos involucrados:** `packages/api-client/src/index.ts`.
- **Criterios de aceptación:** Compatibilidad universal en Node, web (Next.js) y mobile (Expo React Native). *(Completado)*

### Tarea 2.6 — Interfaz Web de Descubrimiento con MapLibre GL (`apps/web`)
- **Objetivo:** Construir la experiencia web completa de descubrimiento: barra de filtros avanzados (ciudades EE. UU., categorías, orden, radio en millas y modo sin límites), visualizador de mapa dinámico MapLibre GL (OpenFreeMap Liberty), tarjetas con badges DEMO/unverified, modal de detalle con actividades y evidencias, modal de "Sorpréndeme", y panel de Favoritos y Colecciones.
- **Archivos involucrados:** `apps/web/src/app/page.tsx`, `apps/web/src/components/*`, `apps/web/src/hooks/*`, `apps/web/src/lib/format.ts`.
- **Criterios de aceptación:** Next.js 14 build exitoso (`next build`), SSR handling para WebGL con `next/dynamic`, 4 pruebas unitarias pasando. *(Completado)*

### Tarea 2.7 — Aplicación Móvil con Descubrimiento, Búsqueda y Sorpréndeme (`apps/mobile`)
- **Objetivo:** Actualizar la aplicación móvil Expo React Native para incluir búsqueda en tiempo real, selector de ciudades clave de EE. UU., filtros de categorías, selector de orden, favoritos locales inmutables, modal de detalle de actividades/evidencias, y modal interactivo de "Sorpréndeme" con estimación de traslados y tags de ajuste presupuestario/temporal.
- **Archivos involucrados:** `apps/mobile/App.tsx`, `apps/mobile/src/format.ts`, `apps/mobile/src/mobile.test.ts`.
- **Criterios de aceptación:** TypeScript estricto sin errores, 6/6 pruebas unitarias pasando con Vitest. *(Completado)*

### Tarea 2.8 — Verificación Global y Documentación de Cierre de Fase 2
- **Objetivo:** Ejecutar pipeline completo de monorepo (`turbo run build typecheck test`), actualizar documentación de arquitectura, base de datos, roadmap, testing y changelog.
- **Criterios de aceptación:** Cero errores en monorepo, 57 pruebas automatizadas pasando, listo para revisión del usuario. *(Completado)*

---

## Desglose Detallado — FASE 3: Integración de Mapas y Fuentes (✅ Completada)

> **Estado:** Todas las tareas de la Fase 3 han sido implementadas, verificadas al 100% (`23/23` tareas de Turborepo, `82/82` pruebas automatizadas, builds de producción limpios).

### Tarea 3.1 — Servicios Geoespaciales Costo Cero ($0.00): Autocompletado, Geocodificación Inversa y Rutas
- **Objetivo:** Implementar endpoints geoespaciales sin dependencia de APIs de pago comerciales (Google Maps / Mapbox APIs).
- **Archivos involucrados:** `apps/api/src/modules/geo/*`, `packages/shared-types/src/index.ts`, `packages/validation/src/index.ts`, `packages/business-rules/src/index.ts`.
- **Criterios de aceptación:**
  - `GET /geo/autocomplete`: Búsqueda de prefijos y similitud trigram (`pg_trgm`) en PostGIS sobre ciudades y lugares en EE. UU., con caché en Redis.
  - `GET /geo/reverse`: Geocodificación inversa mediante operador de distancia espacial `<->` de PostGIS con caché en Redis.
  - `POST /geo/route`: Cálculo determinista de rutas (distancia, duración en modos `driving` / `walking` / `cycling`, pasos paso a paso y geometría GeoJSON `LineString`).
  - Pruebas de integración pasando al 100%. *(Completado)*

### Tarea 3.2 — Registro y Sincronización de Fuentes de Datos
- **Objetivo:** Gestionar fuentes de información de terceros y de la comunidad de forma ética, legal y auditable.
- **Archivos involucrados:** `apps/api/src/modules/sources/*`, `packages/validation/src/index.ts`.
- **Criterios de aceptación:**
  - `GET /sources`: Listado de fuentes autorizadas con contadores de evidencias.
  - `POST /sources`: Registro controlado de fuentes con validación de código único y tipo de fuente (`OFFICIAL_OPEN_DATA`, `EDITORIAL_BLOG`, `COMMUNITY_FORUM`, `SOCIAL_MEDIA`, `DIRECT_PARTNER`).
  - `POST /sources/:id/sync`: Pipeline de sincronización que genera evidencias con hash determinista (`content_hash`) para evitar duplicaciones. *(Completado)*

### Tarea 3.3 — Sistema de Ingestión de Evidencias Auditables
- **Objetivo:** Ingesta de testimonios, reseñas públicas y datos verificables asociados a lugares, con cálculo transparente de confianza y recálculo determinista de scores.
- **Archivos involucrados:** `apps/api/src/modules/evidences/*`, `packages/business-rules/src/index.ts`.
- **Criterios de aceptación:**
  - `GET /places/:placeId/evidences`: Listado paginado y ordenado por confianza y fecha de evidencias de un lugar.
  - `POST /evidences`: Ingestión con hashing determinista SHA-256 / FNV-1a para descartar duplicados y recálculo automático e inmutable de la reputación en `place_scores`. *(Completado)*

### Tarea 3.4 — Normalización de Nombres y Deduplicación Segura de Lugares
- **Objetivo:** Evitar la duplicación de lugares generada por múltiples fuentes de datos sin fusionar erróneamente lugares distintos.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `apps/api/src/modules/normalization/*`.
- **Criterios de aceptación:**
  - `normalizePlaceName`: Normalización de caracteres, tildes, minúsculas y eliminación de sufijos corporativos comunes (`llc`, `inc`, `restaurant`).
  - `evaluatePlaceDuplicate`: Detección en 3 niveles: `<25m` & `>=0.90` -> `AUTO_MERGE`; `<250m` & `>=0.65` o `<500m` & `>=0.85` -> `MANUAL_REVIEW`; de lo contrario `NO_DUPLICATE`. Nunca se fusiona en caso de ambigüedad.
  - `GET /normalization/duplicates`: Detección espacial PostGIS `ST_DWithin` + `pg_trgm` con clasificación estricta de candidatos. *(Completado)*

### Tarea 3.5 — Integración de Mapas y Rutas en Clientes Web y Móvil
- **Objetivo:** Visualización de rutas y evidencias en MapLibre GL (Web) y Expo (Mobile).
- **Archivos involucrados:** `apps/web/src/components/MapView.tsx`, `apps/web/src/components/FiltersBar.tsx`, `apps/web/src/components/PlaceDetail.tsx`, `apps/web/src/app/page.tsx`, `apps/mobile/App.tsx`, `apps/mobile/src/mobile.test.ts`.
- **Criterios de aceptación:**
  - Web: Dibujado de rutas GeoJSON sobre MapLibre GL, autocompletado en barra de búsqueda y botón de trazado de ruta en el detalle del lugar.
  - Mobile: Autocompletado en tiempo real, modal de ruta paso a paso ("🚗 Cómo llegar") con distancias en millas y tiempos de viaje, y badges de evidencias auditables. *(Completado)*

---

## Desglose Detallado — FASE 4: Motor de Inteligencia y Recomendaciones (✅ Completada)

> **Estado:** Todas las tareas de la Fase 4 han sido implementadas, probadas al 100% (`23/23` tareas de Turborepo, `97/97` pruebas automatizadas, builds de producción limpios).

### Tarea 4.1 — Procesamiento de Opiniones y Clasificación de Aspectos en `services/ai-engine`
- **Objetivo:** Implementar la taxonomía oficial de aspectos para comida y turismo, detectando aspectos positivos, negativos, menciones de precios y actividades sugeridas.
- **Archivos involucrados:** `services/ai-engine/app/main.py`, `services/ai-engine/tests/test_ai_engine.py`.
- **Criterios de aceptación:**
  - `POST /internal/v1/opinions/extract-aspects`: Taxonomía para comida (*Sabor y calidad, Atención y servicio, Relación calidad-precio, Ambiente y comodidad, Porciones abundantes, Especialidades*) y turismo (*Experiencia y vista, Accesibilidad, Duración, Costo y gratuidad, Seguridad, Valor cultural, Recomendación imperdible*).
  - Detección de críticas y advertencias (*Largas filas y espera, Lugar abarrotado, Precios elevados, Atención mejorable*).
  - 8 pruebas de `pytest` superadas al 100% sin costo de API por token ($0.00). *(Completado)*

### Tarea 4.2 — Guardián Anti-Alucinaciones y Generación de Explicaciones Transparentes
- **Objetivo:** Generar explicaciones fundamentadas exclusivamente en evidencias reales y bloquear alucinaciones.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `services/ai-engine/app/main.py`.
- **Criterios de aceptación:**
  - `verifyAntiHallucination`: Verificación multifactorial (existencia del lugar, respaldo textual obligatorio de aspectos, detección de contradicciones, marcado como `INSUFFICIENT_DATA` si no hay evidencias).
  - `resolveSafeRecommendationReason`: Mensaje transparente *"Evidencia limitada: aún estamos recopilando más experiencias verificadas para este lugar."* cuando no hay respaldo. *(Completado)*

### Tarea 4.3 — Motor de Ranking Determinista y Explicable
- **Objetivo:** Calcular la reputación y confianza de un lugar sin depender de estrellas de terceros ni de la discrecionalidad de un LLM.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `packages/shared-types/src/index.ts`.
- **Criterios de aceptación:**
  - `calculateDeterministicPlaceScore`: Fórmula determinista que pondera confianza de evidencias, decaimiento por antigüedad, consistencia entre opiniones y diversidad de fuentes. *(Completado)*

### Tarea 4.4 — Módulo de Recomendaciones y Métricas FinOps en Backend NestJS
- **Objetivo:** Orquestar el motor de recomendaciones, persistir aspectos en `place_scores`, gestionar caché en Redis y auditar costos.
- **Archivos involucrados:** `apps/api/src/modules/recommendations/*`, `apps/api/src/phase4.integration.test.ts`.
- **Criterios de aceptación:**
  - `GET /places/:placeId/recommendation-summary`: Retorna el resumen con score, nivel de confianza, explicación auditada y aspectos respaldados, con caché Redis.
  - `POST /places/:placeId/recalculate-aspects`: Extracción y actualización determinista en base de datos.
  - `GET /ai/metrics`: Auditoría de solicitudes, aspectos extraídos, alucinaciones bloqueadas y costo total de operación ($0.00).
  - 6 pruebas de integración pasando en `phase4.integration.test.ts` (42 pruebas totales de API). *(Completado)*

### Tarea 4.5 — Experiencia Visual de Recomendaciones en Web y Mobile
- **Objetivo:** Presentar las recomendaciones y aspectos explicables al viajero con total transparencia.
- **Archivos involucrados:** `apps/web/src/components/PlaceDetail.tsx`, `apps/mobile/App.tsx`, `apps/mobile/src/mobile.test.ts`.
- **Criterios de aceptación:**
  - Web: Bloque de recomendación en detalle de lugar con badge de puntuación, explicación verificada, chips de aspectos positivos/negativos y sello de auditoría.
  - Mobile: Tarjeta de recomendación inteligente en modal con aspectos positivos, advertencias de viajeros y política de costo cero. *(Completado)*

---

## Desglose Detallado — FASE 5: Sistema de Experiencias Propias (✅ Completada)

> **Estado:** Todas las tareas de la Fase 5 han sido implementadas, probadas al 100% (`23/23` tareas de Turborepo, `115/115` pruebas automatizadas, builds de producción limpios).

### Tarea 5.1 — Registro y Ciclo de Vida de «Comenzar Actividad»
- **Objetivo:** Implementar la acción «Comenzar actividad» registrando usuario, lugar, actividad, marca temporal y estado (`STARTED`, `COMPLETED`, `CANCELLED`).
- **Archivos involucrados:** `infrastructure/database/init/03-phase5-experiences.sql`, `apps/api/src/modules/experiences/*`, `packages/shared-types`, `packages/validation`.
- **Criterios de aceptación:**
  - `POST /experiences/start`: Registra el inicio de actividad con estado `STARTED` y `verification_method = 'NONE'`.
  - `GET /experiences/active`: Permite consultar y sincronizar en tiempo real la experiencia activa del usuario. *(Completado)*

### Tarea 5.2 — Cuestionarios Cortos Adaptados (Restaurantes vs. Turismo)
- **Objetivo:** Solicitar voluntariamente una opinión al finalizar sin abrumar con formularios largos, adaptando las preguntas según la categoría.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `apps/web/src/components/PlaceDetail.tsx`, `apps/mobile/App.tsx`.
- **Criterios de aceptación:**
  - Restaurantes: Calidad y sabor, atención, relación calidad-precio, precio pagado, plato recomendado, si volvería y comentario.
  - Turismo: Si valió la pena, duración invertida, accesibilidad, gasto, recomendación clave y advertencia para otros visitantes. *(Completado)*

### Tarea 5.3 — Verificación Opcional de Visita (GPS y Códigos QR)
- **Objetivo:** Validar presencia real sin asumir falsamente que el simple inicio prueba la visita.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `apps/api/src/modules/experiences/*`.
- **Criterios de aceptación:**
  - `POST /experiences/:id/verify-visit`:
    - Por GPS: Comprobación con distancia esférica Haversine y PostGIS `ST_DWithin` $\le 100\text{ m}$. Si excede 100m, se rechaza la verificación y se mantiene `NONE`.
    - Por QR: Validación de tokens oficiales del lugar (`EXPLORO-QR-<slug>`).
  - Marca `is_verified_visit = TRUE` y método correspondiente únicamente tras superar la comprobación. *(Completado)*

### Tarea 5.4 — Integración Inmutable al Motor de Recomendaciones y Ranking
- **Objetivo:** Ingestar cada opinión propia como evidencia auditable en `evidences` y recalcular el ranking determinista con bonos de confianza nativos.
- **Archivos involucrados:** `apps/api/src/modules/experiences/experiences.service.ts`, `packages/business-rules/src/index.ts`.
- **Criterios de aceptación:**
  - Creación de fila en `evidences` con `source_code = 'EXPLORO_NATIVE'`.
  - Ponderación nativa superior: $1.35\times$ para visitas verificadas (confianza 0.95), $1.15\times$ para opiniones no verificadas (confianza 0.75).
  - Recálculo determinista inmediato de `place_scores` incrementando `total_native_reviews`.
  - `GET /places/:placeId/reviews`: Listado ordenado priorizando testimonios con visita verificada. *(Completado)*

### Tarea 5.5 — Flujos Visuales en Clientes Web y Mobile
- **Objetivo:** Integrar la experiencia de usuario completa para inicio, verificación y opiniones en Web y Móvil.
- **Archivos involucrados:** `apps/web/src/components/PlaceDetail.tsx`, `apps/mobile/App.tsx`, `apps/mobile/src/mobile.test.ts`.
- **Criterios de aceptación:**
  - Web: Botón «Comenzar actividad», banner de actividad activa, verificación vía geolocalización del navegador, modal adaptado y lista de opiniones con badge `[✓ Visita Verificada]`.
  - Mobile: Botón en tarjeta modal, verificación GPS, formulario conciso con selector de calificación por estrellas y listado de opiniones nativas. *(Completado)*

---

## Desglose Detallado — FASE 6: Planificador de Viajes — Oculto bajo Feature Flag (✅ Completada)

> **Estado:** Fase 6 implementada, probada y validada en su totalidad con 133 pruebas pasando en el monorepo. Permanece oculta para usuarios públicos mediante `trip_planner_enabled = false` en `feature_flags` y guardia de bypass interno (`x-exploro-internal: true`).

### Tarea 6.1 — Modelo de Datos para Viajes, Días e Ítems (`04-phase6-trips.sql`)
- **Objetivo:** Crear tablas relacionales con soporte geoespacial para viajes (`trips`), días (`trip_days`) e ítems cronológicos de actividades (`trip_items`).
- **Archivos involucrados:** `infrastructure/database/init/04-phase6-trips.sql`.
- **Criterios de aceptación:**
  - Restricciones de integridad referencial en cascada y check constraints (`budget_tier`, `status`).
  - Restricción única `(trip_day_id, order_index)` para el orden secuencial de actividades. *(Completado)*

### Tarea 6.2 — Feature Flag Guard y Endpoints en Backend NestJS (`apps/api`)
- **Objetivo:** Proteger todos los endpoints del planificador (`/trips/*`) bajo `TripsFeatureFlagGuard`, bloqueando acceso público (HTTP 403) y permitiendo acceso de desarrollo/testing vía `x-exploro-internal: true`.
- **Archivos involucrados:** `apps/api/src/modules/trips/trips.guard.ts`, `apps/api/src/modules/trips/trips.service.ts`, `apps/api/src/modules/trips/trips.controller.ts`.
- **Criterios de aceptación:**
  - CRUD completo de viajes, días automáticos y actividades.
  - Cálculo de distancias y tiempos de traslado entre lugares consecutivos usando PostGIS `ST_Distance(p1.location, p2.location)` ($0.00). *(Completado)*

### Tarea 6.3 — Motor de Planificación Asistida Determinista (Paso 6.2 y 6.3)
- **Objetivo:** Generar itinerarios lógicos y balanceados agrupando actividades por proximidad y bloques horarios (Mañana, Almuerzo, Tarde, Cena) sin alucinaciones ni costos de tokens.
- **Archivos involucrados:** `apps/api/src/modules/trips/trips.service.ts`, `packages/business-rules/src/index.ts`.
- **Criterios de aceptación:**
  - `POST /trips/assisted-plan`: Asigna lugares según reputación determinista y categoría adecuada para el horario. *(Completado)*

### Tarea 6.4 — Clasificación de Alternativas en 3 Niveles (Paso 6.4)
- **Objetivo:** Al seleccionar un lugar, ofrecer alternativas inteligentes clasificadas en tres niveles objetivos.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `apps/api/src/modules/trips/trips.service.ts`.
- **Criterios de aceptación:**
  - `verySimilar` (Nivel 1): Misma categoría, distancia $\le 2.5\text{ km}$, duración similar ($\le 45\text{ min}$).
  - `relatedExperiences` (Nivel 2): Experiencias complementarias en la misma zona ($\le 6\text{ km}$).
  - `requiresAdjustments` (Nivel 3): Opciones de alto valor que requieren mayor traslado ($> 6\text{ km}$) o reprogramación. *(Completado)*

### Tarea 6.5 — Reorganización Inteligente con Gobernanza y Sin Modificaciones Silenciosas (Paso 6.6)
- **Objetivo:** Proponer ajustes en horarios de actividades posteriores cuando una actividad se retrasa o prolonga, explicando el motivo al usuario y exigiendo aprobación explícita antes de mutar la base de datos.
- **Archivos involucrados:** `packages/business-rules/src/index.ts`, `apps/api/src/modules/trips/trips.service.ts`.
- **Criterios de aceptación:**
  - `POST /trips/:id/items/:itemId/reorganize-preview`: Previsualización con explicaciones detalladas y bandera `scheduleOverflowsDay` si excede las 23:30.
  - `POST /trips/:id/apply-reorganization`: Aplicación atómica de desplazamientos únicamente tras la confirmación del usuario. *(Completado)*

### Tarea 6.6 — Vistas Protegidas en Clientes Web y Mobile
- **Objetivo:** Desarrollar interfaces para el planificador de viajes asistido en Next.js y Expo, con selectores de modo interno.
- **Archivos involucrados:** `apps/web/src/components/TripPlannerPanel.tsx`, `apps/web/src/app/page.tsx`, `apps/mobile/App.tsx`, `apps/mobile/src/mobile.test.ts`.
- **Criterios de aceptación:**
  - Web: Panel flotante con selector de viajes, días, modal de 3 niveles de alternativas y previsualización interactiva de reorganización.
  - Mobile: Pestaña `🗺️ Viajes`, tarjetas de itinerario, modal de alternativas en 3 niveles y ajuste de horarios con bypass interno para testing. *(Completado)*






