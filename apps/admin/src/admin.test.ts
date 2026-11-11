import { describe, expect, it, vi } from 'vitest';
import {
  AdminDashboardService,
  assertContentImmutability,
  evaluateModerationTransition,
  validateAdminAuditRequest,
} from './index';
import { ExploroApiClient } from '@exploro/api-client';

describe('@exploro/admin — Reglas de Gobernanza y Dashboard Service', () => {
  it('rechaza acciones de usuarios sin rol administrativo', () => {
    const res = validateAdminAuditRequest({
      actorUserId: 'u1',
      actorRole: 'TRAVELER',
      entityType: 'EVIDENCE',
      entityId: 'ev1',
      action: 'UPDATE',
      reason: 'Intento no autorizado',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Permisos insuficientes');
  });

  it('impide alteraciones silenciosas exigiendo motivo de auditoría de al menos 10 caracteres', () => {
    const res = validateAdminAuditRequest({
      actorUserId: 'admin1',
      actorRole: 'ADMIN',
      entityType: 'EVIDENCE',
      entityId: 'ev1',
      action: 'REJECT',
      reason: 'Corto',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('al menos 10 caracteres');

    const valid = validateAdminAuditRequest({
      actorUserId: 'admin1',
      actorRole: 'ADMIN',
      entityType: 'EVIDENCE',
      entityId: 'ev1',
      action: 'REJECT',
      reason: 'Evidencia duplicada detectada en revisión manual.',
    });
    expect(valid.valid).toBe(true);
  });

  it('garantiza la inmutabilidad de testimonios impidiendo edición de texto', () => {
    const original = 'Excelente lugar y comida deliciosa.';
    const tampered = 'Lugar pésimo y mala comida.';

    const checkNoChange = assertContentImmutability(original, undefined);
    expect(checkNoChange.allowed).toBe(true);

    const checkSame = assertContentImmutability(original, original);
    expect(checkSame.allowed).toBe(true);

    const checkTamper = assertContentImmutability(original, tampered);
    expect(checkTamper.allowed).toBe(false);
    expect(checkTamper.error).toContain('Violación de inmutabilidad');
  });

  it('evalúa transiciones válidas de moderación', () => {
    const validTransition = evaluateModerationTransition('PUBLISHED', 'FLAGGED');
    expect(validTransition.valid).toBe(true);

    const sameTransition = evaluateModerationTransition('FLAGGED', 'FLAGGED');
    expect(sameTransition.valid).toBe(false);
    expect(sameTransition.reason).toContain('ya se encuentra en estado');

    const invalidTransition = evaluateModerationTransition('PUBLISHED', 'UNKNOWN_STATUS');
    expect(invalidTransition.valid).toBe(false);
  });

  it('AdminDashboardService carga panorama completo invocando cliente API', async () => {
    const mockClient = {
      getAdminStats: vi.fn().mockResolvedValue({
        totalUsers: 10,
        totalPlaces: 25,
        totalEvidences: 50,
        totalUserReviews: 30,
        totalTrips: 5,
        pendingReportsCount: 1,
        unresolvedErrorsCount: 0,
        activeFeatureFlagsCount: 3,
      }),
      listAdminFeatureFlags: vi.fn().mockResolvedValue([
        { key: 'trip_planner_enabled', enabled: false, description: 'Trip planner' },
      ]),
      listContentReports: vi.fn().mockResolvedValue([]),
      listAuditLogs: vi.fn().mockResolvedValue([]),
      listProcessingErrors: vi.fn().mockResolvedValue([]),
      listAiModelsConfig: vi.fn().mockResolvedValue([]),
      moderateReview: vi.fn().mockResolvedValue({ success: true, id: 'rev-1', status: 'FLAGGED' }),
    } as unknown as ExploroApiClient;

    const service = new AdminDashboardService(mockClient);
    const overview = await service.loadOverview();

    expect(overview.stats.totalUsers).toBe(10);
    expect(overview.featureFlags).toHaveLength(1);
    expect(overview.featureFlags[0]?.key).toBe('trip_planner_enabled');

    const modRes = await service.moderateReview('rev-1', {
      status: 'FLAGGED',
      reason: 'Reporte de usuario por contenido inapropiado verificado',
    });
    expect(modRes.success).toBe(true);
    expect(modRes.status).toBe('FLAGGED');
  });
});
