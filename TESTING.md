# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.7.0  
**Última ejecución:** 2026-11-11 (Fase 7 completada — **147 de 147 pruebas en monorepo aprobadas; 155 pruebas totales con Pytest**)

---

## 1. Resumen de Suites Ejecutadas en Fase 7

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 24 (+5) | ✅ PASS | Esquemas Zod para administración: `moderateContentSchema` ($\ge 10$ caracteres de motivo), `updateUserRoleSchema`, `updateFeatureFlagSchema`, `createReportSchema`, `resolveReportSchema` ($\ge 10$ caracteres de notas) y `adminUpdatePlaceSchema`. |
| `@exploro/business-rules` | Vitest | 30 (+3) | ✅ PASS | Regla de auditoría obligatoria (`validateAdminAuditRequest`), inmutabilidad absoluta de testimonios (`assertContentImmutability`) y validación de transiciones de estado de moderación (`evaluateModerationTransition`). |
| `@exploro/api-client` | Vitest | 5 (+1) | ✅ PASS | Métodos administrativos tipados: `getAdminStats`, `listAuditLogs`, `listAdminUsers`, `updateUserRole`, `adminUpdatePlace`, `moderateReview`, `moderateEvidence`, `listAdminFeatureFlags`, `updateAdminFeatureFlag`, `createContentReport`, `listContentReports`, `resolveContentReport`, `listProcessingErrors` y `listAiModelsConfig`. |
| `@exploro/api` (Fases 1–7) | Vitest + NestJS + PostGIS + Redis | 69 (+10) | ✅ PASS | 59 de fases anteriores + 10 pruebas de integración de Fase 7 (rechazo RBAC 403 a usuarios comunes, acceso autorizado a ADMIN, segmentación de permisos de MODERATOR, validación de motivo de auditoría $\ge 10$ caracteres, registro inmutable en `audit_logs`, inmutabilidad del texto del testimonio, corrección de coordenadas PostGIS, hot-reload de feature flags, reportes comunitarios y resolución, y métricas agregadas `/admin/stats`). |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Panel `AdminControlPanel` interactivo (Métricas, Feature Flags, Reportes, Auditoría Inmutable, Modelos de IA, Errores). Compilación limpia de producción (`next build` — 133 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 10 | ✅ PASS | Pestaña `🗺️ Viajes`, verificación de bypass interno para testing, visualización de tarjetas de itinerario, modal de alternativas en 3 niveles y ajuste de horarios. |
| `@exploro/admin` | Vitest | 5 (+3) | ✅ PASS | SDK y Servicio operativo `AdminDashboardService`, validación de auditoría inmutable e inmutabilidad de testimonios. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 8 | ✅ PASS | Extracción de aspectos para restaurantes y turismo, detección de precios/actividades y FinOps \$0.00. |
| **TOTAL** | **Turborepo + Docker Compose** | **155** | **✅ 100% PASS** | **Cobertura integral de Fases 1, 2, 3, 4, 5, 6 y 7.** |

---

## 2. Detalle de Pruebas de Integración de Fase 7 (`apps/api/src/phase7.integration.test.ts`)

1. **Restricción RBAC de Usuarios Comunes (Paso 7.1):**
   - Bloquea con HTTP 403 Forbidden a usuarios con rol `TRAVELER` que intentan acceder a endpoints administrativos `/admin/*`.

2. **Acceso Concedido al Rol Administrador:**
   - Permite acceso irrestricto a `/admin/stats` y listas administrativas a usuarios con rol `ADMIN`.

3. **Segmentación de Permisos del Moderador (MODERATOR):**
   - Autoriza al moderador a moderar opiniones y evidencias comunitarias, pero bloquea con HTTP 403 sus intentos de modificar roles de usuario o alternar feature flags.

4. **Validación Estricta de Motivo de Auditoría:**
   - Rechaza con HTTP 400 Bad Request cualquier acción administrativa cuyo motivo tenga menos de 10 caracteres.

5. **Auditoría Inmutable en `audit_logs`:**
   - Al moderar una opinión o evidencia, registra atómicamente el actor, la entidad, los estados previo y nuevo en formato JSONB, y el motivo justificado.

6. **Inmutabilidad Absoluta de Testimonios y Evidencias:**
   - Garantiza que el comentario textual original emitido por el viajero permanece inviolable en la base de datos tras cualquier acción administrativa; únicamente su estado de moderación cambia.

7. **Corrección Administrativa de Coordenadas de Lugar:**
   - Actualiza coordenadas geográficas en PostGIS mediante `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` registrando el cambio en `audit_logs`.

8. **Feature Flags en Caliente (Hot-Reload):**
   - La alternancia de una feature flag (ej. `trip_planner_enabled`) impacta inmediatamente la visibilidad pública de las rutas protegidas sin requerir reinicios del backend.

9. **Ciclo Completo de Reportes Comunitarios:**
   - Cualquier usuario autenticado puede reportar contenido (`POST /reports`); los administradores pueden listar reportes pendientes y resolverlos o desestimarlos con notas de resolución auditadas.

10. **Métricas Agregadas Verificables (`/admin/stats`):**
    - Retorna totales verídicos calculados directamente desde la base de datos (`totalUsers`, `totalPlaces`, `totalEvidences`, `totalUserReviews`, `totalTrips`, `pendingReportsCount`, `unresolvedErrorsCount`, `activeFeatureFlagsCount`).

---

## 3. Comandos de Verificación Automatizada

```powershell
# 1. Ejecutar pipeline completo de Turborepo (build, typecheck y tests)
pnpm turbo run build typecheck test

# 2. Ejecutar suite de pruebas de integración de Fase 7 en la API
pnpm --filter @exploro/api test src/phase7.integration.test.ts

# 3. Ejecutar pruebas unitarias de gobernanza administrativa
pnpm --filter @exploro/admin test

# 4. Ejecutar pruebas del motor de IA en Python
docker exec exploro-ai-engine pytest
```
