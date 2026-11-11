# Registro de Cambios (Changelog) — Exploro

Todos los cambios importantes en la arquitectura, código, base de datos y documentación de este proyecto se registrarán en este archivo.

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
