import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertContentImmutability,
  evaluateModerationTransition,
  validateAdminAuditRequest,
} from '@exploro/business-rules';
import {
  AdminFeatureFlagDTO,
  AdminStatsDTO,
  AdminUserDTO,
  AiModelConfigDTO,
  AuditLogDTO,
  ContentReportDTO,
  PlaceDetailDTO,
  ProcessingErrorDTO,
  UserRole,
} from '@exploro/shared-types';
import {
  AdminUpdatePlaceInput,
  CreateReportInput,
  ModerateContentInput,
  ResolveReportInput,
  UpdateFeatureFlagInput,
  UpdateUserRoleInput,
} from '@exploro/validation';
import { DatabaseService } from '../../database/database.service';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(CatalogService) private readonly catalogService: CatalogService
  ) {}

  /**
   * Registra una entrada en la tabla audit_logs de forma inmutable.
   * Regla de MASTER_PROMPT: Auditoría estricta de toda modificación administrativa.
   */
  public async recordAuditLog(
    actorUserId: string,
    entityType: string,
    entityId: string,
    action: string,
    previousState: unknown,
    newState: unknown,
    reason: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (
        actor_user_id,
        entity_type,
        entity_id,
        action,
        previous_state,
        new_state,
        reason,
        created_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, NOW())`,
      [
        actorUserId,
        entityType,
        entityId,
        action,
        previousState ? JSON.stringify(previousState) : null,
        newState ? JSON.stringify(newState) : null,
        reason,
      ]
    );
  }

  /**
   * Métricas globales del sistema para el panel de administración.
   */
  public async getStats(): Promise<AdminStatsDTO> {
    const [
      usersRes,
      placesRes,
      evidencesRes,
      reviewsRes,
      tripsRes,
      pendingReportsRes,
      unresolvedErrorsRes,
      activeFlagsRes,
    ] = await Promise.all([
      this.db.query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      this.db.query<{ count: string }>('SELECT COUNT(*) as count FROM places'),
      this.db.query<{ count: string }>('SELECT COUNT(*) as count FROM evidences'),
      this.db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM user_reviews'
      ),
      this.db.query<{ count: string }>('SELECT COUNT(*) as count FROM trips'),
      this.db.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM content_reports WHERE status = 'PENDING'"
      ),
      this.db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM processing_errors WHERE is_resolved = FALSE'
      ),
      this.db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM feature_flags WHERE enabled = TRUE'
      ),
    ]);

    return {
      totalUsers: Number(usersRes.rows[0]?.count ?? 0),
      totalPlaces: Number(placesRes.rows[0]?.count ?? 0),
      totalEvidences: Number(evidencesRes.rows[0]?.count ?? 0),
      totalUserReviews: Number(reviewsRes.rows[0]?.count ?? 0),
      totalTrips: Number(tripsRes.rows[0]?.count ?? 0),
      pendingReportsCount: Number(pendingReportsRes.rows[0]?.count ?? 0),
      unresolvedErrorsCount: Number(unresolvedErrorsRes.rows[0]?.count ?? 0),
      activeFeatureFlagsCount: Number(activeFlagsRes.rows[0]?.count ?? 0),
    };
  }

  /**
   * Lista logs de auditoría ordenados cronológicamente descendente.
   */
  public async listAuditLogs(query?: {
    entityType?: string;
    actorUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogDTO[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query?.entityType) {
      params.push(query.entityType);
      conditions.push(`a.entity_type = $${params.length}`);
    }
    if (query?.actorUserId) {
      params.push(query.actorUserId);
      conditions.push(`a.actor_user_id = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const res = await this.db.query<{
      id: string;
      actor_user_id: string | null;
      actor_name: string | null;
      actor_role: UserRole | null;
      entity_type: string;
      entity_id: string;
      action: string;
      previous_state: unknown;
      new_state: unknown;
      reason: string;
      created_at: Date;
    }>(
      `SELECT a.id, a.actor_user_id, u.display_name as actor_name, u.role as actor_role,
              a.entity_type, a.entity_id, a.action, a.previous_state, a.new_state, a.reason, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    return res.rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      actorRole: row.actor_role ?? undefined,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      previousState: row.previous_state,
      newState: row.new_state,
      reason: row.reason,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Lista usuarios para administración.
   */
  public async listUsers(): Promise<AdminUserDTO[]> {
    const res = await this.db.query<{
      id: string;
      email: string;
      display_name: string;
      role: UserRole;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, display_name, role, is_active, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 100`
    );

    return res.rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Modifica el rol y estado activo de un usuario con auditoría obligatoria.
   */
  public async updateUserRole(
    actorId: string,
    actorRole: UserRole,
    targetUserId: string,
    input: UpdateUserRoleInput
  ): Promise<AdminUserDTO> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'USER',
      entityId: targetUserId,
      action: 'UPDATE_USER_ROLE',
      reason: input.reason,
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const currentRes = await this.db.query<{
      id: string;
      email: string;
      display_name: string;
      role: UserRole;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT id, email, display_name, role, is_active, created_at FROM users WHERE id = $1`,
      [targetUserId]
    );
    const current = currentRes.rows[0];
    if (!current) {
      throw new NotFoundException('Usuario objetivo no encontrado.');
    }

    // Normalizar role ('USER' -> 'TRAVELER')
    const normalizedRole: UserRole =
      (input.role as string) === 'USER' ? 'TRAVELER' : (input.role as UserRole);
    const newIsActive = input.isActive ?? current.is_active;

    const previousState = {
      role: current.role,
      isActive: current.is_active,
    };
    const newState = {
      role: normalizedRole,
      isActive: newIsActive,
    };

    await this.db.query(
      `UPDATE users
       SET role = $1, is_active = $2, updated_at = NOW()
       WHERE id = $3`,
      [normalizedRole, newIsActive, targetUserId]
    );

    await this.recordAuditLog(
      actorId,
      'USER',
      targetUserId,
      'UPDATE_USER_ROLE',
      previousState,
      newState,
      input.reason
    );

    return {
      id: current.id,
      email: current.email,
      displayName: current.display_name,
      role: normalizedRole,
      isActive: newIsActive,
      createdAt: current.created_at.toISOString(),
    };
  }

  /**
   * Actualización administrativa de un lugar (coordenadas, datos verificados, estado).
   * Modifica PostGIS geometry cuando se suministran lat y lng.
   */
  public async updatePlace(
    actorId: string,
    actorRole: UserRole,
    placeId: string,
    input: AdminUpdatePlaceInput
  ): Promise<PlaceDetailDTO> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'PLACE',
      entityId: placeId,
      action: 'ADMIN_UPDATE_PLACE',
      reason: input.auditReason,
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const currentRes = await this.db.query<{
      id: string;
      slug: string;
      name: string;
      description: string;
      address_text: string | null;
      lat: number;
      lng: number;
      price_tier: string;
      avg_price_min: number | null;
      avg_price_max: number | null;
      verification_status: string;
      is_active: boolean;
    }>(
      `SELECT id, slug, name, description, address_text,
              ST_Y(location::geometry) as lat,
              ST_X(location::geometry) as lng,
              price_tier, avg_price_min, avg_price_max,
              verification_status, is_active
       FROM places WHERE id = $1`,
      [placeId]
    );
    const current = currentRes.rows[0];
    if (!current) {
      throw new NotFoundException('Lugar no encontrado.');
    }

    const previousState = { ...current };

    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [placeId];

    if (input.name !== undefined) {
      params.push(input.name);
      updates.push(`name = $${params.length}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      updates.push(`description = $${params.length}`);
    }
    if (input.addressText !== undefined) {
      params.push(input.addressText);
      updates.push(`address_text = $${params.length}`);
    }
    if (input.priceTier !== undefined) {
      params.push(input.priceTier);
      updates.push(`price_tier = $${params.length}`);
    }
    if (input.avgPriceMin !== undefined) {
      params.push(input.avgPriceMin);
      updates.push(`avg_price_min = $${params.length}`);
    }
    if (input.avgPriceMax !== undefined) {
      params.push(input.avgPriceMax);
      updates.push(`avg_price_max = $${params.length}`);
    }
    if (input.verificationStatus !== undefined) {
      params.push(input.verificationStatus);
      updates.push(`verification_status = $${params.length}`);
    }
    if (input.isActive !== undefined) {
      params.push(input.isActive);
      updates.push(`is_active = $${params.length}`);
    }
    if (input.lat !== undefined && input.lng !== undefined) {
      params.push(input.lng);
      const lngParam = params.length;
      params.push(input.lat);
      const latParam = params.length;
      updates.push(
        `location = ST_SetSRID(ST_MakePoint($${lngParam}, $${latParam}), 4326)::geography`
      );
    }

    await this.db.query(
      `UPDATE places
       SET ${updates.join(', ')}
       WHERE id = $1`,
      params
    );

    const newState = {
      ...previousState,
      ...input,
    };

    await this.recordAuditLog(
      actorId,
      'PLACE',
      placeId,
      'ADMIN_UPDATE_PLACE',
      previousState,
      newState,
      input.auditReason
    );

    return this.catalogService.getPlaceBySlugOrId(placeId);
  }

  /**
   * Moderación de una opinión comunitaria.
   * Regla de Inmutabilidad: El texto expresado por el usuario es inviolable.
   * Solo se puede alterar el estado de moderación (PUBLISHED, FLAGGED, REJECTED, DISPUTED).
   */
  public async moderateReview(
    actorId: string,
    actorRole: UserRole,
    reviewId: string,
    input: ModerateContentInput
  ): Promise<{ success: boolean; id: string; status: string }> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'USER_REVIEW',
      entityId: reviewId,
      action: 'MODERATE_REVIEW',
      reason: input.reason,
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const reviewRes = await this.db.query<{
      id: string;
      comment: string | null;
      moderation_status: string;
    }>(
      `SELECT id, comment, moderation_status FROM user_reviews WHERE id = $1`,
      [reviewId]
    );
    const review = reviewRes.rows[0];
    if (!review) {
      throw new NotFoundException('Opinión comunitaria no encontrada.');
    }

    // Regla de inmutabilidad
    const immutabilityCheck = assertContentImmutability(
      review.comment ?? '',
      review.comment ?? ''
    );
    if (!immutabilityCheck.allowed) {
      throw new BadRequestException(immutabilityCheck.error);
    }

    // Validación de transición de estado
    const transitionCheck = evaluateModerationTransition(
      review.moderation_status,
      input.status
    );
    if (!transitionCheck.valid) {
      throw new BadRequestException(transitionCheck.reason);
    }

    await this.db.query(
      `UPDATE user_reviews
       SET moderation_status = $1
       WHERE id = $2`,
      [input.status, reviewId]
    );

    await this.recordAuditLog(
      actorId,
      'USER_REVIEW',
      reviewId,
      'MODERATE_REVIEW',
      { moderationStatus: review.moderation_status },
      { moderationStatus: input.status },
      input.reason
    );

    return {
      success: true,
      id: reviewId,
      status: input.status,
    };
  }

  /**
   * Moderación de una evidencia externa.
   */
  public async moderateEvidence(
    actorId: string,
    actorRole: UserRole,
    evidenceId: string,
    input: ModerateContentInput
  ): Promise<{ success: boolean; id: string; status: string }> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'EVIDENCE',
      entityId: evidenceId,
      action: 'MODERATE_EVIDENCE',
      reason: input.reason,
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const evidenceRes = await this.db.query<{
      id: string;
      processing_status: string;
      extracted_snippet: string;
    }>(
      `SELECT id, processing_status, extracted_snippet FROM evidences WHERE id = $1`,
      [evidenceId]
    );
    const evidence = evidenceRes.rows[0];
    if (!evidence) {
      throw new NotFoundException('Evidencia no encontrada.');
    }

    // Mapeo seguro a la restricción check de la tabla evidences
    const dbStatus =
      input.status === 'APPROVED'
        ? 'PROCESSED'
        : input.status === 'FLAGGED'
        ? 'AMBIGUOUS'
        : input.status === 'REJECTED'
        ? 'REJECTED'
        : 'PROCESSED';

    await this.db.query(
      `UPDATE evidences
       SET processing_status = $1
       WHERE id = $2`,
      [dbStatus, evidenceId]
    );

    await this.recordAuditLog(
      actorId,
      'EVIDENCE',
      evidenceId,
      'MODERATE_EVIDENCE',
      { processingStatus: evidence.processing_status },
      { processingStatus: dbStatus, inputStatus: input.status },
      input.reason
    );

    return {
      success: true,
      id: evidenceId,
      status: input.status,
    };
  }

  /**
   * Lista feature flags del sistema.
   */
  public async listFeatureFlags(): Promise<AdminFeatureFlagDTO[]> {
    const res = await this.db.query<{
      key: string;
      enabled: boolean;
      description: string | null;
    }>(
      `SELECT key, enabled, description FROM feature_flags ORDER BY key ASC`
    );

    return res.rows.map((row) => ({
      key: row.key,
      enabled: row.enabled,
      description: row.description,
    }));
  }

  /**
   * Actualiza una feature flag en caliente con registro de auditoría.
   */
  public async updateFeatureFlag(
    actorId: string,
    actorRole: UserRole,
    key: string,
    input: UpdateFeatureFlagInput
  ): Promise<AdminFeatureFlagDTO> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'FEATURE_FLAG',
      entityId: key,
      action: 'UPDATE_FEATURE_FLAG',
      reason: input.reason,
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const currentRes = await this.db.query<{
      key: string;
      enabled: boolean;
      description: string | null;
    }>(
      `SELECT key, enabled, description FROM feature_flags WHERE key = $1`,
      [key]
    );
    const current = currentRes.rows[0];
    if (!current) {
      throw new NotFoundException(`Feature flag '${key}' no encontrada.`);
    }

    const newDescription = input.description ?? current.description;

    await this.db.query(
      `UPDATE feature_flags
       SET enabled = $1, description = $2, updated_at = NOW()
       WHERE key = $3`,
      [input.enabled, newDescription, key]
    );

    await this.recordAuditLog(
      actorId,
      'FEATURE_FLAG',
      key,
      'UPDATE_FEATURE_FLAG',
      { enabled: current.enabled, description: current.description },
      { enabled: input.enabled, description: newDescription },
      input.reason
    );

    return {
      key,
      enabled: input.enabled,
      description: newDescription,
    };
  }

  /**
   * Crea un reporte comunitario de contenido (acceso para cualquier usuario autenticado).
   */
  public async createReport(
    reporterUserId: string,
    input: CreateReportInput
  ): Promise<ContentReportDTO> {
    const res = await this.db.query<{
      id: string;
      reporter_user_id: string;
      target_type: 'PLACE' | 'USER_REVIEW' | 'EVIDENCE' | 'COMMUNITY_NOTE';
      target_id: string;
      reason: string;
      details: string | null;
      status: 'PENDING';
      created_at: Date;
    }>(
      `INSERT INTO content_reports (
        reporter_user_id,
        target_type,
        target_id,
        reason,
        details,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
      RETURNING id, reporter_user_id, target_type, target_id, reason, details, status, created_at`,
      [
        reporterUserId,
        input.targetType,
        input.targetId,
        input.reason,
        input.details ?? null,
      ]
    );

    const report = res.rows[0]!;
    return {
      id: report.id,
      reporterUserId: report.reporter_user_id,
      targetType: report.target_type,
      targetId: report.target_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      resolutionNotes: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: report.created_at.toISOString(),
    };
  }

  /**
   * Lista reportes comunitarios para moderación.
   */
  public async listReports(status?: string): Promise<ContentReportDTO[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await this.db.query<{
      id: string;
      reporter_user_id: string | null;
      reporter_name: string | null;
      target_type: 'PLACE' | 'USER_REVIEW' | 'EVIDENCE' | 'COMMUNITY_NOTE';
      target_id: string;
      reason: string;
      details: string | null;
      status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
      resolution_notes: string | null;
      resolved_by: string | null;
      resolved_at: Date | null;
      created_at: Date;
    }>(
      `SELECT r.id, r.reporter_user_id, u.display_name as reporter_name,
              r.target_type, r.target_id, r.reason, r.details, r.status,
              r.resolution_notes, r.resolved_by, r.resolved_at, r.created_at
       FROM content_reports r
       LEFT JOIN users u ON r.reporter_user_id = u.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      params
    );

    return res.rows.map((row) => ({
      id: row.id,
      reporterUserId: row.reporter_user_id,
      reporterName: row.reporter_name,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Resuelve o desestima un reporte comunitario con notas y auditoría.
   */
  public async resolveReport(
    actorId: string,
    actorRole: UserRole,
    reportId: string,
    input: ResolveReportInput
  ): Promise<ContentReportDTO> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'REPORT',
      entityId: reportId,
      action: 'RESOLVE_REPORT',
      reason: input.resolutionNotes,
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const currentRes = await this.db.query<{
      id: string;
      reporter_user_id: string | null;
      target_type: 'PLACE' | 'USER_REVIEW' | 'EVIDENCE' | 'COMMUNITY_NOTE';
      target_id: string;
      reason: string;
      details: string | null;
      status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
      created_at: Date;
    }>(
      `SELECT id, reporter_user_id, target_type, target_id, reason, details, status, created_at
       FROM content_reports WHERE id = $1`,
      [reportId]
    );
    const current = currentRes.rows[0];
    if (!current) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    const res = await this.db.query<{
      id: string;
      reporter_user_id: string | null;
      target_type: 'PLACE' | 'USER_REVIEW' | 'EVIDENCE' | 'COMMUNITY_NOTE';
      target_id: string;
      reason: string;
      details: string | null;
      status: 'RESOLVED' | 'DISMISSED';
      resolution_notes: string;
      resolved_by: string;
      resolved_at: Date;
      created_at: Date;
    }>(
      `UPDATE content_reports
       SET status = $1,
           resolution_notes = $2,
           resolved_by = $3,
           resolved_at = NOW()
       WHERE id = $4
       RETURNING id, reporter_user_id, target_type, target_id, reason, details, status, resolution_notes, resolved_by, resolved_at, created_at`,
      [input.status, input.resolutionNotes, actorId, reportId]
    );

    const updated = res.rows[0]!;

    await this.recordAuditLog(
      actorId,
      'REPORT',
      reportId,
      'RESOLVE_REPORT',
      { status: current.status },
      { status: input.status, resolutionNotes: input.resolutionNotes },
      input.resolutionNotes
    );

    return {
      id: updated.id,
      reporterUserId: updated.reporter_user_id,
      targetType: updated.target_type,
      targetId: updated.target_id,
      reason: updated.reason,
      details: updated.details,
      status: updated.status,
      resolutionNotes: updated.resolution_notes,
      resolvedBy: updated.resolved_by,
      resolvedAt: updated.resolved_at.toISOString(),
      createdAt: updated.created_at.toISOString(),
    };
  }

  /**
   * Lista errores de procesamiento de IA e ingesta.
   */
  public async listProcessingErrors(): Promise<ProcessingErrorDTO[]> {
    const res = await this.db.query<{
      id: string;
      source_code: string | null;
      place_id: string | null;
      error_type: string;
      error_message: string;
      payload: unknown;
      is_resolved: boolean;
      resolved_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, source_code, place_id, error_type, error_message, payload, is_resolved, resolved_at, created_at
       FROM processing_errors
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.rows.map((row) => ({
      id: row.id,
      sourceCode: row.source_code,
      placeId: row.place_id,
      errorType: row.error_type,
      errorMessage: row.error_message,
      payload: row.payload,
      isResolved: row.is_resolved,
      resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /**
   * Marca un error de procesamiento como resuelto.
   */
  public async resolveProcessingError(
    actorId: string,
    actorRole: UserRole,
    errorId: string
  ): Promise<{ success: boolean; id: string }> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'PROCESSING_ERROR',
      entityId: errorId,
      action: 'RESOLVE_ERROR',
      reason: 'Error marcado como resuelto por el administrador.',
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const res = await this.db.query(
      `UPDATE processing_errors
       SET is_resolved = TRUE, resolved_at = NOW()
       WHERE id = $1`,
      [errorId]
    );

    if ((res.rowCount ?? 0) === 0) {
      throw new NotFoundException('Error de procesamiento no encontrado.');
    }

    await this.recordAuditLog(
      actorId,
      'PROCESSING_ERROR',
      errorId,
      'RESOLVE_PROCESSING_ERROR',
      { isResolved: false },
      { isResolved: true },
      'Error marcado como resuelto'
    );

    return { success: true, id: errorId };
  }

  /**
   * Configuración de modelos locales de IA ($0.00).
   */
  public async listAiModelsConfig(): Promise<AiModelConfigDTO[]> {
    const res = await this.db.query<{
      id: string;
      model_name: string;
      provider: string;
      is_active: boolean;
      parameters: Record<string, unknown>;
      description: string | null;
      updated_at: Date;
    }>(
      `SELECT id, model_name, provider, is_active, parameters, description, updated_at
       FROM ai_models_config
       ORDER BY updated_at DESC`
    );

    return res.rows.map((row) => ({
      id: row.id,
      modelName: row.model_name,
      provider: row.provider,
      isActive: row.is_active,
      parameters: row.parameters ?? {},
      description: row.description,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  public async updateAiModelConfig(
    actorId: string,
    actorRole: UserRole,
    modelName: string,
    data: { parameters?: Record<string, unknown>; isActive?: boolean; description?: string }
  ): Promise<AiModelConfigDTO> {
    const auditValidation = validateAdminAuditRequest({
      actorUserId: actorId,
      actorRole,
      entityType: 'AI_MODEL',
      entityId: modelName,
      action: 'UPDATE_AI_MODEL_CONFIG',
      reason: 'Actualización de configuración de hiperparámetros de modelo de IA local',
    });
    if (!auditValidation.valid) {
      throw new ForbiddenException(auditValidation.error);
    }

    const currentRes = await this.db.query<{
      id: string;
      model_name: string;
      provider: string;
      is_active: boolean;
      parameters: Record<string, unknown>;
      description: string | null;
      updated_at: Date;
    }>(
      `SELECT id, model_name, provider, is_active, parameters, description, updated_at
       FROM ai_models_config WHERE model_name = $1`,
      [modelName]
    );
    const current = currentRes.rows[0];
    if (!current) {
      throw new NotFoundException(`Modelo '${modelName}' no encontrado.`);
    }

    const newActive = data.isActive ?? current.is_active;
    const newParams = data.parameters ?? current.parameters;
    const newDesc = data.description ?? current.description;

    await this.db.query(
      `UPDATE ai_models_config
       SET is_active = $1, parameters = $2::jsonb, description = $3, updated_at = NOW()
       WHERE model_name = $4`,
      [newActive, JSON.stringify(newParams), newDesc, modelName]
    );

    await this.recordAuditLog(
      actorId,
      'AI_MODEL',
      modelName,
      'UPDATE_AI_MODEL_CONFIG',
      current,
      { isActive: newActive, parameters: newParams, description: newDesc },
      'Actualización de configuración de modelo de IA'
    );

    return {
      id: current.id,
      modelName,
      provider: current.provider,
      isActive: newActive,
      parameters: newParams,
      description: newDesc,
      updatedAt: new Date().toISOString(),
    };
  }
}
