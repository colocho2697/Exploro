import { describe, expect, it } from 'vitest';
import { validateAdminAuditRequest } from './index';

describe('@exploro/admin — Reglas de Auditoría Inmutable', () => {
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
  });

  it('impide alteraciones silenciosas exigiendo motivo de auditoría', () => {
    const res = validateAdminAuditRequest({
      actorUserId: 'admin1',
      actorRole: 'ADMIN',
      entityType: 'EVIDENCE',
      entityId: 'ev1',
      action: 'REJECT',
      reason: 'Corto',
    });
    expect(res.valid).toBe(false);

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
});

