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
import { selectSurpriseSuggestions } from '@exploro/business-rules';
import {
  ApiResponse,
  CategoryDTO,
  CityDTO,
  DestinationDTO,
  PlaceCardDTO,
  PlaceDetailDTO,
  SurpriseMeResponse,
  SurpriseSuggestionDTO,
} from '@exploro/shared-types';
import {
  discoverPlacesQuerySchema,
  surpriseMeRequestSchema,
} from '@exploro/validation';
import { AuthService } from '../auth/auth.service';
import { CatalogService, PersonalizationContext } from './catalog.service';

@ApiTags('Catalog & Spatial Discovery')
@Controller()
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Get('categories')
  @ApiOperation({
    summary:
      'Lista categorías principales activas y sus subcategorías (administrables desde base de datos)',
  })
  public async getCategories(): Promise<ApiResponse<CategoryDTO[]>> {
    return { success: true, data: await this.catalogService.getCategories() };
  }

  @Get('destinations/cities')
  @ApiOperation({ summary: 'Lista ciudades disponibles con coordenadas PostGIS' })
  public async getCities(
    @Query('country') country = 'US'
  ): Promise<ApiResponse<CityDTO[]>> {
    return { success: true, data: await this.catalogService.getCities(country) };
  }

  @Get('destinations')
  @ApiOperation({ summary: 'Lista destinos destacados disponibles' })
  public async getDestinations(
    @Query('citySlug') citySlug?: string
  ): Promise<ApiResponse<DestinationDTO[]>> {
    return {
      success: true,
      data: await this.catalogService.getDestinations(citySlug),
    };
  }

  @Get('discover/places')
  @ApiOperation({
    summary:
      'Búsqueda geográfica PostGIS: radio configurable o sin límite, filtros, orden y personalización opcional (solo con sesión)',
  })
  public async discoverPlaces(
    @Query() rawQuery: Record<string, unknown>,
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<PlaceCardDTO[]>> {
    const parsed = discoverPlacesQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Parámetros de búsqueda inválidos.'
      );
    }

    const personalization = await this.resolvePersonalization(
      authHeader,
      parsed.data.applyPreferences
    );
    const result = await this.catalogService.discoverPlaces(
      parsed.data,
      personalization
    );

    return {
      success: true,
      data: result.places,
      meta: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        total: result.total,
        personalizationApplied: result.personalizationApplied,
        sortApplied: result.sortApplied,
      },
    };
  }

  @Post('discover/surprise-me')
  @ApiOperation({
    summary:
      '«Sorpréndeme»: sugerencias coherentes con ubicación, presupuesto, tiempo, compañía y preferencias',
  })
  public async surpriseMe(
    @Body() body: unknown,
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<SurpriseMeResponse>> {
    const parsed = surpriseMeRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Parámetros de «Sorpréndeme» inválidos.'
      );
    }
    const req = parsed.data;
    const personalization = await this.resolvePersonalization(
      authHeader,
      req.applyPreferences
    );

    const candidates = await this.catalogService.getSurpriseCandidates({
      lat: req.coordinates?.lat,
      lng: req.coordinates?.lng,
      radiusKm: req.radiusKm,
      citySlug: req.citySlug,
    });
    const byId = new Map(candidates.map((c) => [c.card.id, c.card]));

    const selected = selectSurpriseSuggestions(
      candidates.map((c) => ({
        placeId: c.card.id,
        categorySlug: c.card.categorySlug,
        priceTier: c.card.priceTier,
        overallScore: c.overallScore,
        evidenceCount: c.card.recommendationCount,
        distanceMeters: c.card.distanceMeters,
        estimatedDurationMins: c.minDurationMins,
        tags: c.card.tags,
      })),
      {
        budgetTier: req.budgetTier,
        availableMinutes: req.availableMinutes,
        companionType: req.companionType,
        favoriteCategories: personalization?.favoriteCategories,
        seed: req.seed,
        limit: 3,
      }
    );

    const suggestions: SurpriseSuggestionDTO[] = selected.flatMap((s) => {
      const place = byId.get(s.placeId);
      return place
        ? [
            {
              place,
              matchScore: s.matchScore,
              budgetFit: s.budgetFit,
              timeFit: s.timeFit,
              estimatedTravelMinutes: s.estimatedTravelMinutes,
              reasons: s.reasons,
            },
          ]
        : [];
    });

    let notice: string | null = null;
    if (suggestions.length === 0) {
      notice =
        'No encontramos lugares que cumplan tu presupuesto y tiempo. Prueba ampliando el presupuesto, el tiempo o el radio.';
    } else if (
      suggestions.some((s) => s.budgetFit !== 'CONFIRMED' || s.timeFit !== 'CONFIRMED')
    ) {
      notice =
        'Algunas sugerencias tienen precio o duración sin verificar; confírmalos antes de ir.';
    }

    return {
      success: true,
      data: {
        suggestions,
        personalizationApplied: personalization !== undefined,
        notice,
      },
    };
  }

  @Get('places/:slugOrId')
  @ApiOperation({
    summary: 'Detalle de un lugar con establecimiento, actividades, evidencias y score explicable',
  })
  public async getPlaceDetail(
    @Param('slugOrId') slugOrId: string
  ): Promise<ApiResponse<PlaceDetailDTO>> {
    return {
      success: true,
      data: await this.catalogService.getPlaceBySlugOrId(slugOrId),
    };
  }

  /**
   * La personalización solo existe con sesión válida, con la preferencia activada
   * por el usuario y cuando la solicitud no la desactiva explícitamente.
   */
  private async resolvePersonalization(
    authHeader: string | undefined,
    requested: boolean
  ): Promise<PersonalizationContext | undefined> {
    if (!requested) return undefined;
    const profile = await this.authService.getOptionalProfile(authHeader);
    if (!profile || !profile.preferences.personalizationEnabled) return undefined;
    return {
      favoriteCategories: profile.preferences.favoriteCategories,
      budgetTier: profile.preferences.budgetTier,
    };
  }
}
