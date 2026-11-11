import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { getInitialModeDescriptors } from '@exploro/business-rules';
import {
  ApiResponse,
  AppBootstrapConfig,
  HealthStatusResponse,
} from '@exploro/shared-types';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Health & Bootstrap')
@Controller()
export class HealthController {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Verifica estado operativo de API, PostgreSQL+PostGIS, Redis y AI Engine',
  })
  public async getHealth(): Promise<ApiResponse<HealthStatusResponse>> {
    const [pgStatus, redisHealthy, aiHealthy] = await Promise.all([
      this.db.checkPostgisHealth(),
      this.redis.checkHealth(),
      this.checkAiEngineHealth(),
    ]);

    const allUp = pgStatus.healthy && redisHealthy && aiHealthy;

    return {
      success: true,
      data: {
        status: allUp ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        services: {
          api: 'up',
          databasePostgis: pgStatus.healthy ? 'up' : 'down',
          redis: redisHealthy ? 'up' : 'down',
          aiEngine: aiHealthy ? 'up' : 'down',
        },
      },
    };
  }

  @Get('config/bootstrap')
  @ApiOperation({
    summary:
      'Retorna configuración inicial, modalidades («Estoy de viaje» vs «Soy local — próximamente») y feature flags',
  })
  public async getBootstrapConfig(): Promise<ApiResponse<AppBootstrapConfig>> {
    const flagsRes = await this.db
      .query<{ key: string; enabled: boolean }>(
        'SELECT key, enabled FROM feature_flags'
      )
      .catch(() => ({ rows: [] as { key: string; enabled: boolean }[] }));

    const flagsMap = new Map(flagsRes.rows.map((r) => [r.key, r.enabled]));
    const localModeEnabled = flagsMap.get('local_mode_enabled') ?? false;
    const tripPlannerEnabled = flagsMap.get('trip_planner_enabled') ?? false;

    return {
      success: true,
      data: {
        appName: 'Exploro',
        version: '0.1.0',
        defaultCountryIso: 'US',
        defaultCurrency: 'USD',
        modes: getInitialModeDescriptors(localModeEnabled),
        featureFlags: {
          localModeEnabled,
          tripPlannerEnabled,
        },
        geoProvider: {
          provider: 'osm_free',
          mapStyleUrl:
            process.env.MAP_TILES_STYLE_URL ??
            'https://tiles.openfreemap.org/styles/liberty',
          costPolicy: 'ZERO_COST',
        },
      },
    };
  }

  private async checkAiEngineHealth(): Promise<boolean> {
    const aiUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${aiUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }
}
