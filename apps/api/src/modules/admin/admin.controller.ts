import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdminFeatureFlagDTO,
  AdminStatsDTO,
  AdminUserDTO,
  AiModelConfigDTO,
  ApiResponse,
  AuditLogDTO,
  ContentReportDTO,
  PlaceDetailDTO,
  ProcessingErrorDTO,
} from '@exploro/shared-types';
import {
  adminUpdatePlaceSchema,
  createReportSchema,
  moderateContentSchema,
  resolveReportSchema,
  updateFeatureFlagSchema,
  updateUserRoleSchema,
} from '@exploro/validation';
import { AuthService } from '../auth/auth.service';
import { AdminGuard, Roles } from './admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin & Governance (Fase 7)')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Métricas agregadas del sistema para administración' })
  public async getStats(): Promise<ApiResponse<AdminStatsDTO>> {
    const data = await this.adminService.getStats();
    return { success: true, data };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Consultar logs de auditoría inmutables' })
  public async listAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<ApiResponse<AuditLogDTO[]>> {
    const data = await this.adminService.listAuditLogs({
      entityType,
      actorUserId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return { success: true, data };
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios registrados' })
  public async listUsers(): Promise<ApiResponse<AdminUserDTO[]>> {
    const data = await this.adminService.listUsers();
    return { success: true, data };
  }

  @Patch('users/:userId/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar rol y estado activo de un usuario' })
  public async updateUserRole(
    @Headers('authorization') authHeader: string | undefined,
    @Param('userId') targetUserId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<AdminUserDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = updateUserRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.updateUserRole(
      principal.userId,
      principal.role,
      targetUserId,
      parsed.data
    );
    return { success: true, data };
  }

  @Patch('places/:placeId')
  @ApiOperation({ summary: 'Corregir o actualizar metadatos y coordenadas de un lugar' })
  public async updatePlace(
    @Headers('authorization') authHeader: string | undefined,
    @Param('placeId') placeId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<PlaceDetailDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = adminUpdatePlaceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.updatePlace(
      principal.userId,
      principal.role,
      placeId,
      parsed.data
    );
    return { success: true, data };
  }

  @Post('moderation/review/:reviewId')
  @ApiOperation({ summary: 'Moderar el estado de una opinión comunitaria' })
  public async moderateReview(
    @Headers('authorization') authHeader: string | undefined,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<{ success: boolean; id: string; status: string }>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = moderateContentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.moderateReview(
      principal.userId,
      principal.role,
      reviewId,
      parsed.data
    );
    return { success: true, data };
  }

  @Post('moderation/evidence/:evidenceId')
  @ApiOperation({ summary: 'Moderar el estado de una evidencia externa' })
  public async moderateEvidence(
    @Headers('authorization') authHeader: string | undefined,
    @Param('evidenceId') evidenceId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<{ success: boolean; id: string; status: string }>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = moderateContentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.moderateEvidence(
      principal.userId,
      principal.role,
      evidenceId,
      parsed.data
    );
    return { success: true, data };
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'Listar feature flags y su estado' })
  public async listFeatureFlags(): Promise<ApiResponse<AdminFeatureFlagDTO[]>> {
    const data = await this.adminService.listFeatureFlags();
    return { success: true, data };
  }

  @Patch('feature-flags/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Alternar o actualizar una feature flag en caliente' })
  public async updateFeatureFlag(
    @Headers('authorization') authHeader: string | undefined,
    @Param('key') key: string,
    @Body() body: unknown
  ): Promise<ApiResponse<AdminFeatureFlagDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = updateFeatureFlagSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.updateFeatureFlag(
      principal.userId,
      principal.role,
      key,
      parsed.data
    );
    return { success: true, data };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Listar reportes comunitarios' })
  public async listReports(
    @Query('status') status?: string
  ): Promise<ApiResponse<ContentReportDTO[]>> {
    const data = await this.adminService.listReports(status);
    return { success: true, data };
  }

  @Patch('reports/:reportId')
  @ApiOperation({ summary: 'Resolver o desestimar reporte comunitario' })
  public async resolveReport(
    @Headers('authorization') authHeader: string | undefined,
    @Param('reportId') reportId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<ContentReportDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = resolveReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.resolveReport(
      principal.userId,
      principal.role,
      reportId,
      parsed.data
    );
    return { success: true, data };
  }

  @Get('errors')
  @ApiOperation({ summary: 'Listar errores de procesamiento de IA e ingesta' })
  public async listProcessingErrors(): Promise<ApiResponse<ProcessingErrorDTO[]>> {
    const data = await this.adminService.listProcessingErrors();
    return { success: true, data };
  }

  @Patch('errors/:errorId/resolve')
  @ApiOperation({ summary: 'Marcar error de procesamiento como resuelto' })
  public async resolveProcessingError(
    @Headers('authorization') authHeader: string | undefined,
    @Param('errorId') errorId: string
  ): Promise<ApiResponse<{ success: boolean; id: string }>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.adminService.resolveProcessingError(
      principal.userId,
      principal.role,
      errorId
    );
    return { success: true, data };
  }

  @Get('ai-models')
  @ApiOperation({ summary: 'Listar configuración de modelos de IA locales' })
  public async listAiModels(): Promise<ApiResponse<AiModelConfigDTO[]>> {
    const data = await this.adminService.listAiModelsConfig();
    return { success: true, data };
  }

  @Patch('ai-models/:modelName')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar configuración de hiperparámetros de modelo de IA' })
  public async updateAiModel(
    @Headers('authorization') authHeader: string | undefined,
    @Param('modelName') modelName: string,
    @Body() body: { parameters?: Record<string, unknown>; isActive?: boolean; description?: string }
  ): Promise<ApiResponse<AiModelConfigDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.adminService.updateAiModelConfig(
      principal.userId,
      principal.role,
      modelName,
      body
    );
    return { success: true, data };
  }
}

@ApiTags('Community Reports (Fase 7)')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear reporte comunitario sobre un contenido incorrecto o inapropiado' })
  public async createReport(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown
  ): Promise<ApiResponse<ContentReportDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.adminService.createReport(
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }
}
