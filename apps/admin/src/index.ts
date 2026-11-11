import {
  AdminFeatureFlagDTO,
  AdminStatsDTO,
  AdminUserDTO,
  AiModelConfigDTO,
  AuditLogDTO,
  ContentReportDTO,
  PlaceDetailDTO,
  ProcessingErrorDTO,
} from '@exploro/shared-types';
import {
  AdminUpdatePlaceInput,
  ModerateContentInput,
  ResolveReportInput,
  UpdateFeatureFlagInput,
  UpdateUserRoleInput,
} from '@exploro/validation';
import {
  assertContentImmutability,
  evaluateModerationTransition,
  validateAdminAuditRequest,
} from '@exploro/business-rules';
import { ExploroApiClient } from '@exploro/api-client';

export {
  validateAdminAuditRequest,
  assertContentImmutability,
  evaluateModerationTransition,
};

export interface SystemOverview {
  stats: AdminStatsDTO;
  featureFlags: AdminFeatureFlagDTO[];
  pendingReports: ContentReportDTO[];
  recentAuditLogs: AuditLogDTO[];
  processingErrors: ProcessingErrorDTO[];
  aiModels: AiModelConfigDTO[];
}

/**
 * Servicio Operativo de Administración y Gobernanza (Fase 7).
 * Encapsula la gestión inmutable de auditoría y operaciones administrativas sobre la API.
 */
export class AdminDashboardService {
  constructor(private readonly client: ExploroApiClient) {}

  /**
   * Carga la vista panorámica del sistema para el panel administrativo.
   */
  public async loadOverview(): Promise<SystemOverview> {
    const [stats, featureFlags, pendingReports, recentAuditLogs, processingErrors, aiModels] =
      await Promise.all([
        this.client.getAdminStats(),
        this.client.listAdminFeatureFlags(),
        this.client.listContentReports({ status: 'PENDING' }),
        this.client.listAuditLogs({ limit: 10 }),
        this.client.listProcessingErrors(),
        this.client.listAiModelsConfig(),
      ]);

    return {
      stats,
      featureFlags,
      pendingReports,
      recentAuditLogs,
      processingErrors,
      aiModels,
    };
  }

  /**
   * Modera una opinión comunitaria cumpliendo la política de inmutabilidad textual.
   */
  public async moderateReview(
    reviewId: string,
    data: ModerateContentInput
  ): Promise<{ success: boolean; id: string; status: string }> {
    return this.client.moderateReview(reviewId, data);
  }

  /**
   * Modera una evidencia externa.
   */
  public async moderateEvidence(
    evidenceId: string,
    data: ModerateContentInput
  ): Promise<{ success: boolean; id: string; status: string }> {
    return this.client.moderateEvidence(evidenceId, data);
  }

  /**
   * Corrige metadatos o coordenadas de un lugar con registro obligatorio en audit_logs.
   */
  public async correctPlace(
    placeId: string,
    data: AdminUpdatePlaceInput
  ): Promise<PlaceDetailDTO> {
    return this.client.adminUpdatePlace(placeId, data);
  }

  /**
   * Resuelve un reporte comunitario de contenido.
   */
  public async resolveReport(
    reportId: string,
    data: ResolveReportInput
  ): Promise<ContentReportDTO> {
    return this.client.resolveContentReport(reportId, data);
  }

  /**
   * Alterna una feature flag del sistema en caliente.
   */
  public async toggleFeatureFlag(
    key: string,
    data: UpdateFeatureFlagInput
  ): Promise<AdminFeatureFlagDTO> {
    return this.client.updateAdminFeatureFlag(key, data);
  }

  /**
   * Modifica el rol o estado activo de un usuario.
   */
  public async updateUserRole(
    userId: string,
    data: UpdateUserRoleInput
  ): Promise<AdminUserDTO> {
    return this.client.updateUserRole(userId, data);
  }

  /**
   * Marca un error de procesamiento como resuelto.
   */
  public async resolveProcessingError(
    errorId: string
  ): Promise<{ success: boolean; id: string }> {
    return this.client.resolveProcessingError(errorId);
  }

  /**
   * Actualiza parámetros de un modelo local de IA ($0.00).
   */
  public async updateAiModel(
    taskType: string,
    data: { modelName: string; maxTokens?: number; temperature?: number; isActive?: boolean }
  ): Promise<AiModelConfigDTO> {
    return this.client.updateAiModelConfig(taskType, data);
  }
}
