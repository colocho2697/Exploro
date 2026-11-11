import { UserRole } from '@exploro/shared-types';

export interface AuditActionRequest {
  actorUserId: string;
  actorRole: UserRole;
  entityType: 'PLACE' | 'EVIDENCE' | 'CATEGORY' | 'FEATURE_FLAG';
  entityId: string;
  action: string;
  reason: string;
}

/**
 * Regla de Gobernanza (Fase 7):
 * Ningún administrador puede modificar opiniones o evidencias silenciosamente sin motivo auditable.
 */
export function validateAdminAuditRequest(
  req: AuditActionRequest
): { valid: boolean; error?: string } {
  if (req.actorRole !== 'ADMIN' && req.actorRole !== 'MODERATOR') {
    return {
      valid: false,
      error: 'Permisos insuficientes para realizar acciones administrativas.',
    };
  }
  if (!req.reason || req.reason.trim().length < 10) {
    return {
      valid: false,
      error:
        'Toda modificación administrativa requiere un motivo de auditoría de al menos 10 caracteres.',
    };
  }
  return { valid: true };
}

