# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.2.0  
**Última ejecución:** 2026-11-11 (Fase 2 completada — **61 de 61 pruebas aprobadas**)

---

## 1. Resumen de Suites Ejecutadas en Fase 2

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 8 | ✅ PASS | Validación de entrada, preprocesador de booleanos para query params (`queryBoolean`), esquemas de ordenamiento (`recommended`, `distance`, `name`), petición de «Sorpréndeme», colecciones e items. |
| `@exploro/business-rules` | Vitest | 11 | ✅ PASS | Evaluación presupuestaria estricta (`evaluateBudgetFit`), ordenamiento jerárquico de precios, formato con aviso `(sin verificar)`, estimación de tiempos de viaje, selector pseudoaleatorio Mulberry32 y diversidad por categoría. |
| `@exploro/api-client` | Vitest | 2 | ✅ PASS | Cliente HTTP tipado, inyección de Bearer token, manejo de errores `ExploroApiError` y nuevos métodos de biblioteca/sorpresa. |
| `@exploro/api` (Base Integración) | Vitest + NestJS + PostGIS + Redis | 7 | ✅ PASS | Salud de contenedores, bootstrap US (`USD`), 6 categorías + 7 subcategorías en modo invitado, 7 ciudades US con coordenadas PostGIS, búsqueda espacial real `ST_DWithin` / `ST_Distance` y ciclo completo Auth. |
| `@exploro/api` (Fase 2 Integración) | Vitest + NestJS + PostGIS + Redis | 19 | ✅ PASS | Búsqueda por texto libre, filtros de categoría y ciudad, ordenamiento (`recommended`, `distance`, `name`), modo acotado vs `unbounded`, scoring dinámico por preferencias, endpoint «Sorpréndeme» con flags de ajuste, detalle de lugar con actividades y evidencias, y CRUD completo de favoritos y colecciones con aislamiento por usuario. |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Gating de modalidad inicial, formateo de distancias para EE. UU. (pies bajo 0.1 mi, millas por encima), conversión de millas a km y compilación estricta de producción Next.js 14 (116 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 6 | ✅ PASS | Configuración Android/iOS (`com.exploro.app`), deep linking `exploro://`, política `ZERO_COST`, validación de coordenadas y slugs de ciudades US, formateo en unidades US, validación de payload de «Sorpréndeme» y manipulación inmutable de favoritos. |
| `@exploro/admin` | Vitest | 2 | ✅ PASS | RBAC administrativo y prohibición de modificaciones silenciosas sin motivo auditable. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 4 | ✅ PASS | Healthcheck costo cero, protección por clave interna, manejo sin alucinaciones cuando no hay evidencias (`INSUFFICIENT_DATA`) y generación de explicación respaldada por evidencias. |
| **TOTAL** | **Turborepo + Docker Compose** | **61** | **✅ 100% PASS** | **Cobertura integral de Fase 1 (Fundamentos) y Fase 2 (Descubrimiento).** |

---

## 2. Detalle de Pruebas de Integración de Fase 2 (`apps/api/src/phase2.integration.test.ts`)

1. **Catálogo y Búsqueda Espacial:**
   - Búsqueda por texto libre (`searchQuery="Art"`) encuentra "The Metropolitan Museum of Art" en NYC.
   - Filtro por categoría devuelve únicamente lugares de esa categoría.
   - Ordenamiento por distancia calcula y ordena ascendentemente las distancias desde el punto de consulta.
   - Modo `unbounded=true` devuelve lugares en todo Estados Unidos independientemente del radio de búsqueda.
   - El scoring de recomendación premia categorías favoritas (+10) y penaliza lugares por encima del presupuesto (-15).
   - Lugares del catálogo de demostración incluyen explícitamente `isDemoData: true`.
   - Precios no confirmados devuelven `priceStatus: "UNVERIFIED"`.

2. **Endpoint «Sorpréndeme» (`POST /discover/surprise-me`):**
   - Devuelve sugerencias con `budgetFit` ("CONFIRMED" si está dentro del presupuesto) y `timeFit`.
   - Sugerencias incluyen estimación de tiempo de traslado en minutos (`estimatedTravelMinutes`).
   - El resultado es determinista ante una misma semilla (`seed`) y diverso en categorías.

3. **Detalle de Lugar (`GET /places/:slugOrId`):**
   - Retorna actividades con duración estimada en minutos y costos estimados.
   - Retorna evidencias registradas con fragmento extraído, nombre de fuente y score de confianza.
   - Retorna información de establecimiento (horarios y especialidades).

4. **Biblioteca de Usuario (Favoritos y Colecciones):**
   - `POST /favorites/:placeId` agrega un lugar a favoritos de forma idempotente.
   - `GET /favorites` lista los lugares guardados con sus datos completos.
   - `DELETE /favorites/:placeId` elimina el favorito limpiamente.
   - `POST /collections` crea una colección privada.
   - Creación de colecciones con nombre duplicado es rechazada (código 400).
   - `POST /collections/:id/items` añade un lugar a la colección.
   - Colecciones no pueden ser modificadas ni eliminadas por otros usuarios no autorizados (aislamiento estricto).

---

## 3. Comandos de Verificación Automatizada

```powershell
# Ejecución integral de todo el monorepo (build, typecheck, test)
pnpm turbo run build typecheck test

# Ejecución exclusiva de pruebas de integración de API
pnpm --filter @exploro/api test

# Ejecución exclusiva de pruebas de la aplicación web
pnpm --filter @exploro/web test

# Ejecución exclusiva de pruebas de la aplicación móvil
pnpm --filter @exploro/mobile test
```
