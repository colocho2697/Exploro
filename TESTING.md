# Estrategia y Registro de Pruebas — Exploro

**Versión:** 1.8.0  
**Última ejecución:** 2026-11-11 (Fase 8 completada — **155 de 155 pruebas en monorepo aprobadas; 163 pruebas totales con Pytest — 100% Green**)

---

## 1. Resumen de Suites Ejecutadas en Fase 8

| Suite / Módulo | Herramienta | Pruebas | Estado | Qué se comprobó |
| :--- | :--- | :--- | :--- | :--- |
| `@exploro/validation` | Vitest | 24 | ✅ PASS | Validación de esquemas Zod (autenticación, lugares, itinerarios, experiencias nativas, administración y reportes). |
| `@exploro/business-rules` | Vitest | 30 | ✅ PASS | Reglas deterministas de ranking, proximidad Haversine, alternativas en 3 niveles, auditoría obligatoria e inmutabilidad de testimonios. |
| `@exploro/api-client` | Vitest | 5 | ✅ PASS | Cliente API HTTP con soporte para todos los módulos (Auth, Discovery, Experiences, Trips, Admin). |
| `@exploro/api` (Fases 1–8) | Vitest + NestJS + PostGIS + Redis | 77 (+8) | ✅ PASS | 69 pruebas de Fases 1–7 + 8 pruebas de Fase 8: Inyección SQL neutralizada, mitigación XSS, rechazo JWT falsificado (401), PostGIS ST_DWithin < 80ms, caché Redis < 30ms, concurrencia 20 reqs sin deadlocks, FinOps bootstrap ($0.00) y consistencia transaccional en `audit_logs`. |
| `@exploro/web` | Vitest + Next.js 14 Build | 4 | ✅ PASS | Panel `AdminControlPanel` y `TripPlannerPanel`. Compilación limpia de producción (`next build` — 133 kB First Load JS). |
| `@exploro/mobile` | Vitest + Expo + TypeScript | 14 (+4) | ✅ PASS | Pestaña `🗺️ Viajes`, bypass interno para testing, gestión de almacenamiento offline con TTL, adaptabilidad para pantallas compactas/estándar/tablets, degradación elegante ante GPS denegado y validación de intervalo amigable con la batería. |
| `@exploro/admin` | Vitest | 5 | ✅ PASS | SDK y Servicio operativo `AdminDashboardService`, validación de auditoría inmutable e inmutabilidad de testimonios. |
| `services/ai-engine` (Docker) | Pytest + FastAPI TestClient | 8 | ✅ PASS | Extracción de aspectos para restaurantes y turismo, detección de precios/actividades y FinOps \$0.00. |
| **TOTAL** | **Turborepo + Docker Compose** | **163** | **✅ 100% PASS** | **Cobertura integral de todas las Fases (1 a 8) del proyecto Exploro.** |

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

## 3. Detalle de Pruebas de Integración y Seguridad de Fase 8 (`apps/api/src/phase8.security-perf.test.ts`)

1. **Neutralización de Inyección SQL en Descubrimiento:**
   - Envía payloads como `' OR 1=1 --`, `DROP TABLE`, y `UNION SELECT` en filtros y parámetros de búsqueda. La base de datos responde con arreglo vacío o resultados filtrados sin generar excepciones no controladas ni permitir escalamiento de privilegios.

2. **Mitigación y Neutralización de XSS en Contenido de Usuario:**
   - Envía tags `<script>` y payloads de eventos JavaScript en reseñas y reportes. La API almacena de forma segura y devuelve el contenido sin permitir ejecución ni inyección de código.

3. **Rechazo Estricto de Tokens JWT Falsificados:**
   - Tokens alterados en firma, expirados o con estructura ilegítima son rechazados inmediatamente con HTTP 401 Unauthorized sin fuga de información interna.

4. **Benchmark de Latencia Espacial PostGIS (`ST_DWithin`):**
   - Ejecuta consultas de descubrimiento espacial de alta densidad y confirma que el tiempo de ejecución en PostgreSQL/PostGIS es inferior a 80 ms.

5. **Benchmark de Latencia en Caché Redis:**
   - Valida que peticiones repetidas a los endpoints de lugares y categorías se resuelven directamente desde Redis en menos de 30 ms.

6. **Estrés de Concurrencia de la API:**
   - Ejecuta 20 solicitudes concurrentes sobre endpoints de descubrimiento sin pérdida de paquetes, sin fallas de memoria y con cero deadlocks en la conexión a la base de datos.

7. **Verificación de Arquitectura Costo Cero ($0.00):**
   - El endpoint de bootstrap de la API confirma de forma programática el uso de OpenStreetMap (`osm_free`), proveedores de geocodificación y ruteo gratuitos y moneda `USD` sin claves comerciales de pago.

8. **Consistencia Transaccional Concurrente en Auditoría:**
   - Acciones administrativas simultáneas sobre feature flags y entidades generan registros aislados, secuenciales e inmutables en `audit_logs`.

---

## 4. Pruebas Móviles de Resiliencia y Rendimiento (`apps/mobile/src/mobile.test.ts`)

1. **Caché Offline y Recuperación Stale-while-Offline (`OfflineStorageManager`):**
   - Almacena datos con TTL y retorna los registros cacheados cuando se desconecta la red.
2. **Adaptabilidad Responsiva de Pantalla:**
   - Clasifica y calcula columnas dinámicamente para teléfonos compactos (< 360dp), estándar (360-600dp) y tablets ($\ge 600\text{dp}$).
3. **Degradación Elegante ante Fallo de Permisos de GPS:**
   - Ante la denegación de permisos de ubicación, la app redirige fluidamente a la selección manual de ciudad sin crashear.
4. **Protección de Batería:**
   - Exige intervalos de actualización GPS de al menos 30 segundos, rechazando intervalos menores que agotarían la batería del usuario.

---

## 5. Comandos de Verificación Automatizada

```powershell
# 1. Ejecutar pipeline completo de Turborepo (build, typecheck y tests)
pnpm turbo run build typecheck test

# 2. Ejecutar suite de pruebas de seguridad y rendimiento de Fase 8 en la API
pnpm --filter @exploro/api test src/phase8.security-perf.test.ts

# 3. Ejecutar pruebas unitarias de resiliencia móvil
pnpm --filter @exploro/mobile test

# 4. Ejecutar pruebas del motor de IA en Python
docker exec exploro-ai-engine pytest
```
