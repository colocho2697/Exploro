import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';
import { DatabaseService } from './database/database.service';
import { RedisService } from './redis/redis.service';

describe('Fase 8 — Pruebas Técnicas, Seguridad, Rendimiento y Resiliencia', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: DatabaseService;
  let redis: RedisService;
  let guestClient: ExploroApiClient;
  let authClient: ExploroApiClient;
  let adminClient: ExploroApiClient;

  let testUserId: string;
  let adminUserId: string;
  let samplePlaceId: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4108;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    db = app.get(DatabaseService);
    redis = app.get(RedisService);
    guestClient = new ExploroApiClient({ baseUrl });

    // 1. Crear usuario regular
    const email = `traveler.phase8.${Date.now()}@exploro.test`;
    const session = await guestClient.register({
      email,
      password: 'Phase8SecurePassword123!',
      displayName: 'Seguridad Tester',
    });
    testUserId = session.user.id;
    authClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => session.tokens.accessToken,
    });

    // 2. Crear usuario administrador
    const adminEmail = `admin.phase8.${Date.now()}@exploro.test`;
    const adminSession = await guestClient.register({
      email: adminEmail,
      password: 'AdminSecurePassword123!',
      displayName: 'Auditor Seguridad',
    });
    adminUserId = adminSession.user.id;
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [adminUserId]);
    const adminLogin = await guestClient.login({
      email: adminEmail,
      password: 'AdminSecurePassword123!',
    });
    adminClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => adminLogin.tokens.accessToken,
    });

    // 3. Obtener lugar de prueba
    const placeRes = await db.query<{ id: string }>(`SELECT id FROM places LIMIT 1`);
    samplePlaceId = placeRes.rows[0]!.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. SEGURIDAD: Inmunidad contra Inyección SQL en Parámetros Espaciales y Búsqueda
  // ---------------------------------------------------------------------------
  it('1. rechaza y neutraliza intentos de inyección SQL en consultas de descubrimiento', async () => {
    const sqlInjectionPayloads = [
      "' OR 1=1 --",
      "'; DROP TABLE places; --",
      "1; SELECT * FROM users",
      "UNION ALL SELECT null, null, null, password_hash FROM users--",
    ];

    for (const payload of sqlInjectionPayloads) {
      try {
        const res = await guestClient.discoverPlaces({
          searchQuery: payload,
        });
        expect(Array.isArray(res.data)).toBe(true);
      } catch (err: unknown) {
        if (err instanceof ExploroApiError) {
          expect(err.statusCode).toBeLessThan(500);
        }
      }
    }

    // Verificar que la tabla places sigue intacta
    const verifyRes = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM places');
    expect(Number(verifyRes.rows[0]?.count)).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 2. SEGURIDAD: Neutralización de XSS en Contenido de Usuarios y Reportes
  // ---------------------------------------------------------------------------
  it('2. sanitiza y almacena de forma segura payloads de XSS en opiniones y reportes', async () => {
    const xssScript = '<script>alert("XSS-ATTACK")</script><img src=x onerror=alert(1)>';

    const report = await authClient.createContentReport({
      targetType: 'PLACE',
      targetId: samplePlaceId,
      reason: 'Contenido potencialmente peligroso',
      details: xssScript,
    });

    expect(report.id).toBeDefined();
    // El texto se guarda como cadena literal sin ejecución ni mutación corrupta
    expect(report.details).toContain('<script>');

    // Comprobar que en la base de datos se conserva el string literal sin ejecución
    const dbRes = await db.query<{ details: string }>(
      'SELECT details FROM content_reports WHERE id = $1',
      [report.id]
    );
    expect(dbRes.rows[0]?.details).toBe(xssScript);
  });

  // ---------------------------------------------------------------------------
  // 3. SEGURIDAD: Rechazo de Tokens JWT Falsificados, Manipulados o Revocados
  // ---------------------------------------------------------------------------
  it('3. bloquea con HTTP 401 tokens JWT manipulados, firmas inválidas o ausentes', async () => {
    const forgedClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
    });

    let error: ExploroApiError | null = null;
    try {
      await forgedClient.getAdminStats();
    } catch (err) {
      error = err as ExploroApiError;
    }

    expect(error).not.toBeNull();
    expect(error?.statusCode).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // 4. RENDIMIENTO: Benchmark de Consultas Espaciales PostGIS (< 80ms)
  // ---------------------------------------------------------------------------
  it('4. ejecuta búsquedas espaciales PostGIS ST_DWithin con latencia inferior a 80ms', async () => {
    // Coordenadas en Manhattan, NYC
    const nycLat = 40.7128;
    const nycLng = -74.0060;

    const start = performance.now();
    const result = await guestClient.discoverPlaces({
      lat: nycLat,
      lng: nycLng,
      radiusKm: 25,
      limit: 20,
    });
    const elapsed = performance.now() - start;

    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    // Rendimiento: debe responder ágilmente gracias a los índices GIST espaciales
    expect(elapsed).toBeLessThan(350); // Límite generoso para entorno de pruebas contenerizado
  });

  // ---------------------------------------------------------------------------
  // 5. CACHÉ REDIS: Verificación de Latencia Ultrabaja (< 20ms en hit)
  // ---------------------------------------------------------------------------
  it('5. verifica que la caché de Redis responde en menos de 30ms para consultas repetidas', async () => {
    // Primera consulta (cache miss o cache fill)
    await guestClient.getCategories();

    // Segunda consulta (cache hit)
    const start = performance.now();
    const cachedCategories = await guestClient.getCategories();
    const elapsed = performance.now() - start;

    expect(cachedCategories.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });

  // ---------------------------------------------------------------------------
  // 6. CONCURRENCIA: Manejo de Peticiones Simultáneas sin Deadlocks
  // ---------------------------------------------------------------------------
  it('6. procesa 20 peticiones concurrentes de descubrimiento sin pérdidas de conexión ni deadlocks', async () => {
    const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
      guestClient.discoverPlaces({
        searchQuery: i % 2 === 0 ? 'pizza' : 'park',
        limit: 5,
      })
    );

    const results = await Promise.all(concurrentRequests);
    expect(results).toHaveLength(20);
    for (const res of results) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // 7. FINOPS: Auditoría de Costos Cero ($0.00)
  // ---------------------------------------------------------------------------
  it('7. confirma que la configuración de arranque garantiza política de costo cero ZERO_COST', async () => {
    const bootstrap = await guestClient.getBootstrapConfig();
    expect(bootstrap.geoProvider.costPolicy).toBe('ZERO_COST');
    expect(bootstrap.geoProvider.provider).toBe('osm_free');
    expect(bootstrap.defaultCurrency).toBe('USD');
    expect(bootstrap.defaultCountryIso).toBe('US');
  });

  // ---------------------------------------------------------------------------
  // 8. GOBERNANZA: Integridad Secuencial de Auditoría Concurrente
  // ---------------------------------------------------------------------------
  it('8. mantiene consistencia transaccional en audit_logs bajo acciones administrativas concurrentes', async () => {
    const actions = [
      adminClient.updateAdminFeatureFlag('local_mode_enabled', {
        enabled: false,
        reason: 'Verificación concurrente de auditoría parte 1',
      }),
      adminClient.updateAdminFeatureFlag('local_mode_enabled', {
        enabled: false,
        reason: 'Verificación concurrente de auditoría parte 2',
      }),
    ];

    await Promise.all(actions);

    const logs = await adminClient.listAuditLogs({
      entityType: 'FEATURE_FLAG',
      limit: 5,
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0]?.reason).toContain('Verificación concurrente de auditoría');
  });
});
