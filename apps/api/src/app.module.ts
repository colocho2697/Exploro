import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Module,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Response } from 'express';
import { DatabaseService } from './database/database.service';
import { RedisService } from './redis/redis.service';
import { HealthController } from './modules/health/health.controller';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { CatalogService } from './modules/catalog/catalog.service';
import { GooglePlacesLiveService } from './modules/catalog/google-places-live.service';
import { FoursquarePlacesLiveService } from './modules/catalog/foursquare-places-live.service';
import { CatalogController } from './modules/catalog/catalog.controller';
import { LibraryService } from './modules/library/library.service';
import { LibraryController } from './modules/library/library.controller';
import { GeoService } from './modules/geo/geo.service';
import { GeoController } from './modules/geo/geo.controller';
import { SourcesService } from './modules/sources/sources.service';
import { SourcesController } from './modules/sources/sources.controller';
import { EvidencesService } from './modules/evidences/evidences.service';
import { EvidencesController } from './modules/evidences/evidences.controller';
import { NormalizationService } from './modules/normalization/normalization.service';
import { NormalizationController } from './modules/normalization/normalization.controller';
import { RecommendationsService } from './modules/recommendations/recommendations.service';
import { RecommendationsController } from './modules/recommendations/recommendations.controller';
import { ExperiencesService } from './modules/experiences/experiences.service';
import { ExperiencesController } from './modules/experiences/experiences.controller';
import { TripsService } from './modules/trips/trips.service';
import { TripsController } from './modules/trips/trips.controller';
import { TripsFeatureFlagGuard } from './modules/trips/trips.guard';
import { AdminService } from './modules/admin/admin.service';
import { AdminController, ReportsController } from './modules/admin/admin.controller';
import { AdminGuard } from './modules/admin/admin.guard';

@Catch()
export class GlobalApiExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resBody = exception.getResponse();
      const message =
        typeof resBody === 'string'
          ? resBody
          : ((resBody as { message?: string | string[] }).message ??
            exception.message);

      response.status(status).json({
        success: false,
        error: {
          code: `HTTP_${status}`,
          message: Array.isArray(message) ? message.join(', ') : message,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ha ocurrido un error interno en el servidor.',
      },
    });
  }
}

@Module({
  controllers: [
    HealthController,
    AuthController,
    CatalogController,
    LibraryController,
    GeoController,
    SourcesController,
    EvidencesController,
    NormalizationController,
    RecommendationsController,
    ExperiencesController,
    TripsController,
    AdminController,
    ReportsController,
  ],
  providers: [
    DatabaseService,
    RedisService,
    AuthService,
    CatalogService,
    GooglePlacesLiveService,
    FoursquarePlacesLiveService,
    LibraryService,
    GeoService,
    SourcesService,
    EvidencesService,
    NormalizationService,
    RecommendationsService,
    ExperiencesService,
    TripsService,
    TripsFeatureFlagGuard,
    AdminService,
    AdminGuard,
    {
      provide: APP_FILTER,
      useClass: GlobalApiExceptionFilter,
    },
  ],
})
export class AppModule {}

