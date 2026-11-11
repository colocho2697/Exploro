# Exploro — Plataforma Inteligente de Descubrimiento Local y Planificación de Viajes

**Versión:** 0.1.0 (Fase 1 — Construcción de los Fundamentos)  
**Mercado Inicial:** Estados Unidos (`US`, `USD`)  
**Política Operativa:** Costo Cero (`$0.00`) — Infraestructura local en Docker (PostgreSQL 16 + PostGIS 3.4, Redis 7 + BullMQ, MinIO S3, Python FastAPI + Ollama) y mapas Open Source (MapLibre GL + OpenStreetMap).

---

## Estructura del Monorepositorio (`pnpm` + `Turborepo`)

```text
Exploro/
├── apps/
│   ├── mobile/                 # React Native + Expo (Android/iOS, TypeScript)
│   ├── web/                    # Next.js App Router para viajeros (TypeScript)
│   ├── api/                    # Backend modular NestJS + Swagger + PostGIS (TypeScript)
│   └── admin/                  # Panel administrativo (TypeScript)
├── services/
│   └── ai-engine/              # Microservicio Python 3.12 + FastAPI (en Docker)
├── packages/
│   ├── config/                 # Configuraciones base compartidas de TypeScript
│   ├── shared-types/           # Modelos, DTOs, enums y contratos de API
│   ├── validation/             # Esquemas Zod reutilizables
│   ├── business-rules/         # Reglas deterministas de negocio y ranking
│   └── api-client/             # Cliente HTTP tipado compartido
├── infrastructure/
│   ├── docker/                 # Docker Compose (PostGIS, Redis, MinIO, AI Engine)
│   ├── database/               # Inicialización espacial PostGIS, migraciones y semillas
│   └── deployment/             # Configuraciones de despliegue
└── scripts/                    # Scripts de verificación y automatización
```

---

## Documentación de Seguimiento

- [`MASTER_PROMPT.md`](./MASTER_PROMPT.md): Instrucciones maestras del proyecto.
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md): Estado actual y progreso por fases.
- [`ROADMAP.md`](./ROADMAP.md): Hoja de ruta detallada.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Diagramas y decisiones arquitectónicas.
- [`DATABASE.md`](./DATABASE.md): Modelo Entidad-Relación y diseño espacial PostGIS.
- [`API.md`](./API.md): Contratos de API REST y microservicio IA.
- [`TESTING.md`](./TESTING.md): Estrategia y resultados de pruebas ejecutadas.
- [`DECISIONS.md`](./DECISIONS.md): Decisiones aprobadas.
- [`PENDING_DECISIONS.md`](./PENDING_DECISIONS.md): Registro de decisiones pendientes.
- [`CHANGELOG.md`](./CHANGELOG.md): Historial de cambios.

