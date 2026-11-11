import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { GeoService } from './geo.service';
import {
  ApiResponse,
  AutocompleteSuggestion,
  GeoAddress,
  RouteSummary,
} from '@exploro/shared-types';
import {
  geoAutocompleteQuerySchema,
  geoReverseQuerySchema,
  geoRouteSchema,
} from '@exploro/validation';

@Controller('geo')
export class GeoController {
  constructor(@Inject(GeoService) private readonly geoService: GeoService) {}

  @Get('autocomplete')
  public async autocomplete(
    @Query() query: Record<string, unknown>
  ): Promise<ApiResponse<AutocompleteSuggestion[]>> {
    const parsed = geoAutocompleteQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const suggestions = await this.geoService.autocomplete(parsed.data);
    return {
      success: true,
      data: suggestions,
      meta: {
        total: suggestions.length,
      },
    };
  }

  @Get('reverse')
  public async reverse(
    @Query() query: Record<string, unknown>
  ): Promise<ApiResponse<GeoAddress>> {
    const parsed = geoReverseQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const address = await this.geoService.reverse(
      parsed.data.lat,
      parsed.data.lng
    );
    return {
      success: true,
      data: address,
    };
  }

  @Post('route')
  public async calculateRoute(
    @Body() body: unknown
  ): Promise<ApiResponse<RouteSummary>> {
    const parsed = geoRouteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const route = await this.geoService.calculateRoute(parsed.data);
    return {
      success: true,
      data: route,
    };
  }
}
