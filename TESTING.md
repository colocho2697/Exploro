# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.3.0  
**Última ejecución:** 2026-11-11 (Fase 3 completada — **82 de 82 pruebas aprobadas**)

---

## 1. Resumen de Suites Ejecutadas en Fase 3

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 11 (+3) | ✅ PASS | Esquemas de validación geográfica (`geoAutocompleteQuerySchema`, `geoReverseQuerySchema`, `geoRouteSchema`), fuentes (`createSourceSchema`), evidencias (`createEvidenceSchema`) y deduplicación (`detectDuplicatesQuerySchema`). |
| `@exploro/business-rules` | Vitest | 16 (+5) | ✅ PASS | Normalización estricta de nombres (`normalizePlaceName`), similitud trigram (`calculateTrigramSimilarity`), distancia Haversine, clasificación de duplicados en 3 niveles (`evaluatePlaceDuplicate`), hash determinista de contenido (`generateEvidenceContentHash`) y confianza de evidencias (`calculateEvidenceConfidence`). |
| `@exploro/api-client` | Vitest | 2 | ✅ PASS | Cliente HTTP tipado, inyección de Bearer token, manejo de errores `ExploroApiError` y nuevos métodos de mapas, fuentes, evidencias y duplicados. |
| `@exploro/api` (Base + F2 + F3) | Vitest + NestJS + PostGIS + Redis | 36 (+10) | ✅ PASS | 7 pruebas base + 19 pruebas de Fase 2 + 10 pruebas de integración de Fase 3 (Autocompletado PostGIS, Geocodificación inversa, Rutas costo cero, Sincronización de fuentes, Ingestión de evidencias con hashing, Recálculo determinista de reputación y Detección espacial de duplicados). |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Gating de modalidad, formateo de distancias US, trazado de rutas GeoJSON en MapLibre GL y compilación estricta de producción Next.js 14 (118 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 7 (+1) | ✅ PASS | Configuración Android/iOS, deep linking, política `$0.00`, formateo US, favoritos inmutables, modal «Sorpréndeme» y cálculo/formateo de rutas paso a paso con estimaciones de viaje. |
| `@exploro/admin` | Vitest | 2 | ✅ PASS | RBAC administrativo y prohibición de modificaciones silenciosas sin motivo auditable. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 4 | ✅ PASS | Healthcheck costo cero, protección por clave interna, manejo sin alucinaciones cuando no hay evidencias (`INSUFFICIENT_DATA`) y generación de explicación respaldada por evidencias. |
| **TOTAL** | **Turborepo + Docker Compose** | **82** | **✅ 100% PASS** | **Cobertura integral de Fase 1, Fase 2 y Fase 3.** |

---

## 2. Detalle de Pruebas de Integración de Fase 3 (`apps/api/src/phase3.integration.test.ts`)

1. **`GET /geo/autocomplete`:**
   - Retorna sugerencias de ciudades ("New York") y lugares de forma instantánea.
   - Búsqueda trigram tolera pequeñas variaciones y prefijos.
   - Respuestas son cacheadas en Redis para acelerar búsquedas repetidas con costo $0.00.

2. **`GET /geo/reverse`:**
   - Realiza búsqueda espacial de vecino más cercano (`<->`) en PostGIS a partir de latitud/longitud.
   - Retorna el nombre de la ciudad más cercana ("New York, NY, USA") y su distancia.

3. **`POST /geo/route`:**
   - Calcula ruta determinista con distancia en metros, duración estimada en segundos y pasos de giro (`turn-by-turn`).
   - Retorna geometría GeoJSON `LineString` válida para renderizado directo en MapLibre GL sin costos de API externa.

4. **`GET /sources` & `POST /sources`:**
   - Registra fuentes autorizadas con código único (`reddit_nyc_foodies`) y tipo (`COMMUNITY_FORUM`).
   - Rechaza códigos duplicados con código HTTP 400.
   - Lista fuentes registradas con conteo de evidencias asociadas.

5. **`POST /sources/:id/sync`:**
   - Ejecuta pipeline de sincronización de la fuente.
   - Crea evidencias auditables con `content_hash` determinista.
   - Evita duplicados en ejecuciones posteriores de sincronización (`duplicatesSkipped > 0`).

6. **`GET /places/:placeId/evidences` & `POST /evidences`:**
   - Ingesta evidencia externa con URL original, fragmento citado y confianza calculada.
   - Rechaza evidencias duplicadas mediante comprobación de `content_hash`.
   - Dispara el recálculo determinista de la puntuación en `place_scores` sin alucinaciones.

7. **`GET /normalization/duplicates`:**
   - Aplica filtro espacial PostGIS `ST_DWithin` combinado con similitud trigram.
   - Clasifica los candidatos en `AUTO_MERGE`, `MANUAL_REVIEW` o `NO_DUPLICATE` según umbrales estrictos de negocio.
   - Nunca fusiona de forma automática en rangos ambiguos (distancia > 25m o similitud < 0.90).

---

## 3. Comandos de Verificación Automatizada

```powershell
# Ejecución integral de todo el monorepo (build, typecheck, test)
pnpm turbo run build typecheck test

# Ejecución exclusiva de pruebas de integración de API (36 tests)
pnpm --filter @exploro/api test

# Ejecución exclusiva de pruebas de la aplicación web
pnpm --filter @exploro/web test

# Ejecución exclusiva de pruebas de la aplicación móvil (7 tests)
pnpm --filter @exploro/mobile test

# Ejecución de reglas de negocio y validación
pnpm --filter @exploro/business-rules test
pnpm --filter @exploro/validation test
```
