# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.6.0  
**Última ejecución:** 2026-11-11 (Fase 6 completada — **133 de 133 pruebas aprobadas**)

---

## 1. Resumen de Suites Ejecutadas en Fase 6

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 19 (+3) | ✅ PASS | Esquemas de creación/edición de viajes (`createTripSchema`, `updateTripSchema`), ítems (`createTripItemSchema`, `updateTripItemSchema`), reordenamiento (`reorderTripItemsSchema`), planificación asistida (`assistedPlanRequestSchema`), alternativas (`getAlternativesQuerySchema`) y reorganización (`applyReorganizationSchema`). |
| `@exploro/business-rules` | Vitest | 27 (+3) | ✅ PASS | Clasificación de alternativas en 3 niveles (`classifyActivityAlternatives`), evaluación de compatibilidad de horarios (`evaluateScheduleCompatibility`) y detección determinista de impacto de reorganización con explicaciones (`detectReorganizationImpact`). |
| `@exploro/api-client` | Vitest | 4 (+1) | ✅ PASS | Métodos tipados para planificador de viajes (`createTrip`, `listTrips`, `getTripById`, `createTripItem`, `generateAssistedPlan`, `getActivityAlternatives`, `previewReorganization`, `applyReorganization`) y soporte de cabeceras internas. |
| `@exploro/api` (Fases 1–6) | Vitest + NestJS + PostGIS + Redis | 59 (+10) | ✅ PASS | 49 de fases anteriores + 10 pruebas de integración de Fase 6 (bloqueo público 403, bypass interno `x-exploro-internal`, días automáticos, cálculo PostGIS de traslados, reordenamiento sin colisión de índice, itinerario asistido en Nueva York, 3 niveles de alternativas, previsualización de reorganización sin mutación silenciosa, aplicación aprobada y detección de rebase de medianoche). |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Componente `TripPlannerPanel`, selección de días, visualización de traslados, modal de 3 niveles y previsualización de reorganización. Build limpio de producción (128 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 10 (+1) | ✅ PASS | Pestaña `🗺️ Viajes`, verificación de bypass interno para testing, visualización de tarjetas de itinerario, modal de alternativas en 3 niveles y ajuste de horarios. |
| `@exploro/admin` | Vitest | 2 | ✅ PASS | RBAC administrativo y auditoría inmutable. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 8 | ✅ PASS | Extracción de aspectos para restaurantes y turismo, detección de precios/actividades y FinOps \$0.00. |
| **TOTAL** | **Turborepo + Docker Compose** | **133** | **✅ 100% PASS** | **Cobertura integral de Fases 1, 2, 3, 4, 5 y 6.** |

---

## 2. Detalle de Pruebas de Integración de Fase 6 (`apps/api/src/phase6.integration.test.ts`)

1. **Feature Flag Guard (Paso 6.1 y 6.7):**
   - Rechaza el acceso a usuarios públicos sin cabecera interna con HTTP 403 Forbidden cuando `trip_planner_enabled = false`.

2. **Bypass Interno para Desarrollo/Testing:**
   - Permite acceso irrestricto cuando se envía `x-exploro-internal: true`.

3. **Creación Manual de Viaje y Generación Automática de Días:**
   - Creación de viaje multi-día generando automáticamente los registros de `trip_days` con fechas ISO correctas.

4. **Cálculo de Distancias y Tiempos de Traslado con PostGIS:**
   - Primer ítem del día tiene distancia y tiempo de traslado 0. Segundo ítem calcula distancia geodésica real mediante PostGIS `ST_Distance(p1.location, p2.location)` (> 1 km y > 10 min de traslado entre Brooklyn y Manhattan).

5. **Reordenación de Actividades en el Día:**
   - `reorderTripItems` permuta actividades actualizando `order_index` sin colisiones de índice único temporal.

6. **Motor de Planificación Asistida Determinista:**
   - `generateAssistedPlan` genera automáticamente bloques para Mañana, Almuerzo y Tarde en Nueva York cronológicamente ordenados.

7. **Clasificación de Alternativas en 3 Niveles:**
   - Clasifica candidatos en Nivel 1 (`VERY_SIMILAR`, < 2.5 km), Nivel 2 (`RELATED_EXPERIENCE`, < 6 km) y Nivel 3 (`REQUIRES_ADJUSTMENTS`).

8. **Previsualización de Reorganización sin Mutación Silenciosa:**
   - `previewReorganization` calcula el impacto del retraso en actividades posteriores con explicaciones textuales y sin modificar la base de datos hasta confirmación del usuario.

9. **Aplicación Aprobada de Reorganización:**
   - Actualización atómica de los horarios de las actividades afectadas tras la confirmación explícita del viajero.

10. **Prevención de Horarios Imposibles y Rebase de Medianoche:**
    - Detecta si un retraso empuja el final del itinerario más allá de las 23:30, marcando `scheduleOverflowsDay = true`.

---

## 3. Comandos de Verificación Automatizada

```powershell
# Ejecución integral de todo el monorepo (build, typecheck, test)
pnpm turbo run build typecheck test

# Ejecución de pruebas de integración de API (59 tests)
pnpm --filter @exploro/api test

# Pruebas del motor de IA en Docker (8 tests)
docker exec exploro-ai-engine pytest
```
pnpm --filter @exploro/api test

# Ejecución de pruebas del microservicio de IA en Docker (8 tests)
docker exec exploro-ai-engine pytest
```
