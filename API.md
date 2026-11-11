# Contratos de API — Exploro

**Versión:** 1.0.0 (Fase 0 — Especificación Inicial)  
**Estándar:** RESTful JSON + OpenAPI 3.1 (Swagger en `/api/docs`)  
**Prefijo Base:** `/api/v1`

---

## 1. Convenciones Generales

- **Formato de Respuesta Estándar:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "personalizationApplied": true,
      "evidenceCoverage": "HIGH"
    }
  }
  ```
- **Manejo de Datos Faltantes o No Verificados (Principio #1 y #2):**
  - Nunca se devuelven valores inventados o por defecto engañosos.
  - Si un lugar no tiene precio u horario verificado, los campos retornan `null` acompañado de `"priceStatus": "INSUFFICIENT_DATA"` o `"scheduleStatus": "UNVERIFIED"`.
- **Autenticación:**
  - `Authorization: Bearer <accessToken>` para rutas protegidas o personalizadas.
  - Los endpoints de descubrimiento funcionan también sin token (Modo Invitado).

---

## 2. Endpoints por Módulo y Fase

### 2.1 Salud y Configuración Inicial (Fase 1)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Público | Verifica estado de API, PostgreSQL/PostGIS, Redis y AI Engine. |
| `GET` | `/api/v1/config/bootstrap` | Público | Retorna modalidades habilitadas (`traveler: true`, `local: false`), feature flags públicos y versión mínima. |

### 2.2 Autenticación y Perfil (Fase 1)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Público | Registro de usuario con validación Zod y hash Argon2id. |
| `POST` | `/api/v1/auth/login` | Público | Inicio de sesión; emite `accessToken` y `refreshToken`. |
| `POST` | `/api/v1/auth/refresh` | Público | Rotación segura de `refreshToken`. |
| `POST` | `/api/v1/auth/logout` | Autenticado | Revoca la sesión actual. |
| `POST` | `/api/v1/auth/forgot-password` | Público | Solicitud de recuperación de acceso. |
| `GET` | `/api/v1/users/me` | Autenticado | Obtiene perfil y preferencias actuales. |
| `PATCH` | `/api/v1/users/me/preferences` | Autenticado | Actualiza preferencias y el switch `personalizationEnabled`. |

### 2.3 Categorías y Descubrimiento Geográfico (Fase 2)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | Público | Lista categorías activas (`Comida`, `Turismo`, `Entretenimiento`, `Actividades`, `Eventos`, `Compras`) y sus subcategorías. |
| `GET` | `/api/v1/destinations` | Público | Lista países, ciudades y destinos turísticos disponibles. |
| `GET` | `/api/v1/discover/places` | Público / Opc. Auth | Búsqueda espacial PostGIS (`lat`, `lng`, `radiusKm`, `unbounded`, `cityId`, `destinationId`, `categorySlug`, `subcategorySlug`, `priceTier`, `applyPreferences`). |
| `POST` | `/api/v1/discover/surprise-me` | Público / Opc. Auth | Endpoint «Sorpréndeme»: recibe `lat/lng`, `budget`, `availableMinutes`, `companionType`, `preferences` y retorna sugerencias justificadas con evidencias. |
| `GET` | `/api/v1/places/:idOrSlug` | Público | Detalle completo de lugar, establecimiento, actividades, evidencias verificadas, aspectos y explicación IA. |
| `GET` | `/api/v1/places/:id/evidences` | Público | Lista las evidencias y opiniones verificadas que respaldan la recomendación del lugar. |

### 2.4 Favoritos y Colecciones (Fase 2)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/favorites` | Autenticado | Lista lugares guardados por el usuario. |
| `POST` | `/api/v1/favorites/:placeId` | Autenticado | Agrega lugar a favoritos. |
| `DELETE` | `/api/v1/favorites/:placeId` | Autenticado | Elimina lugar de favoritos. |
| `GET` | `/api/v1/collections` | Autenticado | Lista colecciones personalizadas del usuario. |
| `POST` | `/api/v1/collections` | Autenticado | Crea una nueva colección. |
| `POST` | `/api/v1/collections/:id/items` | Autenticado | Agrega un lugar a una colección. |

