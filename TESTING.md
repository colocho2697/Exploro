# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.5.0  
**Última ejecución:** 2026-11-11 (Fase 5 completada — **115 de 115 pruebas aprobadas**)

---

## 1. Resumen de Suites Ejecutadas en Fase 5

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 16 (+3) | ✅ PASS | Esquemas de inicio de actividad (`startActivitySchema`), verificación de visita (`verifyVisitSchema`), y cuestionarios adaptados (`completeActivityReviewSchema`). |
| `@exploro/business-rules` | Vitest | 24 (+6) | ✅ PASS | Verificación de proximidad GPS esférica Haversine ($\le 100\text{ m}$), validación de tokens QR oficiales, adaptación de preguntas por categoría, cálculo de sentimiento determinista y bonos de ranking nativos ($1.35\times$ verificadas, $1.15\times$ nativas). |
| `@exploro/api-client` | Vitest | 3 (+1) | ✅ PASS | Métodos tipados para experiencias (`startActivity`, `getActiveActivity`, `verifyActivityVisit`, `completeActivityWithReview`, `getPlaceReviews`). |
| `@exploro/api` (Fases 1–5) | Vitest + NestJS + PostGIS + Redis | 49 (+7) | ✅ PASS | 7 base + 19 F2 + 10 F3 + 6 F4 + 7 pruebas de integración de Fase 5 (inicio autenticado, regla inquebrantable de no asumir visita por inicio, rechazo GPS > 100m, aprobación GPS $\le 100\text{ m}$, flujo de restaurante, flujo de turismo con QR e ingesta al ranking). |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Flujo completo de «Comenzar actividad», botón GPS del navegador, modal de preguntas adaptadas y lista de opiniones con badge `[✓ Visita Verificada]`. Build de producción limpio (123 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 9 (+1) | ✅ PASS | Gestión del ciclo de vida de actividad, verificación GPS simulada, formulario adaptado con calificación por estrellas y distinción entre opiniones verificadas y no verificadas. |
| `@exploro/admin` | Vitest | 2 | ✅ PASS | RBAC administrativo y auditoría inmutable. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 8 | ✅ PASS | Extracción de aspectos para restaurantes y turismo, detección de precios/actividades y FinOps \$0.00. |
| **TOTAL** | **Turborepo + Docker Compose** | **115** | **✅ 100% PASS** | **Cobertura integral de Fases 1, 2, 3, 4 y 5.** |

---

## 2. Detalle de Pruebas de Integración de Fase 5 (`apps/api/src/phase5.integration.test.ts`)

1. **Rechazo de Inicio sin Autenticación:**
   - La acción «Comenzar actividad» exige credenciales Bearer válidas, respondiendo 401 si no está autenticado.

2. **Inicio Exitoso de Actividad (Paso 5.1):**
   - Registra usuario, lugar, título de actividad, hora de inicio y estado `STARTED` con `verification_method = 'NONE'` e `is_verified_visit = false`.

3. **Regla Inquebrantable de Verificación (Paso 5.5):**
   - El simple inicio de actividad **nunca** se toma como prueba de visita definitiva.

4. **Rechazo de Verificación GPS fuera de Rango:**
   - Si las coordenadas del usuario se encuentran a más de 100 metros del lugar (> 100m), la verificación se rechaza y se mantiene `is_verified_visit = false`.

5. **Aprobación de Verificación GPS dentro de 100m:**
   - Coordenadas a menos de 100 metros actualizan la actividad a `is_verified_visit = true` y `verification_method = 'GPS_PROXIMITY'`.

6. **Flujo de Restaurante e Integración al Ranking (Paso 5.3 y 5.6):**
   - Envío de formulario corto adaptado (sabor 5/5, atención 5/5, relación calidad-precio excelente, gasto, plato recomendado).
   - Generación de evidencia auditable en `evidences` con `source_code = 'EXPLORO_NATIVE'`.
   - Recálculo determinista del ranking en `place_scores` incrementando `total_native_reviews`.

7. **Flujo de Turismo y Verificación por Código QR (Paso 5.4 y 5.5):**
   - Inicia actividad en Pier 1 Brooklyn Bridge Park.
   - Verifica visita mediante token oficial QR (`EXPLORO-QR-brooklyn-bridge-park-pier-1`).
   - Envía cuestionario corto de turismo (valió la pena, duración, accesibilidad en silla de ruedas, consejo clave).
   - Verifica que la reseña aparece en `GET /places/:placeId/reviews` con badge `[✓ Visita Verificada]` y autor real.

---

## 3. Comandos de Verificación Automatizada

```powershell
# Ejecución integral de todo el monorepo (build, typecheck, test)
pnpm turbo run build typecheck test

# Ejecución de pruebas de integración de API (49 tests)
pnpm --filter @exploro/api test

# Ejecución de pruebas del microservicio de IA en Docker (8 tests)
docker exec exploro-ai-engine pytest
```
