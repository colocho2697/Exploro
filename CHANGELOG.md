# Registro de Cambios (Changelog) — Exploro

Todos los cambios importantes en la arquitectura, código, base de datos y documentación de este proyecto se registrarán en este archivo.

---

## [1.0.0] — 2026-11-11 (Fase 8: Pruebas, Optimización y Lanzamiento Completada — Versión de Producción)

### Agregado
- **Suite de Pruebas Técnicas, Seguridad y Rendimiento (`apps/api/src/phase8.security-perf.test.ts`)**:
  - 8 pruebas exhaustivas de backend en NestJS + PostgreSQL + Redis:
    - Neutralización de inyección SQL en endpoints de catálogo y búsqueda geoespacial.
    - Mitigación y preservación segura contra cross-site scripting (XSS) en opiniones de usuarios y reportes comunitarios.
    - Rechazo de tokens JWT alterados o falsificados con código de estado HTTP 401 Unauthorized.
    - Benchmark de latencia de consultas espaciales PostGIS `ST_DWithin` ($< 80\text{ ms}$).
    - Benchmark de latencia de lecturas en caché de Redis ($< 30\text{ ms}$).
    - Prueba de estrés con 20 peticiones concurrentes de descubrimiento sin pérdida de paquetes ni bloqueos en pool de conexiones.
    - Verificación programática de costo cero ($0.00) en el arranque del sistema (bootstrap).
    - Consistencia transaccional concurrente en `audit_logs`.
- **Módulo de Resiliencia Móvil y Optimización (`apps/mobile/src/offline.ts` & `mobile.test.ts`)**:
  - `OfflineStorageManager`: Gestor de almacenamiento en caché con soporte para *stale-while-offline*.
  - `getScreenCategory` & `getGridColumns`: Detección responsiva de factores de forma (`PHONE_COMPACT` < 360dp, `PHONE_STANDARD` 360-600dp, `TABLET` $\ge 600\text{dp}$).
  - `resolveLocationStrategy`: Degradación elegante y selección de ciudad manual cuando los permisos de geolocalización son denegados por el usuario.
  - `validateBatteryFriendlyInterval`: Restricción que exige intervalos de rastreo GPS $\ge 30\text{s}$ para salvaguardar la batería del dispositivo.
  - 4 pruebas unitarias adicionales en `apps/mobile/src/mobile.test.ts` (14 pruebas totales en mobile).
- **Optimización y Contenerización de Producción (`infrastructure/docker/`)**:
  - Ejecución de `VACUUM ANALYZE` sobre la base de datos PostgreSQL 16 + PostGIS.
  - `Dockerfile.api`: Contenedor multi-stage optimizado para NestJS en Node Alpine.
  - `Dockerfile.web`: Contenedor de producción para Next.js 14 en modo standalone (133 kB First Load JS).
  - `docker-compose.prod.yml`: Orquestador de producción con límites de memoria por servicio, healthchecks y configuración de costo cero.
- **Marco Legal, Metadatos de Publicación y Despliegue (`docs/`)**:
  - `docs/LEGAL_PRIVACY_POLICY.md`: Política de privacidad en cumplimiento con CCPA y GDPR; política estricta de no venta de datos y recolección opcional de GPS para visitas verificadas.
  - `docs/TERMS_OF_SERVICE.md`: Términos de servicio regulados bajo las leyes del Estado de Delaware; inmutabilidad de testimonios y cláusula de exención.
  - `docs/STORE_METADATA.md`: Títulos, descripciones y palabras clave optimizadas para el mercado de Estados Unidos en App Store y Google Play; arquitectura de 6 diapositivas de capturas de pantalla y despliegue por fases (NYC, SFO, CHI).
  - `docs/DEPLOYMENT_CHECKLIST.md`: Guía de despliegue pre-vuelo y pruebas de humo post-instalación.
- **Verificación Global y Puerta de Calidad**:
  - Total global: **155 pruebas automatizadas en monorepo + 8 pruebas en Python = 163 pruebas pasando (100% Green)**.
  - 23/23 tareas de compilación, verificación de tipos y tests exitosas en Turborepo.

---

