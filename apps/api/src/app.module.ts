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
import { CatalogController } from './modules/catalog/catalog.controller';
import { LibraryService } from './modules/library/library.service';
import { LibraryController } from './modules/library/library.controller';

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
  ],
  providers: [
    DatabaseService,
    RedisService,
    AuthService,
    CatalogService,
    LibraryService,
    {
      provide: APP_FILTER,
      useClass: GlobalApiExceptionFilter,
    },
  ],
})
export class AppModule {}

