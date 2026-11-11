import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AiFinOpsMetrics,
  ApiResponse as ExploroApiResponse,
  PlaceRecommendationSummary,
  RecalculateAspectsResponse,
} from '@exploro/shared-types';
import { RecalculateAspectsInput, recalculateAspectsSchema } from '@exploro/validation';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations & AI')
@Controller()
export class RecommendationsController {
  constructor(
    @Inject(RecommendationsService)
    private readonly recommendationsService: RecommendationsService
  ) {}

  @Get('places/:placeId/recommendation-summary')
  @ApiOperation({
    summary: 'Resumen de recomendación inteligente, score determinista y aspectos respaldados',
    description:
      'Devuelve el score determinista, nivel de confianza, explicación libre de alucinaciones y aspectos positivos/negativos verificados.',
  })
  @ApiParam({ name: 'placeId', description: 'UUID del lugar' })
  @ApiResponse({ status: 200, description: 'Resumen de recomendación verificado' })
  @ApiResponse({ status: 404, description: 'Lugar no encontrado' })
  public async getRecommendationSummary(
    @Param('placeId') placeId: string
  ): Promise<ExploroApiResponse<PlaceRecommendationSummary>> {
    const data = await this.recommendationsService.getPlaceRecommendationSummary(placeId);
    return { success: true, data };
  }

  @Post('places/:placeId/recalculate-aspects')
  @ApiOperation({
    summary: 'Recalcular aspectos y score determinista del lugar',
    description:
      'Ejecuta la extracción de aspectos y recálculo determinista a partir de las evidencias acumuladas.',
  })
  @ApiParam({ name: 'placeId', description: 'UUID del lugar' })
  @ApiResponse({ status: 200, description: 'Aspectos recalculados exitosamente' })
  public async recalculateAspects(
    @Param('placeId') placeId: string,
    @Body() body: RecalculateAspectsInput = { forceRefresh: false }
  ): Promise<ExploroApiResponse<RecalculateAspectsResponse>> {
    const parsed = recalculateAspectsSchema.parse(body);
    const data = await this.recommendationsService.recalculatePlaceAspects(
      placeId,
      parsed.forceRefresh
    );
    return { success: true, data };
  }

  @Get('ai/metrics')
  @ApiOperation({
    summary: 'Métricas de gobernanza FinOps de IA ($0.00)',
    description:
      'Audita el volumen de solicitudes, aspectos extraídos, alucinaciones bloqueadas y costo total de operación ($0.00).',
  })
  @ApiResponse({ status: 200, description: 'Métricas de uso y costos de IA' })
  public async getAiMetrics(): Promise<ExploroApiResponse<AiFinOpsMetrics>> {
    const data = await this.recommendationsService.getAiMetrics();
    return { success: true, data };
  }
}
