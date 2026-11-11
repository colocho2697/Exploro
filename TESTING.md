# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.4.0  
**Última ejecución:** 2026-11-11 (Fase 4 completada — **97 de 97 pruebas aprobadas**)

---

## 1. Resumen de Suites Ejecutadas en Fase 4

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 13 (+2) | ✅ PASS | Esquemas de aspectos (`extractAspectsBodySchema`), generación de explicaciones (`explainPlaceBodySchema`), recálculo y polaridad. |
| `@exploro/business-rules` | Vitest | 18 (+2) | ✅ PASS | Taxonomías oficiales de comida y turismo, síntesis extractiva de aspectos positivos/negativos, detección de precios/actividades y guardián anti-alucinaciones (`verifyAntiHallucination`). |
| `@exploro/api-client` | Vitest | 2 | ✅ PASS | Métodos tipados para recomendaciones (`getPlaceRecommendationSummary`, `recalculatePlaceAspects`, `getAiMetrics`). |
| `@exploro/api` (Fases 1–4) | Vitest + NestJS + PostGIS + Redis | 42 (+6) | ✅ PASS | 7 base + 19 F2 + 10 F3 + 6 pruebas de integración de Fase 4 (resumen de recomendación explicable, caché sub-50ms en Redis, recálculo de reputación con aspectos, detección estricta de `INSUFFICIENT_DATA`, 404 seguro y métricas FinOps $0.00). |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Panel de recomendación inteligente en detalle de lugar, chips de aspectos positivos y advertencias, compilación de producción limpia (120 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 8 (+1) | ✅ PASS | Procesamiento de resumen de recomendación con aspectos, badges de confianza, verificación anti-alucinaciones y navegación en modal. |
| `@exploro/admin` | Vitest | 2 | ✅ PASS | RBAC administrativo y prohibición de modificaciones silenciosas sin motivo auditable. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 8 (+4) | ✅ PASS | Extracción de aspectos para restaurantes y turismo, detección de precios/actividades, síntesis de explicaciones con FactCheckerGuard y métricas FinOps $0.00. |
| **TOTAL** | **Turborepo + Docker Compose** | **97** | **✅ 100% PASS** | **Cobertura integral de Fases 1, 2, 3 y 4.** |

---

## 2. Detalle de Pruebas de Integración de Fase 4 (`apps/api/src/phase4.integration.test.ts`)

1. **`GET /places/:placeId/recommendation-summary`:**
   - Retorna resumen completo con `overallScore` determinista, nivel de confianza (`HIGH`/`MEDIUM`/`LOW`) y explicación respaldada en evidencias.
   - Extrae aspectos positivos de la taxonomía oficial (*Sabor y calidad*, *Relación calidad-precio*) a partir de fragmentos reales.
   - Costo reportado: \$0.00 (`costUsd: 0.0`).
   - Verificación de consistencia (`factCheckPassed: true`).

2. **Caché en Memoria con Redis:**
   - La segunda consulta del resumen responde desde la memoria de Redis con latencia mínima (< 50ms).

3. **`POST /places/:placeId/recalculate-aspects`:**
   - Extrae aspectos a partir de las evidencias acumuladas, actualiza `place_scores` e invalida la caché de Redis.
   - Si los aspectos en BD estaban desactualizados, se resincronizan con las evidencias reales.

4. **Guardián Anti-Alucinaciones con Datos Insuficientes:**
   - Al consultar un lugar recién creado sin evidencias, devuelve transparentemente `overallScore: 0`, `INSUFFICIENT_DATA` y el aviso *"Evidencia limitada: aún estamos recopilando más experiencias verificadas para este lugar."*
   - No inventa citas, precios ni aspectos no confirmados.

5. **Manejo Seguro de Errores (404):**
   - Lugares inexistentes retornan código HTTP 404 sin exponer trazas internas.

6. **`GET /ai/metrics` (Gobernanza FinOps $0.00):**
   - Retorna contadores auditables de peticiones, aspectos extraídos, alucinaciones bloqueadas y política de costo cero (`ZERO_COST_USD_0`).

---

## 3. Comandos de Verificación Automatizada

```powershell
# Ejecución integral de todo el monorepo (build, typecheck, test)
pnpm turbo run build typecheck test

# Ejecución de pruebas de integración de API (42 tests)
pnpm --filter @exploro/api test

# Ejecución de pruebas del microservicio de IA en Docker (8 tests)
docker exec exploro-ai-engine pytest

# Ejecución de pruebas de la aplicación web
pnpm --filter @exploro/web test

# Ejecución de pruebas de la aplicación móvil (8 tests)
pnpm --filter @exploro/mobile test
```
