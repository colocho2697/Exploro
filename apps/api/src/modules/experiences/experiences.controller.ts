import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ActivityLogDTO,
  ApiResponse,
  UserReviewDTO,
  VerifyVisitResponse,
} from '@exploro/shared-types';
import {
  completeActivityReviewSchema,
  startActivitySchema,
  verifyVisitSchema,
} from '@exploro/validation';
import { AuthService } from '../auth/auth.service';
import { ExperiencesService } from './experiences.service';

@ApiTags('Experiences & Community Reviews (Fase 5)')
@Controller()
export class ExperiencesController {
  constructor(
    @Inject(ExperiencesService)
    private readonly experiencesService: ExperiencesService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Post('experiences/start')
  @ApiOperation({
    summary: 'Paso 5.1: Iniciar una actividad en un lugar («Comenzar actividad»)',
  })
  public async startActivity(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown
  ): Promise<ApiResponse<ActivityLogDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = startActivitySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.experiencesService.startActivity(
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Get('experiences/active')
  @ApiOperation({
    summary: 'Obtener la actividad en curso del usuario actual',
  })
  public async getActiveActivity(
    @Headers('authorization') authHeader: string | undefined
  ): Promise<ApiResponse<ActivityLogDTO | null>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const data = await this.experiencesService.getActiveActivity(
      principal.userId
    );
    return { success: true, data };
  }

  @Post('experiences/:id/verify-visit')
  @ApiOperation({
    summary:
      'Paso 5.5: Verificación opcional de visita mediante GPS o código QR',
  })
  public async verifyVisit(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') activityId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<VerifyVisitResponse>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = verifyVisitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.experiencesService.verifyVisit(
      activityId,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Post('experiences/:id/complete')
  @ApiOperation({
    summary:
      'Paso 5.2, 5.3, 5.4, 5.6: Finalizar actividad y enviar reseña adaptada',
  })
  public async completeActivity(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') activityId: string,
    @Body() body: unknown
  ): Promise<ApiResponse<UserReviewDTO>> {
    const principal = this.authService.requirePrincipal(authHeader);
    const parsed = completeActivityReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const data = await this.experiencesService.completeActivityWithReview(
      activityId,
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }

  @Get('places/:placeId/reviews')
  @ApiOperation({
    summary:
      'Paso 5.6: Listar opiniones de la comunidad de Exploro para un lugar',
  })
  public async getPlaceReviews(
    @Param('placeId') placeId: string,
    @Query('limit') limitStr?: string
  ): Promise<ApiResponse<UserReviewDTO[]>> {
    const limit = limitStr ? Math.min(50, Math.max(1, parseInt(limitStr, 10))) : 20;
    const data = await this.experiencesService.getPlaceReviews(placeId, limit);
    return { success: true, data };
  }
}