### 2.5 Servicios Geográficos y Fuentes (Fase 3)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/geo/autocomplete` | Público (Rate Limited) | Autocompletado de ubicaciones usando `sessionToken` y FieldMasks. |
| `POST` | `/api/v1/geo/routes` | Público (Rate Limited) | Calcula distancia y tiempo de desplazamiento entre puntos. |

### 2.6 Experiencias Propias y Opiniones (Fase 5)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/experiences/start` | Autenticado | Acción «Comenzar actividad» (registra usuario, lugar, actividad, timestamp). |
| `POST` | `/api/v1/experiences/:id/complete` | Autenticado | Finaliza actividad y habilita cuestionario adaptativo voluntario. |
| `POST` | `/api/v1/experiences/:id/verify` | Autenticado | Verificación opcional por proximidad GPS voluntaria o código QR. |
| `POST` | `/api/v1/experiences/:id/review` | Autenticado | Envía reseña adaptada (Restaurante vs. Turismo) y encola actualización de ranking. |

### 2.7 Planificador de Viajes — Oculto por Feature Flag (Fase 6)
*Nota: Todos estos endpoints verifican el guard `FeatureFlagGuard('trip_planner_enabled')`.*

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/trips` | Autenticado + Flag | Crea itinerario manual o solicita generación asistida por estilos/presupuesto. |
| `GET` | `/api/v1/trips/:id` | Autenticado + Flag | Obtiene itinerario detallado por día y bloques horarios. |
| `POST` | `/api/v1/trips/:id/items/:itemId/alternatives` | Autenticado + Flag | Solicita alternativas con flexibilidad (`0`, `15`, `30`, `60` min) clasificadas en: 1) Muy similares, 2) Relacionadas, 3) Requieren ajustes. |
| `POST` | `/api/v1/trips/:id/reorganize-preview` | Autenticado + Flag | Simula el impacto de un cambio mostrando qué actividades se afectan y por qué, **sin guardar cambios**. |
| `POST` | `/api/v1/trips/:id/apply-changes` | Autenticado + Flag | Aplica los cambios únicamente tras confirmación explícita del usuario. |

### 2.8 Administración y Auditoría (Fase 7)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET/POST/PATCH` | `/api/v1/admin/places` | `ADMIN` / `MODERATOR` | Gestión de catálogo y resolución de duplicados (`entity_merge_candidates`). |
| `GET/PATCH` | `/api/v1/admin/evidences` | `ADMIN` / `MODERATOR` | Revisión de evidencias con registro obligatorio en `audit_logs`. |
| `GET/PATCH` | `/api/v1/admin/feature-flags` | `ADMIN` | Activación/desactivación de feature flags. |
| `GET` | `/api/v1/admin/ai-metrics` | `ADMIN` | Monitoreo de consumo de tokens, costos por modelo y cola de errores. |
| `GET` | `/api/v1/admin/audit-logs` | `ADMIN` | Historial inmutable de modificaciones administrativas. |

---

## 3. Contratos Internos del Microservicio de IA (`services/ai-engine`)

Protegidos mediante header interno `X-Internal-Service-Key`:

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/internal/v1/evidences/analyze` | Extrae lugar mencionado, aspectos (sabor, atención, precio, seguridad, etc.), sentimiento y citas textuales. |
| `POST` | `/internal/v1/places/deduplicate` | Evalúa similitud semántica y fonética entre candidatos geográficamente cercanos. |
| `POST` | `/internal/v1/places/explain` | Genera explicación respaldada por evidencias y pasa por el validador anti-alucinaciones (`FactCheckerGuard`). |
| `POST` | `/internal/v1/planner/similarity` | Clasifica actividades alternativas en los 3 niveles de compatibilidad semántica antes de la validación del motor de reglas. |

