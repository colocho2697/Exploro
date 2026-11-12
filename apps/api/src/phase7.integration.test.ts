import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';
import { DatabaseService } from './database/database.service';

describe('Fase 7 — Módulo de Administración, Control y Auditoría Inmutable', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: DatabaseService;

  let travelerClient: ExploroApiClient;
  let moderatorClient: ExploroApiClient;
  let adminClient: ExploroApiClient;

  let travelerUserId: string;
  let moderatorUserId: string;
  let adminUserId: string;

  let samplePlaceId: string;
  let sampleReviewId: string;
  let sampleEvidenceId: string;
  let originalSamplePlaceLoc: string | null = null;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4107;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    db = app.get(DatabaseService);

    const guestClient = new ExploroApiClient({ baseUrl });

    // 1. Usuario viajero común (rol TRAVELER)
    const travelerEmail = `traveler.phase7.${Date.now()}@exploro.test`;
    const travelerSession = await guestClient.register({
      email: travelerEmail,
      password: 'TravelerPassword123!',
      displayName: 'Viajero Común',
    });
    travelerUserId = travelerSession.user.id;
    travelerClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => travelerSession.tokens.accessToken,
    });

    // 2. Usuario moderador (rol MODERATOR)
    const modEmail = `moderator.phase7.${Date.now()}@exploro.test`;
    const modSession = await guestClient.register({
      email: modEmail,
      password: 'ModeratorPassword123!',
      displayName: 'Moderador Contenido',
    });
    moderatorUserId = modSession.user.id;
    await db.query(`UPDATE users SET role = 'MODERATOR' WHERE id = $1`, [
      moderatorUserId,
    ]);
    // Re-login para refrescar claims en JWT
    const modLogin = await guestClient.login({
      email: modEmail,
      password: 'ModeratorPassword123!',
    });
    moderatorClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => modLogin.tokens.accessToken,
    });

    // 3. Usuario administrador (rol ADMIN)
    const adminEmail = `admin.phase7.${Date.now()}@exploro.test`;
    const adminSession = await guestClient.register({
      email: adminEmail,
      password: 'AdminPassword123!',
      displayName: 'Super Administrador',
    });
    adminUserId = adminSession.user.id;
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [
      adminUserId,
    ]);
    const adminLogin = await guestClient.login({
      email: adminEmail,
      password: 'AdminPassword123!',
    });
    adminClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => adminLogin.tokens.accessToken,
    });

    // 4. Obtener un lugar y una evidencia de prueba (excluyendo lugares con aserciones GPS críticas en otras pruebas)
    const placeRes = await db.query<{ id: string; loc: string }>(
      `SELECT id, ST_AsText(location) as loc FROM places WHERE slug NOT IN ('l-industrie-pizzeria-nyc', 'franklin-barbecue-austin', 'barton-springs-austin') LIMIT 1`
    );
    samplePlaceId = placeRes.rows[0]!.id;
    originalSamplePlaceLoc = placeRes.rows[0]!.loc;

    const evidenceRes = await db.query<{ id: string }>(
      `SELECT id FROM evidences LIMIT 1`
    );
    sampleEvidenceId = evidenceRes.rows[0]!.id;

    // 5. Crear una opinión de prueba del usuario viajero
    const reviewRes = await db.query<{ id: string }>(
      `INSERT INTO user_reviews (
        user_id, place_id, review_type, taste_quality, worth_it, comment, moderation_status
      ) VALUES ($1, $2, 'RESTAURANT', 5, TRUE, 'Excelente comida y servicio impecable.', 'PUBLISHED')
      RETURNING id`,
      [travelerUserId, samplePlaceId]
    );
    sampleReviewId = reviewRes.rows[0]!.id;
  });

  afterAll(async () => {
    if (originalSamplePlaceLoc && samplePlaceId) {
      await db?.query(
        `UPDATE places SET location = ST_GeogFromText($1) WHERE id = $2`,
        [originalSamplePlaceLoc, samplePlaceId]
      );
    }
    await db?.query(
      `UPDATE feature_flags SET enabled = false WHERE key = 'trip_planner_enabled'`
    );
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. RESTRICCIÓN RBAC: Usuario común no tiene acceso administrativo
  // ---------------------------------------------------------------------------
  it('1. bloquea con HTTP 403 el acceso a rutas administrativas a usuarios con rol TRAVELER', async () => {
    let error: ExploroApiError | null = null;
    try {
      await travelerClient.getAdminStats();
    } catch (err) {
      error = err as ExploroApiError;
    }

    expect(error).not.toBeNull();
    expect(error?.statusCode).toBe(403);
    expect(error?.message).toContain('Se requiere rol administrativo');
  });

  // ---------------------------------------------------------------------------
  // 2. ACCESO ADMINISTRATIVO: Admin tiene acceso total
  // ---------------------------------------------------------------------------
  it('2. permite acceso a /admin/stats y listas administrativas al rol ADMIN', async () => {
    const stats = await adminClient.getAdminStats();
    expect(stats.totalUsers).toBeGreaterThan(0);
    expect(stats.totalPlaces).toBeGreaterThan(0);
    expect(stats.totalUserReviews).toBeGreaterThan(0);

    const users = await adminClient.listAdminUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 3. SEGMENTACIÓN RBAC: Moderator puede moderar pero no alterar feature flags ni roles
  // ---------------------------------------------------------------------------
  it('3. moderador puede revisar contenido pero se le bloquea la gestión de roles y feature flags', async () => {
    // 3.a) Moderador puede moderar opinión
    const modResult = await moderatorClient.moderateReview(sampleReviewId, {
      status: 'FLAGGED',
      reason: 'Reporte de revisión preventiva por el moderador',
    });
    expect(modResult.success).toBe(true);
    expect(modResult.status).toBe('FLAGGED');

    // 3.b) Moderador NO puede actualizar feature flags (403 Forbidden)
    let flagError: ExploroApiError | null = null;
    try {
      await moderatorClient.updateAdminFeatureFlag('trip_planner_enabled', {
        enabled: true,
        reason: 'Intento no autorizado de cambiar flag por moderador',
      });
    } catch (err) {
      flagError = err as ExploroApiError;
    }
    expect(flagError).not.toBeNull();
    expect(flagError?.statusCode).toBe(403);

    // 3.c) Moderador NO puede modificar rol de usuario (403 Forbidden)
    let roleError: ExploroApiError | null = null;
    try {
      await moderatorClient.updateUserRole(travelerUserId, {
        role: 'ADMIN',
        reason: 'Intento de escalación de privilegios no autorizada',
      });
    } catch (err) {
      roleError = err as ExploroApiError;
    }
    expect(roleError).not.toBeNull();
    expect(roleError?.statusCode).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // 4. VALIDACIÓN DE MOTIVO DE AUDITORÍA: Minimo 10 caracteres
  // ---------------------------------------------------------------------------
  it('4. rechaza cualquier acción administrativa si el motivo tiene menos de 10 caracteres', async () => {
    let error: ExploroApiError | null = null;
    try {
      await adminClient.moderateReview(sampleReviewId, {
        status: 'REJECTED',
        reason: 'Corto', // Solo 5 caracteres
      });
    } catch (err) {
      error = err as ExploroApiError;
    }

    expect(error).not.toBeNull();
    expect(error?.statusCode).toBe(400);
    expect(error?.message).toContain('al menos 10 caracteres');
  });

  // ---------------------------------------------------------------------------
  // 5. AUDITORÍA INMUTABLE: Registro en audit_logs de cambios
  // ---------------------------------------------------------------------------
  it('5. registra en audit_logs el actor, estados previo y nuevo, y motivo obligatorio', async () => {
    const auditReason = 'Rechazo de opinión por infringir normas de la comunidad';
    await adminClient.moderateReview(sampleReviewId, {
      status: 'REJECTED',
      reason: auditReason,
    });

    const logs = await adminClient.listAuditLogs({
      entityType: 'USER_REVIEW',
    });

    expect(logs.length).toBeGreaterThan(0);
    const latest = logs[0]!;
    expect(latest.entityType).toBe('USER_REVIEW');
    expect(latest.entityId).toBe(sampleReviewId);
    expect(latest.action).toBe('MODERATE_REVIEW');
    expect(latest.reason).toBe(auditReason);
    expect((latest.newState as { moderationStatus: string }).moderationStatus).toBe('REJECTED');
  });

  // ---------------------------------------------------------------------------
  // 6. INMUTABILIDAD DE TESTIMONIOS: El texto del usuario jamás es alterado
  // ---------------------------------------------------------------------------
  it('6. garantiza que el texto original del testimonio permanece intacto e inalterable en base de datos', async () => {
    const reviewRes = await db.query<{ comment: string; moderation_status: string }>(
      `SELECT comment, moderation_status FROM user_reviews WHERE id = $1`,
      [sampleReviewId]
    );
    expect(reviewRes.rows[0]?.comment).toBe('Excelente comida y servicio impecable.');
    expect(reviewRes.rows[0]?.moderation_status).toBe('REJECTED');
  });

  // ---------------------------------------------------------------------------
  // 7. CORRECCIÓN ADMINISTRATIVA DE LUGAR Y POSTGIS GEOMETRY
  // ---------------------------------------------------------------------------
  it('7. actualiza coordenadas y metadatos de lugar escribiendo log de auditoría', async () => {
    const newLat = 40.7128;
    const newLng = -74.0060;
    const placeReason = 'Corrección de georreferenciación GPS por discrepancia con catastro';

    const updated = await adminClient.adminUpdatePlace(samplePlaceId, {
      lat: newLat,
      lng: newLng,
      verificationStatus: 'VERIFIED',
      auditReason: placeReason,
    });

    expect(updated.coordinates.lat).toBeCloseTo(newLat, 4);
    expect(updated.coordinates.lng).toBeCloseTo(newLng, 4);
    expect(updated.verificationStatus).toBe('VERIFIED');

    // Comprobar registro en audit_logs
    const logs = await adminClient.listAuditLogs({
      entityType: 'PLACE',
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.entityId).toBe(samplePlaceId);
    expect(logs[0]?.reason).toBe(placeReason);
  });

  // ---------------------------------------------------------------------------
  // 8. FEATURE FLAGS EN CALIENTE (Hot-Reload)
  // ---------------------------------------------------------------------------
  it('8. actualiza feature flag en caliente y afecta inmediatamente la visibilidad pública de la API', async () => {
    // 1. Deshabilitar bandera trip_planner_enabled
    await adminClient.updateAdminFeatureFlag('trip_planner_enabled', {
      enabled: false,
      reason: 'Deshabilitación preventiva para prueba de hot-reload',
    });

    // 2. Usuario público sin cabecera interna es rechazado con 403
    let errorDisabled: ExploroApiError | null = null;
    try {
      await travelerClient.listTrips();
    } catch (err) {
      errorDisabled = err as ExploroApiError;
    }
    expect(errorDisabled?.statusCode).toBe(403);

    // 3. Administrador habilita la bandera en caliente
    await adminClient.updateAdminFeatureFlag('trip_planner_enabled', {
      enabled: true,
      reason: 'Habilitación en caliente para acceso público autorizado',
    });

    // 4. Usuario público ahora puede consultar la API sin cabecera interna
    const trips = await travelerClient.listTrips();
    expect(Array.isArray(trips)).toBe(true);

    // 5. Restaurar estado de feature flag
    await adminClient.updateAdminFeatureFlag('trip_planner_enabled', {
      enabled: false,
      reason: 'Restauración de estado de bandera a false para aislamiento de pruebas',
    });
  });

  // ---------------------------------------------------------------------------
  // 9. REPORTES COMUNITARIOS: Creación pública y resolución administrativa
  // ---------------------------------------------------------------------------
  it('9. permite a un usuario reportar contenido y a un administrador resolver el reporte con auditoría', async () => {
    // 1. El viajero reporta la evidencia de prueba
    const report = await travelerClient.createContentReport({
      targetType: 'EVIDENCE',
      targetId: sampleEvidenceId,
      reason: 'Información desactualizada o confusa',
      details: 'El horario citado en la evidencia ya no corresponde a la temporada actual.',
    });

    expect(report.id).toBeDefined();
    expect(report.status).toBe('PENDING');

    // 2. Administrador consulta los reportes pendientes
    const reports = await adminClient.listContentReports({ status: 'PENDING' });
    const targetReport = reports.find((r) => r.id === report.id);
    expect(targetReport).toBeDefined();

    // 3. Administrador resuelve el reporte
    const resolved = await adminClient.resolveContentReport(report.id, {
      status: 'RESOLVED',
      resolutionNotes: 'Se verificó y se actualizó la fuente de evidencia correspondiente.',
    });

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedBy).toBe(adminUserId);

    // 4. Verificar auditoría del reporte
    const auditLogs = await adminClient.listAuditLogs({ entityType: 'REPORT' });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0]?.action).toBe('RESOLVE_REPORT');
  });

  // ---------------------------------------------------------------------------
  // 10. MÉTRICAS AGREGADAS (/admin/stats)
  // ---------------------------------------------------------------------------
  it('10. /admin/stats devuelve agregados de base de datos coherentes y verídicos', async () => {
    const stats = await adminClient.getAdminStats();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(3);
    expect(stats.totalPlaces).toBeGreaterThanOrEqual(1);
    expect(stats.totalEvidences).toBeGreaterThanOrEqual(1);
    expect(stats.totalUserReviews).toBeGreaterThanOrEqual(1);
    expect(typeof stats.pendingReportsCount).toBe('number');
    expect(typeof stats.unresolvedErrorsCount).toBe('number');
    expect(typeof stats.activeFeatureFlagsCount).toBe('number');
  });
});
