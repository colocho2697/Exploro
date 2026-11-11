import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  ActivityAlternativeOptionDTO,
  ApiResponse,
  FlexibilityMinutes,
  TripDTO,
  TripItemDTO,
  TripReorganizationImpactDTO,
} from '@exploro/shared-types';
import {
  applyReorganizationSchema,
  assistedPlanRequestSchema,
  createTripItemSchema,
  createTripSchema,
  getAlternativesQuerySchema,
  reorderTripItemsSchema,
  updateTripItemSchema,
  updateTripSchema,
} from '@exploro/validation';
import { AuthService } from '../auth/auth.service';
import { TripsFeatureFlagGuard } from './trips.guard';
import { TripsService } from './trips.service';

@ApiTags('Trip Planner — Fase 6 (Internal / Feature Flag)')
@Controller('trips')
@UseGuards(TripsFeatureFlagGuard)
export class TripsController {
  constructor(
    @Inject(TripsService) private readonly tripsService: TripsService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Paso 6.1: Crear un nuevo viaje (manual)' })
  public async createTrip(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown
  ): Promise<ApiResponse<TripDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = createTripSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.createTrip(principal.userId, parsed.data);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Paso 6.1: Listar viajes del usuario' })
  public async listTrips(
    @Headers('authorization') authHeader: string | undefined
  ): Promise<ApiResponse<TripDTO[]>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.tripsService.listTrips(principal.userId);
    return { success: true, data };
  }

  @Post('assisted-plan')
  @ApiOperation({
    summary: 'Paso 6.2 y 6.3: Generar itinerario asistido determinista',
  })
  public async generateAssistedPlan(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown
  ): Promise<ApiResponse<TripDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = assistedPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.generateAssistedPlan(
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Paso 6.1: Obtener detalle completo de un viaje' })
  public async getTripById(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string
  ): Promise<ApiResponse<TripDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.tripsService.getTripById(id, principal.userId);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Paso 6.1: Actualizar metadatos de un viaje' })
  public async updateTrip(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<ApiResponse<TripDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = updateTripSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.updateTrip(
      id,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Paso 6.1: Eliminar un viaje' })
  public async deleteTrip(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string
  ): Promise<ApiResponse<{ success: boolean; id: string }>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.tripsService.deleteTrip(id, principal.userId);
    return { success: true, data };
  }

  @Post(':tripId/days/:dayId/items')
  @ApiOperation({ summary: 'Paso 6.1: Agregar actividad a un día' })
  public async createTripItem(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<TripItemDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = createTripItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.createTripItem(
      tripId,
      dayId,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Patch(':tripId/items/:itemId')
  @ApiOperation({ summary: 'Paso 6.1: Modificar actividad (horarios o notas)' })
  public async updateTripItem(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<TripItemDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = updateTripItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.updateTripItem(
      tripId,
      itemId,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Delete(':tripId/items/:itemId')
  @ApiOperation({ summary: 'Paso 6.1: Eliminar actividad de un día' })
  public async deleteTripItem(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string
  ): Promise<ApiResponse<{ success: boolean; id: string }>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.tripsService.deleteTripItem(
      tripId,
      itemId,
      principal.userId
    );
    return { success: true, data };
  }

  @Post(':tripId/days/:dayId/reorder')
  @ApiOperation({ summary: 'Paso 6.1: Reordenar actividades de un día' })
  public async reorderTripItems(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<TripItemDTO[]>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = reorderTripItemsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.reorderTripItems(
      tripId,
      dayId,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Get(':tripId/items/:itemId/alternatives')
  @ApiOperation({
    summary: 'Paso 6.4: Obtener alternativas clasificadas en 3 niveles',
  })
  public async getActivityAlternatives(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Query('flexibilityMinutes') flexibilityMinutesRaw?: string
  ): Promise<
    ApiResponse<{
      verySimilar: ActivityAlternativeOptionDTO[];
      relatedExperiences: ActivityAlternativeOptionDTO[];
      requiresAdjustments: ActivityAlternativeOptionDTO[];
    }>
  > {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = getAlternativesQuerySchema.safeParse({
      flexibilityMinutes: flexibilityMinutesRaw
        ? Number(flexibilityMinutesRaw)
        : 15,
    });
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.getActivityAlternatives(
      tripId,
      itemId,
      principal.userId,
      parsed.data.flexibilityMinutes as FlexibilityMinutes
    );
    return { success: true, data };
  }

  @Post(':tripId/items/:itemId/reorganize-preview')
  @ApiOperation({
    summary:
      'Paso 6.6: Previsualizar impacto de reorganización con explicaciones',
  })
  public async previewReorganization(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() body: { newStartTime: string; newDurationMinutes: number }
  ): Promise<ApiResponse<TripReorganizationImpactDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    if (!body?.newStartTime || !body?.newDurationMinutes) {
      throw new BadRequestException(
        'newStartTime y newDurationMinutes son requeridos para la previsualización'
      );
    }
    const data = await this.tripsService.previewReorganization(
      tripId,
      itemId,
      principal.userId,
      body.newStartTime,
      body.newDurationMinutes
    );
    return { success: true, data };
  }

  @Post(':tripId/apply-reorganization')
  @ApiOperation({
    summary:
      'Paso 6.6: Aplicar cambios de horarios tras confirmación del usuario',
  })
  public async applyReorganization(
    @Headers('authorization') authHeader: string | undefined,
    @Param('tripId') tripId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<{ success: boolean; updatedCount: number }>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = applyReorganizationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }
    const data = await this.tripsService.applyReorganization(
      tripId,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }
}
