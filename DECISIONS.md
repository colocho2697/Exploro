# Decisiones Aprobadas — Exploro

**Versión:** 1.2.0  
**Fecha:** 2026-11-10

---

## 1. Decisiones Aprobadas por el Propietario del Proyecto

| ID | Categoría | Decisión Aprobada | Estado |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Stack Móvil | **React Native + Expo + TypeScript** utilizando *Expo Development Builds* (Android e iOS). | ✅ Aprobado |
| **DEC-002** | Stack Web | **Next.js + React + TypeScript** compartiendo tipos, validaciones, contratos y reglas de negocio con móvil. | ✅ Aprobado |
| **DEC-003** | Stack Backend | **Node.js + NestJS + TypeScript** con arquitectura modular y documentación OpenAPI/Swagger. | ✅ Aprobado |
| **DEC-004** | Base de Datos | **PostgreSQL 16 + PostGIS 3.7** en Docker como motor principal con índices espaciales `GIST` y migraciones/semillas versionadas. | ✅ Aprobado |
| **DEC-005** | Caché y Colas | **Redis 7 + BullMQ** en Docker para caché, rate limiting y procesamiento asíncrono fuera del ciclo HTTP. | ✅ Aprobado |
| **DEC-006** | Servicio de IA | **Python 3.12 + FastAPI** ejecutándose **exclusivamente dentro de Docker** con modelos abiertos gratuitos y control anti-alucinaciones (`FactCheckerGuard`). | ✅ Aprobado |
| **DEC-007** | Almacenamiento | **MinIO (S3 compatible)** en Docker con costo \$0.00 para fotografías y recursos multimedia. | ✅ Aprobado |
| **DEC-008** | Monorepositorio | **pnpm + Turborepo** organizando `apps/`, `services/`, `packages/` e `infrastructure/`. | ✅ Aprobado |
| **DEC-009** | Reglas de Producto | 1) Pantalla inicial con elección «Estoy de viaje» (activo) y «Soy local (próximamente)» (deshabilitado).<br>2) Planificador de viajes (Fase 6) oculto tras Feature Flag.<br>3) Cero datos inventados por IA.<br>4) El planificador nunca modifica itinerarios sin aprobación explícita. | ✅ Aprobado |
| **DEC-010** | Mercado Inicial | **Estados Unidos (`US`, moneda `USD`)** como primer país objetivo para el catálogo, ciudades semilla y pruebas espaciales. | ✅ Aprobado |
| **DEC-011** | Política Financiera | **Arquitectura 100% Costo Cero (\$0.00):** Prohibido depender de APIs o servicios que generen cobros o requieran facturación obligatoria en el sistema. | ✅ Aprobado |
| **DEC-012** | Estrategia Legal de Fuentes | Aprobadas las **3 vías legales sin costo**: (1) Feeds/APIs públicas gratuitas (Reddit JSON/RSS, Blogs vía RSS/Sitemaps respetando `robots.txt`), (2) Ingesta curada/OEmbed de enlaces públicos desde Admin, y (3) Experiencias propias de usuarios de Exploro. | ✅ Aprobado |
| **DEC-013** | Proveedor Geográfico | **MapLibre GL + OpenStreetMap (OpenFreeMap) + PostGIS + Nominatim/Photon + OSRM** aprobado como proveedor predeterminado de costo \$0.00 en lugar de Google Maps Platform. | ✅ Aprobado |