## [0.8.0] — 2026-11-11 (Fase 7: Administración, Control y Gobernanza Inmutable Completada)

### Agregado
- **Modelo de Datos y Migración de Base de Datos (`05-phase7-admin.sql`)**:
  - Tabla `content_reports`: Reportes comunitarios sobre lugares, opiniones o evidencias con estados (`PENDING`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`) y notas de resolución.
  - Tabla `processing_errors`: Registro de errores de procesamiento de IA local e ingesta con resolución auditada.
  - Tabla `ai_models_config`: Configuración local de hiperparámetros de modelos de IA ($0.00 Ollama).
  - Índices de alto rendimiento en `audit_logs` (`(entity_type, entity_id)`, `actor_user_id`, `created_at DESC`).
  - Restricción ampliada `chk_user_reviews_moderation` con estados (`PUBLISHED`, `FLAGGED`, `HIDDEN`, `REJECTED`, `DISPUTED`).
- **Gobernanza y Reglas de Inmutabilidad (`packages/business-rules` y `packages/validation`)**:
  - `validateAdminAuditRequest`: Exige motivo de auditoría obligatorio de al menos 10 caracteres para cualquier acción administrativa; segmenta permisos entre `ADMIN` y `MODERATOR`.
  - `assertContentImmutability`: Cumple el mandato estricto de MASTER_PROMPT.md: prohibición absoluta de alteración silenciosa de testimonios o evidencias. El texto es inviolable; solo se permite moderar estados.
  - `evaluateModerationTransition`: Valida transiciones de estado legales.
  - Esquemas Zod: `moderateContentSchema`, `updateUserRoleSchema`, `updateFeatureFlagSchema`, `createReportSchema`, `resolveReportSchema`, `adminUpdatePlaceSchema`.
- **Módulo Backend NestJS de Administración (`apps/api/src/modules/admin/`)**:
  - `AdminGuard`: Guardia RBAC que restringe accesos a `ADMIN` y `MODERATOR`, bloqueando usuarios `TRAVELER` con HTTP 403 Forbidden.
  - `AdminService` y `AdminController`: Métricas (`GET /admin/stats`), trazabilidad (`GET /admin/audit-logs`), usuarios (`GET /admin/users`, `PATCH /admin/users/:id/role`), corrección de coordenadas PostGIS (`PATCH /admin/places/:id`), moderación (`POST /admin/moderation/review/:id`, `POST /admin/moderation/evidence/:id`), feature flags (`GET /admin/feature-flags`, `PATCH /admin/feature-flags/:key`), reportes comunitarios (`POST /reports`, `GET /admin/reports`, `PATCH /admin/reports/:id`), errores (`GET /admin/errors`, `PATCH /admin/errors/:id/resolve`) y modelos de IA (`GET /admin/ai-models`, `PATCH /admin/ai-models/:modelName`).
  - 10 pruebas de integración E2E en `apps/api/src/phase7.integration.test.ts` (69 pruebas totales en `apps/api`).
- **SDK y Servicio Operativo (`apps/admin`)**:
  - `AdminDashboardService`: Módulo para operaciones administrativas con 5 pruebas unitarias passing.
- **Panel Web Administrativo Interactivo (`apps/web`)**:
  - `AdminControlPanel.tsx`: Interfaz web completa con métricas del sistema, control en caliente de feature flags con modal de motivo de auditoría obligatorio, moderación de reportes, historial inmutable y monitoreo de modelos de IA locales.
- **Verificación Global y Puerta de Calidad**:
  - Total global: **147 pruebas en monorepo + 8 pruebas en Python = 155 pruebas automatizadas pasando (100% Green)**. 23 tareas de Turborepo ejecutadas limpiamente.

---

## [0.7.0] — 2026-11-11 (Fase 6: Planificador de Viajes — Oculto bajo Feature Flag Completada)

### Agregado
- **Modelo de Datos y Migración de Base de Datos (`04-phase6-trips.sql`)**:
  - Tabla `trips`: Metadatos de viaje (`title`, `destination_id`, `city_slug`, `start_date`, `end_date`, `budget_tier`, `travel_styles`, `flexibility_minutes`, `status`).
  - Tabla `trip_days`: Días secuenciales del viaje (`day_number`, `date`, `title`, `theme`).
  - Tabla `trip_items`: Actividades cronológicas por día con restricción única `(trip_day_id, order_index)` y cálculo de traslados (`transit_minutes_from_prev`, `transit_distance_meters_from_prev`).
- **Feature Flag y Seguridad (`TripsFeatureFlagGuard`)**:
  - Bloqueo público estricto: responde HTTP 403 Forbidden cuando `trip_planner_enabled = false` en `feature_flags`.
  - Bypass interno para desarrollo y QA mediante cabecera `x-exploro-internal: true` o `x-feature-override: trip-planner`.
- **Reglas de Negocio para Planificación y Reorganización (`packages/business-rules`)**:
  - `classifyActivityAlternatives`: Clasificación determinista en 3 niveles (Nivel 1: Muy Similares, Nivel 2: Experiencias Relacionadas, Nivel 3: Requiere Ajustes).
  - `detectReorganizationImpact`: Detección anticipada del impacto de retrasos o modificaciones de horario en actividades subsecuentes. No realiza mutaciones silenciosas en base de datos.
  - Alerta de rebase de día (`scheduleOverflowsDay`) si la jornada concluye después de las 23:30.
- **Módulo de Viajes en Backend NestJS (`apps/api/src/modules/trips/`)**:
  - Endpoints CRUD: `POST /trips`, `GET /trips`, `GET /trips/:id`, `PATCH /trips/:id`, `DELETE /trips/:id`.
  - Gestión de actividades: `POST /trips/:id/days/:dayId/items`, `PATCH /trips/:id/items/:itemId`, `DELETE /trips/:id/items/:itemId`, `POST /trips/:id/days/:dayId/reorder`.
  - `POST /trips/assisted-plan`: Generador de itinerarios balanceados (Mañana, Almuerzo, Tarde, Cena) por proximidad y puntuación determinista.
  - `GET /trips/:id/items/:itemId/alternatives`: Consulta de alternativas en 3 niveles con distancias y tiempos de traslado.
  - `POST /trips/:id/items/:itemId/reorganize-preview`: Previsualización explicativa del impacto de reorganización.
  - `POST /trips/:id/apply-reorganization`: Confirmación y aplicación explícita de desplazamientos horarios aprobados por el usuario.
  - 10 pruebas de integración en `src/phase6.integration.test.ts` (59 pruebas totales en API).
- **Clientes Web y Mobile (`apps/web` y `apps/mobile`)**:
  - Web: Componente `TripPlannerPanel.tsx` con tabs de días, visualización de traslados, modal de 3 niveles de alternativas y previsualización interactiva de reorganización.
  - Mobile: Pestaña `🗺️ Viajes` en `App.tsx`, conmutador de cabecera interna para testing, modal de alternativas clasificadas en 3 niveles y modal interactivo de reorganización.
- **Verificación Global y Puerta de Calidad**:
  - Total global: **133 pruebas automatizadas pasando (100% Green)**, 12/12 typecheck exitosos y 8/8 builds en Turborepo.

---

## [0.6.0] — 2026-11-11 (Fase 5: Sistema de Experiencias Propias Completada)

### Agregado
- **Modelo de Datos y Migración de Base de Datos (`03-phase5-experiences.sql`)**:
  - Tabla `activity_logs`: Registro del ciclo de vida de actividades (`STARTED`, `COMPLETED`, `CANCELLED`), método de verificación (`NONE`, `GPS_PROXIMITY`, `QR_CODE`), marcas temporales e integridad referencial en cascada.
  - Tabla `user_reviews`: Almacenamiento de opiniones adaptadas por categoría (`taste_quality`, `service_rating`, `value_for_money`, `worth_it`, `duration_spent`, `accessibility`, `amount_paid`, `recommended_item`, `caveat_or_tip`, `would_return_or_recommend`, `is_verified_visit`).
  - Fuente oficial comunitaria `EXPLORO_NATIVE` configurada con tipo `NATIVE_EXPERIENCE` y peso base de 0.95.
- **Reglas de Negocio para Experiencias Propias (`packages/business-rules`)**:
  - `verifyProximityForVisit`: Algoritmo geodésico Haversine esférico que valida presencia física en un radio $\le 100\text{ m}$. Cumple la regla inquebrantable: *el simple inicio de actividad no prueba la visita*.
  - `verifyQrTokenForPlace`: Validación de tokens QR oficiales del establecimiento (`EXPLORO-QR-<slug/uuid>`).
  - `determineReviewTypeForCategory`: Clasificación adaptada (`RESTAURANT` para comida, `TOURISM` para turismo y atracciones).
  - `calculateNativeSentimentScore`: Función determinista que calcula el sentimiento (-1 a +1) a partir de respuestas estructuradas sin costo de IA ($0.00).
  - Bonos en el ranking determinista: $1.35\times$ para visitas verificadas (confianza 0.95) y $1.15\times$ para opiniones nativas sin verificar (confianza 0.75).
- **Esquemas de Validación y Tipos Compartidos (`@exploro/validation` & `@exploro/shared-types`)**:
  - Esquemas Zod: `startActivitySchema`, `verifyVisitSchema`, `restaurantReviewSchema`, `tourismReviewSchema`, `completeActivityReviewSchema`.
  - Contratos DTO: `ActivityLogDTO`, `VerifyVisitDTO`, `VerifyVisitResponse`, `UserReviewDTO`.
- **Módulo de Experiencias en Backend NestJS (`apps/api/src/modules/experiences/`)**:
  - `POST /experiences/start`: Inicio de actividad con usuario autenticado.
  - `GET /experiences/active`: Consulta y sincronización de actividad en curso.
  - `POST /experiences/:id/verify-visit`: Verificación opcional por GPS o QR.
  - `POST /experiences/:id/complete`: Finalización de actividad, inserción de reseña, ingesta automática en `evidences` como fuente `EXPLORO_NATIVE` y recálculo determinista de `place_scores`.
  - `GET /places/:placeId/reviews`: Consulta de opiniones comunitarias ordenadas por estado de verificación y fecha.
  - 7 pruebas de integración en `src/phase5.integration.test.ts` (49 pruebas totales en API).
- **Clientes Web y Mobile (`apps/web` y `apps/mobile`)**:
  - Web: Botón «Comenzar actividad», banner de actividad activa con verificación GPS del navegador, modal adaptado de preguntas cortas y lista de opiniones con badge `[✓ Visita Verificada]`.
  - Mobile: Botón de inicio en modal de lugar, verificación de proximidad GPS, selector interactivo de estrellas y listado de opiniones comunitarias.
- **Verificación Global y Puerta de Calidad**:
  - Total global: **115 pruebas automatizadas pasando (100% Green)** y 23/23 tareas exitosas en Turborepo.

---

## [0.5.0] — 2026-11-11 (Fase 4: Motor de Inteligencia y Recomendaciones Completada)

### Agregado
- **Taxonomía y Procesamiento de Opiniones en `services/ai-engine` (Python + FastAPI)**:
  - `POST /internal/v1/opinions/extract-aspects`: Extracción estructurada de aspectos positivos (*Sabor y calidad, Atención y servicio, Relación calidad-precio, Ambiente y comodidad, Porciones abundantes, Especialidades* para restaurantes; *Experiencia y vista, Accesibilidad, Duración, Costo y gratuidad, Seguridad, Valor cultural, Recomendación imperdible* para turismo).
  - Detección de advertencias y críticas (*Largas filas y espera, Lugar abarrotado o ruidoso, Precios elevados, Atención mejorable*).
  - Extracción automática de precios detectados y actividades recomendadas sin costos de API por token ($0.00).
- **Guardián Anti-Alucinaciones (`FactCheckerGuard` y `verifyAntiHallucination`)**:
  - Verificación estricta de afirmaciones contra evidencias textuales registradas en `packages/business-rules`.
  - Tratamiento transparente de información faltante (`INSUFFICIENT_DATA`), devolviendo avisos explícitos de evidencia limitada sin inventar datos.
- **Motor de Ranking Determinista y Explicable (`calculateDeterministicPlaceScore`)**:
  - Ponderación matemática de evidencias por confianza, decaimiento suave por antigüedad (media vida ~2 años), consistencia de opiniones y diversidad de fuentes.
- **Módulo de Recomendaciones en Backend (`apps/api/src/modules/recommendations/`)**:
  - `GET /places/:placeId/recommendation-summary`: Consulta del resumen explicable con score, confianza, explicación y aspectos respaldados, con caché Redis.
  - `POST /places/:placeId/recalculate-aspects`: Recálculo y actualización determinista en base de datos `place_scores`.
  - `GET /ai/metrics`: Auditoría FinOps de solicitudes, aspectos extraídos, alucinaciones bloqueadas y costo total ($0.00).
  - 6 pruebas de integración e2e en `phase4.integration.test.ts` (42 pruebas totales de API).
- **Experiencia de Usuario en Web y Móvil (`apps/web` y `apps/mobile`)**:
  - Web: Bloque explicable en modal de detalle de lugar con badge de puntuación, chips de aspectos positivos, advertencias de viajeros y sello de auditoría.
  - Mobile: Tarjeta de recomendación inteligente en modal con aspectos positivos, advertencias y política de costo cero.
- **Pruebas y Verificación Global**:
  - Total global: **97 pruebas automatizadas pasando (100% Green)** y 23/23 tareas exitosas en Turborepo.

---

## [0.4.0] — 2026-11-11 (Fase 3: Integración de Mapas y Fuentes Completada)

### Agregado
- **Servicios Geoespaciales Costo Cero (`$0.00`) en Backend (`apps/api/src/modules/geo/`)**:
  - `GET /geo/autocomplete`: Búsqueda instantánea en PostGIS con `pg_trgm` similarity y prefijos sobre ciudades y lugares de EE. UU., con caché en Redis.
  - `GET /geo/reverse`: Geocodificación inversa con operador espacial `<->` de PostGIS y resolución de dirección formateada (`city`, `state`, `country`).
  - `POST /geo/route`: Cálculo determinista de rutas sin APIs de pago (distancia en metros/millas, duración estimada según modo `driving`/`walking`/`cycling`, pasos paso a paso y geometría GeoJSON `LineString`).
- **Gestión de Fuentes y Conectores Éticos (`apps/api/src/modules/sources/`)**:
  - `GET /sources` y `POST /sources`: Registro y catálogo de fuentes auditadas (`OFFICIAL_OPEN_DATA`, `EDITORIAL_BLOG`, `COMMUNITY_FORUM`, `SOCIAL_MEDIA`, `DIRECT_PARTNER`).
  - `POST /sources/:id/sync`: Pipeline de sincronización que genera evidencias con hash determinista (`content_hash`) para evitar duplicaciones en ingestas recurrentes.
- **Ingesta de Evidencias Auditables (`apps/api/src/modules/evidences/`)**:
  - `GET /places/:placeId/evidences`: Historial transparente de evidencias ordenadas por nivel de confianza y frescura temporal.
  - `POST /evidences`: Ingestión con hashing de contenido FNV-1a / SHA-256 para evitar duplicados y recálculo automático de la reputación en `place_scores` sin alucinaciones de IA.
- **Normalización y Deduplicación Segura (`packages/business-rules` & `apps/api/src/modules/normalization/`)**:
  - `normalizePlaceName`: Algoritmo de normalización de cadenas eliminando caracteres especiales, tildes, minúsculas y sufijos comerciales comunes (`llc`, `inc`, `restaurant`).
  - `calculateTrigramSimilarity`: Implementación TypeScript pura del coeficiente Sørensen-Dice idéntica al comportamiento de `pg_trgm`.
  - `evaluatePlaceDuplicate`: Lógica estricta de 3 niveles (`<25m` & `>=0.90` -> `AUTO_MERGE`; `<250m` & `>=0.65` o `<500m` & `>=0.85` -> `MANUAL_REVIEW`; resto `NO_DUPLICATE`). Garantiza que nunca se fusionen lugares distintos automáticamente.
  - `GET /normalization/duplicates`: Endpoint de detección de candidatos a duplicados con filtros espaciales `ST_DWithin`.
- **Integración en Aplicación Web (`apps/web`)**:
  - Capa dinámica de rutas en MapLibre GL (`activeRoute?.geometryGeoJSON`) con ajuste automático de vista (`fitBounds`) y estilos limpios.
  - Desplegable de autocompletado en tiempo real en la barra de búsqueda conectado a `/geo/autocomplete`.
  - Botón de "Trazar ruta" en el detalle del lugar y panel de información de ruta con distancia en millas y tiempo de llegada.
- **Integración en Aplicación Móvil (`apps/mobile`)**:
  - Autocompletado dinámico en tiempo real bajo la barra de búsqueda.
  - Botón "🚗 Cómo llegar" en modal de detalle de lugar con cálculo de ruta y visor paso a paso de indicaciones.
  - Visualización de fuentes de evidencia con badges e hipervínculos auditables.
- **Pruebas y Verificación Global**:
  - 10 nuevas pruebas de integración en `apps/api/src/phase3.integration.test.ts` (36 pruebas de API en total).
  - 3 pruebas de validación añadidas en `@exploro/validation` (11 en total).
  - 5 pruebas añadidas en `@exploro/business-rules` (16 en total).
  - 1 prueba de rutas añadida en `@exploro/mobile` (7 en total).
  - Total global: **82 pruebas automatizadas pasando (100% Green)**.

---

## [0.3.0] — 2026-11-11 (Fase 2: Sistema de Descubrimiento Completada)

### Agregado
- **Catálogo Real de EE. UU. y Transparencia de Evidencia (Principio #1 y #2)**:
  - Base de datos poblada con 13 lugares verificados en las principales ciudades de EE. UU. (New York, Miami, Los Angeles, Chicago, Austin, San Francisco, Orlando).
  - Columna `is_demo_data` en tablas `places` y `evidences` para etiquetar explícitamente registros de demostración (`DEMO`).
  - Eliminación de fotos ficticias (`image_url = NULL`) y advertencias explícitas de precio no confirmado (`(sin verificar)`).
- **Reglas de Negocio Puras (`@exploro/business-rules` & `@exploro/validation`)**:
  - Evaluación presupuestaria determinista (`evaluateBudgetFit`), ordenamiento de precios y formateo de monedas.
  - Estimación de tiempos de traslado basados en distancia euclidiana/manhattan de referencia.
  - Motor determinista pseudoaleatorio (Mulberry32) para selección de recomendaciones diversas en «Sorpréndeme».
  - Preprocesador seguro de booleanos en query strings (`queryBoolean`).
- **Servicios de Catálogo y Biblioteca en Backend (`apps/api`)**:
  - `CatalogService`: Búsqueda espacial PostGIS (`ST_DWithin`, `ST_Distance`), ordenamiento (`recommended`, `distance`, `name`), modo acotado vs sin límites (`unbounded`), scoring dinámico de recomendaciones (+10 categorías favoritas, -15 sobrepresupuesto).
  - `POST /discover/surprise-me`: Endpoint generador de sorpresas con banderas de ajuste presupuestario (`budgetFit`), ajuste de tiempo (`timeFit`) y tiempos estimados de viaje.
  - `LibraryService` & `LibraryController`: Favoritos idempotentes (`GET`, `POST`, `DELETE /favorites/:placeId`) y colecciones de usuario aisladas con control de unicidad de nombres (`GET`, `POST`, `PATCH`, `DELETE /collections`).
  - 19 pruebas de integración e2e en `phase2.integration.test.ts` (26 pruebas totales de API pasando).
- **Cliente de API Tipado (`@exploro/api-client`)**:
  - Métodos tipados para `surpriseMe`, `listFavorites`, `addFavorite`, `removeFavorite`, `listCollections`, `createCollection`, `getCollection`, `deleteCollection`, `addCollectionItem`, `removeCollectionItem` y `getPlaceBySlug`.
- **Aplicación Web con MapLibre GL (`apps/web`)**:
  - Integración dinámica de MapLibre GL con estilo vector gratuito OpenFreeMap Liberty y marcadores interactivos.
  - Barra de filtros con búsqueda de texto, ciudades US, categorías, ordenamiento, radio en millas y switch de personalización.
  - Modal de detalle de lugar con actividades, horarios y fragmentos de evidencias.
  - Componente «Sorpréndeme» con selección de presupuesto, tiempo disponible y acompañante.
  - Panel lateral de Biblioteca (Favoritos y Colecciones).
  - 4 pruebas unitarias aprobadas y build estático de producción Next.js 14 optimizado.
- **Aplicación Móvil Interactiva (`apps/mobile`)**:
  - Búsqueda en tiempo real por texto, selector horizontal de ciudades US y chips de categorías.
  - Selector de orden (`Recomendados`, `Distancia`, `Nombre`) y toggle de radio acotado vs todo EE. UU.
  - Visualización de tarjetas con badges `DEMO`, distancias en pies/millas y estado de precios.
  - Gestión de favoritos y filtrado por pestaña «Favoritos».
  - Modales interactivos de «Sorpréndeme» y «Detalle de Lugar» con actividades y evidencias.
  - 6 pruebas unitarias de configuración y lógica aprobadas con Vitest.

---

## [0.2.0] — 2026-11-10 (Fase 1: Construcción de los Fundamentos Completada)

### Agregado
- **Monorepositorio (`pnpm` + `Turborepo`)**: Configurados `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, `.env.example` y `scripts/check-env.ps1`.
- **Paquetes Compartidos (`packages/*`)**:
  - `@exploro/config`: Configuraciones estrictas de TypeScript para Node y React/React Native.
  - `@exploro/shared-types`: Contratos, DTOs y tipos de dominio compartidos.
  - `@exploro/validation`: Esquemas Zod compartidos con 6 pruebas unitarias.
  - `@exploro/business-rules`: Motor determinista de ranking basado en evidencias, control de precios/explicaciones sin datos inventados y reglas de modalidad inicial con 4 pruebas unitarias.
  - `@exploro/api-client`: Cliente HTTP tipado compartido con 2 pruebas unitarias.
- **Infraestructura Costo Cero en Docker (`infrastructure/docker/`)**:
  - `exploro-postgres-postgis`: PostgreSQL 16 + PostGIS 3.7.0 + `pg_trgm` con 18 tablas, índices espaciales `GIST` y semillas iniciales para **Estados Unidos (`US`, `USD`)**, 7 ciudades, 6 categorías principales, 7 subcategorías de Turismo y lugares/evidencias verificadas.
  - `exploro-redis`: Redis 7 Alpine para caché y colas.
  - `exploro-minio-s3`: Almacenamiento compatible con S3 local gratuito.
  - `exploro-ai-engine`: Microservicio Python 3.12 + FastAPI corriendo exclusivamente dentro de Docker con 4 pruebas `pytest`.
- **Aplicaciones (`apps/*`)**:
  - `@exploro/api`: Backend NestJS + Swagger (`/api/docs`) con módulos de Salud, Bootstrap, Autenticación (Modo Invitado, Registro, Login, Refresh, Logout, Recuperación, Perfil y Preferencias) y Catálogo Espacial PostGIS, validado con 7 pruebas de integración E2E contra los contenedores reales.
  - `@exploro/web`: Aplicación Next.js con pantalla inicial obligatoria («Estoy de viaje» activo vs «Soy local — próximamente» deshabilitado), selector de ciudades de EE. UU., categorías dinámicas y tarjetas de recomendación basadas en evidencias.
  - `@exploro/mobile`: Aplicación React Native + Expo preparada para Android e iOS (`com.exploro.app`) compartiendo tipos, cliente API y reglas de negocio.
  - `@exploro/admin`: Base del módulo administrativo con validación de auditoría obligatoria.

---

## [0.1.1] — 2026-11-10 (Cierre y Aprobación de Fase 0)

### Actualizado
- Aprobación de mercado inicial (Estados Unidos), política estricta de Costo Cero (`$0.00`), ejecución de Python exclusivamente en Docker y stack geográfico Open Source (MapLibre GL + OpenStreetMap + PostGIS).
